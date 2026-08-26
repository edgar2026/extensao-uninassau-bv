import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GENERIC_ERROR = "Não foi possível gerar o código.";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function jsonResponse(data: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

function generateCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  const arr = new Uint8Array(10);
  crypto.getRandomValues(arr);
  for (let i = 0; i < 10; i++) {
    code += chars[arr[i] % chars.length];
  }
  return code;
}

function encryptCode(code: string, secret: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const keyBytes = encoder.encode(secret.padEnd(32, "0").slice(0, 32));
  const iv = new Uint8Array(16);
  crypto.getRandomValues(iv);
  let encrypted = "";
  for (let i = 0; i < data.length; i++) {
    encrypted += String.fromCharCode(data[i] ^ keyBytes[i % keyBytes.length] ^ iv[i % iv.length]);
  }
  return btoa(encrypted + "|" + Array.from(iv).map(b => b.toString(16).padStart(2, "0")).join(""));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const encryptionSecret = Deno.env.get("ACCESS_CODE_ENCRYPTION_SECRET") || supabaseServiceKey;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin") {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const body = await req.json();
    const { target_user_id, purpose } = body;

    if (!target_user_id || !purpose) {
      return jsonResponse({ error: GENERIC_ERROR }, 400);
    }

    if (purpose !== "first_access" && purpose !== "password_reset" && purpose !== "admin_restore") {
      return jsonResponse({ error: GENERIC_ERROR }, 400);
    }

    // Revoke ALL previous active codes for this user (any purpose, including blocked)
    await supabase
      .from("access_codes")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", target_user_id)
      .is("used_at", null)
      .is("revoked_at", null);

    const code = generateCode();
    const { data: codeHash } = await supabase.rpc("hash_access_code", { p_code: code });

    if (!codeHash) {
      return jsonResponse({ error: GENERIC_ERROR }, 500);
    }

    const codeEncrypted = encryptCode(code, encryptionSecret);

    const { data: newCode, error: insertError } = await supabase
      .from("access_codes")
      .insert({
        user_id: target_user_id,
        code_hash: codeHash,
        code_encrypted: codeEncrypted,
        purpose,
        created_by: user.id,
      })
      .select("id, created_at")
      .single();

    if (insertError) {
      return jsonResponse({ error: GENERIC_ERROR }, 500);
    }

    // For password_reset: mark pending request as attended, set password_reset_required, revoke sessions
    if (purpose === "password_reset") {
      // Mark pending password_reset_requests as atendida
      await supabase
        .from("password_reset_requests")
        .update({
          status: "atendida",
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        })
        .eq("user_id", target_user_id)
        .eq("status", "pendente");

      // Set password_reset_required = true
      await supabase
        .from("profiles")
        .update({ password_reset_required: true })
        .eq("id", target_user_id);

      // Revoke all previous sessions
      await supabase.auth.admin.signOut(target_user_id);
    }

    // Audit (without code)
    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      action: "generate_access_code",
      entity_type: "access_code",
      entity_id: newCode.id,
      metadata: {
        target_user_id,
        purpose,
      },
    });

    return jsonResponse({
      success: true,
      code,
      code_id: newCode.id,
      created_at: newCode.created_at,
    }, 200);
  } catch {
    return jsonResponse({ error: GENERIC_ERROR }, 500);
  }
});
