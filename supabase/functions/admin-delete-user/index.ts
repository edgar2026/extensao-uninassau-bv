import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PROTECTED_EMAILS = [
  "edgareda2015@gmail.com",
  "edgareda2015@hotmail.com",
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, role, active, first_name, last_name")
      .eq("id", user.id)
      .single();

    if (profileError || !callerProfile || callerProfile.role !== "admin" || !callerProfile.active) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body = await req.json();
    const { user_id } = body;

    if (!user_id || typeof user_id !== "string") {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (user_id === user.id) {
      return new Response(
        JSON.stringify({ success: false, code: "CANNOT_DELETE_SELF", message: "Você não pode excluir sua própria conta." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, role, first_name, last_name, active")
      .eq("id", user_id)
      .single();

    if (targetError || !targetProfile) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (PROTECTED_EMAILS.includes(targetProfile.email?.toLowerCase())) {
      return new Response(
        JSON.stringify({ success: false, code: "PROTECTED_USER", message: "Este usuário é protegido e não pode ser excluído." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const dependencies: string[] = [];

    const { data: profProjects } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("professor_id", user_id)
      .limit(1);
    if (profProjects && profProjects.length > 0) {
      dependencies.push("professor em projetos");
    }

    const { data: participants } = await supabaseAdmin
      .from("project_participants")
      .select("id")
      .eq("student_id", user_id)
      .limit(1);
    if (participants && participants.length > 0) {
      dependencies.push("participações em projetos");
    }

    const { data: certs } = await supabaseAdmin
      .from("certificates")
      .select("id")
      .eq("student_id", user_id)
      .limit(1);
    if (certs && certs.length > 0) {
      dependencies.push("certificados");
    }

    const { data: docs } = await supabaseAdmin
      .from("project_documents")
      .select("id")
      .eq("uploaded_by", user_id)
      .limit(1);
    if (docs && docs.length > 0) {
      dependencies.push("documentos enviados");
    }

    const { data: codes } = await supabaseAdmin
      .from("access_codes")
      .select("id")
      .eq("created_by", user_id)
      .limit(1);
    if (codes && codes.length > 0) {
      dependencies.push("códigos gerados");
    }

    if (dependencies.length > 0) {
      await supabaseAdmin.from("audit_logs").insert({
        actor_id: user.id,
        action: "delete_user_blocked",
        entity_type: "profile",
        entity_id: user_id,
        metadata: { dependencies },
      });

      return new Response(
        JSON.stringify({
          success: false,
          code: "USER_HAS_DEPENDENCIES",
          message: "Este usuário possui vínculos e não pode ser excluído. Utilize Arquivar.",
          dependencies,
        }),
        { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
    if (deleteAuthError) {
      return new Response(
        JSON.stringify({ error: `Erro ao excluir usuário do Auth: ${deleteAuthError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { error: deleteProfileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", user_id);
    if (deleteProfileError) {
      return new Response(
        JSON.stringify({ error: `Perfil órfão: Auth excluído mas profile não. ${deleteProfileError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: user.id,
      action: "delete_user",
      entity_type: "profile",
      entity_id: user_id,
      metadata: { email: targetProfile.email },
    });

    return new Response(
      JSON.stringify({ success: true, message: "Usuário excluído com sucesso." }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err) {
    console.error("Error in admin-delete-user:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno ao excluir usuário." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
