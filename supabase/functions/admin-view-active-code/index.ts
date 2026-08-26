import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GENERIC_ERROR = "Não foi possível consultar o código.";

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

function decryptCode(encrypted: string, secret: string): string {
  try {
    const decoded = atob(encrypted);
    const parts = decoded.split("|");
    const ciphertext = parts[0];
    const ivHex = parts[1];
    const encoder = new TextEncoder();
    const keyBytes = encoder.encode(secret.padEnd(32, "0").slice(0, 32));
    const iv = new Uint8Array(ivHex.match(/.{2}/g)!.map(h => parseInt(h, 16)));
    let decrypted = "";
    for (let i = 0; i < ciphertext.length; i++) {
      const c = ciphertext.charCodeAt(i);
      decrypted += String.fromCharCode(c ^ keyBytes[i % keyBytes.length] ^ iv[i % iv.length]);
    }
    return decrypted;
  } catch {
    return "";
  }
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
    const { user_id } = body;

    if (!user_id) {
      return jsonResponse({ error: GENERIC_ERROR }, 400);
    }

    // Find active, unused, unrevoked, unblocked code
    const { data: accessCode, error: codeError } = await supabase
      .from("access_codes")
      .select("id, code_encrypted, purpose, created_at")
      .eq("user_id", user_id)
      .is("used_at", null)
      .is("revoked_at", null)
      .is("blocked_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (codeError || !accessCode) {
      return jsonResponse({ error: "Nenhum código ativo encontrado." }, 404);
    }

    if (!accessCode.code_encrypted) {
      return jsonResponse({ error: "Código não disponível para consulta." }, 404);
    }

    // Decrypt only in Edge Function
    const decryptedCode = decryptCode(accessCode.code_encrypted, encryptionSecret);

    if (!decryptedCode) {
      return jsonResponse({ error: GENERIC_ERROR }, 500);
    }

    // Audit: code was viewed
    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      action: "view_access_code",
      entity_type: "access_code",
      entity_id: accessCode.id,
      metadata: {
        target_user_id: user_id,
        purpose: accessCode.purpose,
      },
    });

    return jsonResponse({
      success: true,
      purpose: accessCode.purpose,
      created_at: accessCode.created_at,
      code: decryptedCode,
    }, 200);
  } catch {
    return jsonResponse({ error: GENERIC_ERROR }, 500);
  }
});
