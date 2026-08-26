import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GENERIC_MESSAGE = "Se o e-mail estiver cadastrado, você receberá instruções para redefinir sua senha.";
const GENERIC_RATE_LIMIT = "Muitas tentativas. Tente novamente mais tarde.";

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
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
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(`ip:${ip}`)) {
      return jsonResponse({ message: GENERIC_RATE_LIMIT }, 429);
    }

    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      // Always return generic message
      return jsonResponse({ message: GENERIC_MESSAGE }, 200);
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!checkRateLimit(`email:${normalizedEmail}`)) {
      return jsonResponse({ message: GENERIC_RATE_LIMIT }, 429);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find active user with this email
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, active")
      .eq("email", normalizedEmail)
      .single();

    // Always return generic message — never reveal if account exists
    if (!profile || !profile.active) {
      return jsonResponse({ message: GENERIC_MESSAGE }, 200);
    }

    // Check for existing pending request (prevent duplicates/abuse)
    const { data: existingRequest } = await supabase
      .from("password_reset_requests")
      .select("id")
      .eq("user_id", profile.id)
      .eq("status", "pendente")
      .limit(1)
      .maybeSingle();

    if (existingRequest) {
      // Already has pending request — still return generic message
      return jsonResponse({ message: GENERIC_MESSAGE }, 200);
    }

    // Create pending request (no code generated)
    await supabase.from("password_reset_requests").insert({
      user_id: profile.id,
      email_normalized: normalizedEmail,
      status: "pendente",
    });

    // Audit (without revealing email in metadata)
    await supabase.from("audit_logs").insert({
      actor_id: null,
      action: "request_password_reset",
      entity_type: "password_reset_request",
      metadata: {
        email_domain: normalizedEmail.split("@")[1] || "unknown",
      },
    });

    return jsonResponse({ message: GENERIC_MESSAGE }, 200);
  } catch {
    // Even on error, return generic message
    return jsonResponse({ message: GENERIC_MESSAGE }, 200);
  }
});
