import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 10;
const MAX_ATTEMPTS = 5;

function generateCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
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
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const encryptionSecret = Deno.env.get("ACCESS_CODE_ENCRYPTION_SECRET") || supabaseServiceKey;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !callerProfile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = await req.json();
    const {
      first_name: rawFirstName,
      last_name: rawLastName,
      email,
      role,
      project_id,
      campus: rawCampus,
      matricula,
      nome_completo,
      curso,
    } = body;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "email is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const fullName = (nome_completo || "").trim();
    let first_name = (rawFirstName || "").trim();
    let last_name = (rawLastName || "").trim();

    if (!first_name && fullName) {
      const parts = fullName.split(/\s+/);
      first_name = parts[0] || "";
      last_name = parts.slice(1).join(" ");
    }

    if (!first_name) {
      return new Response(
        JSON.stringify({ error: "nome_completo or first_name is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const targetRole = role || "aluno";
    const campus = rawCampus || null;
    const normalizedMatricula = matricula ? matricula.trim() : null;
    const normalizedNomeCompleto = fullName || null;
    const normalizedCurso = curso ? curso.trim() : null;

    if (callerProfile.role === "admin") {
      if (!["aluno", "professor", "admin"].includes(targetRole)) {
        return new Response(JSON.stringify({ error: "Invalid role" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    } else if (callerProfile.role === "professor") {
      if (targetRole !== "aluno") {
        return new Response(
          JSON.stringify({ error: "Professors can only create students" }),
          {
            status: 403,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
      if (project_id) {
        const { data: project } = await supabaseAdmin
          .from("projects")
          .select("id, professor_id, status")
          .eq("id", project_id)
          .single();

        if (!project || project.professor_id !== callerProfile.id) {
          return new Response(
            JSON.stringify({
              error: "Project not found or not owned by you",
            }),
            {
              status: 403,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        }

        if (
          !["rascunho", "correcao_solicitada"].includes(project.status)
        ) {
          return new Response(
            JSON.stringify({
              error: "Cannot add users to projects not in editable status",
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        }
      }
    } else {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: existingByEmail } = await supabaseAdmin
      .from("profiles")
      .select("id, active, role")
      .eq("email", normalizedEmail)
      .single();

    let existingByMatricula: { id: string; active: boolean; role: string } | null = null;
    if (normalizedMatricula && targetRole === "aluno") {
      const { data: matProfile } = await supabaseAdmin
        .from("profiles")
        .select("id, active, role")
        .eq("matricula", normalizedMatricula)
        .single();
      existingByMatricula = matProfile;
    }

    if (existingByEmail && existingByMatricula && existingByEmail.id !== existingByMatricula.id) {
      return new Response(
        JSON.stringify({
          error: "Matrícula e e-mail pertencem a pessoas diferentes.",
        }),
        {
          status: 409,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const existingProfile = existingByEmail || existingByMatricula;

    if (existingProfile) {
      if (
        existingProfile.active &&
        ["professor", "admin"].includes(existingProfile.role)
      ) {
        return new Response(
          JSON.stringify({
            error: "E-mail já associado a professor ou administrador.",
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      const updateData: Record<string, unknown> = {};
      if (normalizedMatricula) updateData.matricula = normalizedMatricula;
      if (normalizedNomeCompleto) updateData.nome_completo = normalizedNomeCompleto;
      if (normalizedCurso) updateData.curso = normalizedCurso;

      if (Object.keys(updateData).length > 0) {
        await supabaseAdmin
          .from("profiles")
          .update(updateData)
          .eq("id", existingProfile.id);
      }

      if (existingProfile.active && project_id && targetRole === "aluno") {
        const { error: linkError } = await supabaseAdmin
          .from("project_participants")
          .insert({
            project_id,
            student_id: existingProfile.id,
            added_by: callerProfile.id,
          });

        if (linkError && !linkError.message.includes("duplicate")) {
          throw linkError;
        }
      }

      await supabaseAdmin.from("audit_logs").insert({
        actor_id: callerProfile.id,
        action: "reuse_existing_user",
        entity_type: "profile",
        entity_id: existingProfile.id,
        metadata: {
          email: normalizedEmail,
          matricula: normalizedMatricula,
          role: targetRole,
          project_id: project_id || null,
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          user_id: existingProfile.id,
          reused: true,
          message: "Existing user linked successfully",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { data: existingAuthUsers } =
      await supabaseAdmin.auth.admin.listUsers();
    const existingAuth = existingAuthUsers?.users?.find(
      (u: any) => u.email === normalizedEmail
    );

    if (existingAuth) {
      const profileData: Record<string, unknown> = {
        id: existingAuth.id,
        first_name,
        last_name,
        email: normalizedEmail,
        role: targetRole,
        active: true,
        first_access_completed: false,
        campus: campus || null,
      };
      if (normalizedMatricula) profileData.matricula = normalizedMatricula;
      if (normalizedNomeCompleto) profileData.nome_completo = normalizedNomeCompleto;
      if (normalizedCurso) profileData.curso = normalizedCurso;

      const { error: insertProfileError } = await supabaseAdmin
        .from("profiles")
        .insert(profileData);

      if (insertProfileError && !insertProfileError.message.includes("duplicate")) {
        throw insertProfileError;
      }

      if (project_id && targetRole === "aluno") {
        const { error: linkError } = await supabaseAdmin
          .from("project_participants")
          .insert({
            project_id,
            student_id: existingAuth.id,
            added_by: callerProfile.id,
          });

        if (linkError && !linkError.message.includes("duplicate")) {
          throw linkError;
        }
      }

      const plainCode = generateCode();
      const codeHashResult = await supabaseAdmin.rpc("hash_access_code", {
        p_code: plainCode,
      });

      if (!codeHashResult.error && codeHashResult.data) {
        const codeEncrypted = encryptCode(plainCode, encryptionSecret);

        await supabaseAdmin.from("access_codes").insert({
          user_id: existingAuth.id,
          code_hash: codeHashResult.data,
          code_encrypted: codeEncrypted,
          purpose: "first_access",
          created_by: callerProfile.id,
          max_attempts: MAX_ATTEMPTS,
        });
      }

      await supabaseAdmin.from("audit_logs").insert({
        actor_id: callerProfile.id,
        action: "create_managed_user",
        entity_type: "profile",
        entity_id: existingAuth.id,
        metadata: {
          email: normalizedEmail,
          matricula: normalizedMatricula,
          role: targetRole,
          project_id: project_id || null,
          campus: campus || null,
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          user_id: existingAuth.id,
          reused: true,
          message: "Existing auth user linked successfully",
          code: plainCode,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const tempPassword =
      crypto.randomUUID().replace(/-/g, "").slice(0, 16) + "!A1";

    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          first_name,
          last_name,
          role: targetRole,
        },
      });

    if (createError) {
      throw createError;
    }

    const upsertData: Record<string, unknown> = {
      id: newUser.user.id,
      first_name,
      last_name,
      email: normalizedEmail,
      role: targetRole,
      active: true,
      first_access_completed: false,
      campus: campus || null,
    };
    if (normalizedMatricula) upsertData.matricula = normalizedMatricula;
    if (normalizedNomeCompleto) upsertData.nome_completo = normalizedNomeCompleto;
    if (normalizedCurso) upsertData.curso = normalizedCurso;

    const { error: upsertProfileError } = await supabaseAdmin
      .from("profiles")
      .upsert(upsertData, { onConflict: "id" });

    if (upsertProfileError) {
      throw upsertProfileError;
    }

    if (project_id && targetRole === "aluno") {
      const { error: linkError } = await supabaseAdmin
        .from("project_participants")
        .insert({
          project_id,
          student_id: newUser.user.id,
          added_by: callerProfile.id,
        });

      if (linkError && !linkError.message.includes("duplicate")) {
        throw linkError;
      }
    }

    const plainCode = generateCode();
    const codeHashResult = await supabaseAdmin.rpc("hash_access_code", {
      p_code: plainCode,
    });

    let codeReturn: string | undefined;

    if (!codeHashResult.error && codeHashResult.data) {
      const codeEncrypted = encryptCode(plainCode, encryptionSecret);

      const { error: insertCodeError } = await supabaseAdmin
        .from("access_codes")
        .insert({
          user_id: newUser.user.id,
          code_hash: codeHashResult.data,
          code_encrypted: codeEncrypted,
          purpose: "first_access",
          created_by: callerProfile.id,
          max_attempts: MAX_ATTEMPTS,
        });

      if (!insertCodeError) {
        codeReturn = plainCode;
      }
    }

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: callerProfile.id,
      action: "create_managed_user",
      entity_type: "profile",
      entity_id: newUser.user.id,
      metadata: {
        email: normalizedEmail,
        matricula: normalizedMatricula,
        role: targetRole,
        project_id: project_id || null,
        campus: campus || null,
        code_generated: !!codeReturn,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUser.user.id,
        reused: false,
        message: "User created successfully",
        ...(codeReturn ? { code: codeReturn } : {}),
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in create-managed-user:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
