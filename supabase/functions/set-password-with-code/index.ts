import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GENERIC_ERROR = "Não foi possível validar os dados informados.";
const GENERIC_RATE_LIMIT = "Muitas tentativas. Tente novamente mais tarde.";

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(`ip:${ip}`)) {
      return jsonResponse({ error: GENERIC_RATE_LIMIT }, 429);
    }

    const body = await req.json();
    const { email, code, password, purpose } = body;

    if (!email || !code || !password || !purpose) {
      return jsonResponse({ error: GENERIC_ERROR }, 400);
    }

    if (purpose !== "first_access" && purpose !== "password_reset" && purpose !== "admin_restore") {
      return jsonResponse({ error: GENERIC_ERROR }, 400);
    }

    if (password.length < 8) {
      return jsonResponse({ error: GENERIC_ERROR }, 400);
    }

    if (!checkRateLimit(`email:${email.toLowerCase().trim()}`)) {
      return jsonResponse({ error: GENERIC_RATE_LIMIT }, 429);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, active")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (profileError || !profile) {
      return jsonResponse({ error: GENERIC_ERROR }, 400);
    }

    if (!profile.active) {
      return jsonResponse({ error: GENERIC_ERROR }, 400);
    }

    if (!checkRateLimit(`user:${profile.id}`)) {
      return jsonResponse({ error: GENERIC_RATE_LIMIT }, 429);
    }

    const now = new Date().toISOString();
    const { data: accessCode, error: codeError } = await supabase
      .from("access_codes")
      .select("id, code_hash, purpose, attempts, max_attempts, used_at, revoked_at, blocked_at")
      .eq("user_id", profile.id)
      .eq("purpose", purpose)
      .is("used_at", null)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (codeError || !accessCode) {
      return jsonResponse({ error: GENERIC_ERROR }, 400);
    }

    // Check if code is blocked (excessive attempts)
    if (accessCode.blocked_at) {
      return jsonResponse({ error: GENERIC_RATE_LIMIT }, 429);
    }

    if (accessCode.attempts >= accessCode.max_attempts) {
      // Block the code
      await supabase
        .from("access_codes")
        .update({ blocked_at: now })
        .eq("id", accessCode.id);
      return jsonResponse({ error: GENERIC_RATE_LIMIT }, 429);
    }

    const { data: computedHash, error: hashError } = await supabase.rpc("hash_access_code", { p_code: code.trim() });

    if (hashError || computedHash !== accessCode.code_hash) {
      const newAttempts = accessCode.attempts + 1;
      const updates = {
        attempts: newAttempts,
        last_attempt_at: now,
        ...(newAttempts >= accessCode.max_attempts ? { blocked_at: now } : {}),
      };
      await supabase
        .from("access_codes")
        .update(updates)
        .eq("id", accessCode.id);
      return jsonResponse({ error: GENERIC_ERROR }, 400);
    }

    // Change real password in Supabase Auth
    const { error: updatePasswordError } = await supabase.auth.admin.updateUserById(
      profile.id,
      { password }
    );

    if (updatePasswordError) {
      return jsonResponse({ error: GENERIC_ERROR }, 500);
    }

    // Invalidate code immediately
    await supabase
      .from("access_codes")
      .update({ used_at: now })
      .eq("id", accessCode.id);

    // Update profile
    const profileUpdates: Record<string, unknown> = {
      credentials_updated_at: now,
    };

    if (purpose === "first_access") {
      profileUpdates.first_access_completed = true;
    }

    if (purpose === "password_reset" || purpose === "admin_restore") {
      profileUpdates.password_reset_required = false;
    }

    await supabase
      .from("profiles")
      .update(profileUpdates)
      .eq("id", profile.id);

    // Revoke all previous sessions
    await supabase.auth.admin.signOut(profile.id);

    // Mark pending password_reset_requests as atendida
    if (purpose === "password_reset" || purpose === "admin_restore") {
      await supabase
        .from("password_reset_requests")
        .update({
          status: "atendida",
          resolved_at: now,
        })
        .eq("user_id", profile.id)
        .eq("status", "pendente");
    }

    // Audit (never log the code or password)
    await supabase.from("audit_logs").insert({
      actor_id: null,
      action: "set_password_with_code",
      entity_type: "profile",
      entity_id: profile.id,
      metadata: {
        purpose,
      },
    });

    return jsonResponse({
      success: true,
      message: purpose === "first_access"
        ? "Senha criada com sucesso. Faça login para acessar."
        : "Senha redefinida com sucesso. Faça login para acessar.",
    }, 200);
  } catch {
    return jsonResponse({ error: GENERIC_ERROR }, 500);
  }
});
