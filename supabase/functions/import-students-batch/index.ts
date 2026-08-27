import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type CampusCode = 'GRAÇAS' | 'CAXANGÁ' | 'BOA_VIAGEM'

interface StudentResult {
  linha: number
  matricula: string
  nome_completo: string
  curso: string
  email: string
  campus: string
  resultado: 'criado' | 'reutilizado' | 'ignorado' | 'erro'
  motivo?: string
  codigo_primeiro_acesso?: string
}

interface ImportResult {
  success: boolean
  summary: {
    total_linhas: number
    validos: number
    criados: number
    reutilizados: number
    ignorados: number
    erros: number
    distribuicao_campus: Record<string, number>
    distribuicao_curso: Record<string, number>
  }
  students: StudentResult[]
  errors: string[]
}

function normalizeCampus(raw: string): CampusCode | null {
  const normalized = raw
    .trim()
    .toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '')

  if (normalized === 'GRACAS') return 'GRAÇAS'
  if (normalized === 'CAXANGA') return 'CAXANGÁ'
  if (normalized === 'BOAVIAGEM') return 'BOA_VIAGEM'
  return null
}

function normalizeEmail(s: string): string {
  return (s || '').trim().toLowerCase()
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

function normalizeText(s: string): string {
  return (s || '').trim().replace(/\s+/g, ' ')
}

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function generateCode(): string {
  let code = ''
  const arr = new Uint8Array(10)
  crypto.getRandomValues(arr)
  for (let i = 0; i < 10; i++) {
    code += CODE_CHARS[arr[i] % CODE_CHARS.length]
  }
  return code
}

function encryptCode(code: string, secret: string): string {
  const encoder = new TextEncoder()
  const data = encoder.encode(code)
  const keyBytes = encoder.encode(secret.padEnd(32, '0').slice(0, 32))
  const iv = new Uint8Array(16)
  crypto.getRandomValues(iv)
  let encrypted = ''
  for (let i = 0; i < data.length; i++) {
    encrypted += String.fromCharCode(data[i] ^ keyBytes[i % keyBytes.length] ^ iv[i % iv.length])
  }
  return btoa(encrypted + '|' + Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''))
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: jsonHeaders }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const encryptionSecret = Deno.env.get('ACCESS_CODE_ENCRYPTION_SECRET') || supabaseServiceKey

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: jsonHeaders }
      )
    }

    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !callerProfile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 403, headers: jsonHeaders }
      )
    }

    if (callerProfile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only admins can import students' }),
        { status: 403, headers: jsonHeaders }
      )
    }

    const body = await req.json()
    const { students: rawStudents } = body as { students: Record<string, unknown>[] }

    if (!Array.isArray(rawStudents) || rawStudents.length === 0) {
      return new Response(
        JSON.stringify({ error: 'students array is required and must not be empty' }),
        { status: 400, headers: jsonHeaders }
      )
    }

    const MAX_ROWS = 500
    if (rawStudents.length > MAX_ROWS) {
      return new Response(
        JSON.stringify({ error: `Exceeds limit of ${MAX_ROWS} rows` }),
        { status: 400, headers: jsonHeaders }
      )
    }

    const errors: string[] = []
    const students: StudentResult[] = []
    const campusCount: Record<string, number> = {}
    const cursoCount: Record<string, number> = {}
    const matriculaSeen = new Map<string, number>()
    const emailSeen = new Map<string, number>()

    for (let i = 0; i < rawStudents.length; i++) {
      const row = rawStudents[i]
      const rowNum = i + 2
      const matricula = normalizeText(String(row.matricula || ''))
      const nome = normalizeText(String(row.nome_completo || ''))
      const curso = normalizeText(String(row.curso || ''))
      const email = normalizeEmail(String(row.email || ''))
      const campusRaw = String(row.campus || '')
      const campus = normalizeCampus(campusRaw)

      if (!matricula) errors.push(`Linha ${rowNum}, Coluna A: Matrícula é obrigatória`)
      if (!nome) errors.push(`Linha ${rowNum}, Coluna B: Nome completo é obrigatório`)
      if (!curso) errors.push(`Linha ${rowNum}, Coluna C: Curso é obrigatório`)
      if (!email) errors.push(`Linha ${rowNum}, Coluna D: E-mail é obrigatório`)
      else if (!isValidEmail(email)) errors.push(`Linha ${rowNum}, Coluna D: E-mail inválido '${email}'`)
      if (!campus) errors.push(`Linha ${rowNum}, Coluna E: Campus inválido '${campusRaw}'. Use: GRACAS, CAXANGA ou BOAVIAGEM`)

      if (curso && !activeCourseNames.has(curso.trim().toLowerCase())) {
        errors.push(`Linha ${rowNum}, Coluna C: Curso não encontrado ou inativo '${curso}'`)
      }

      if (matricula && matriculaSeen.has(matricula)) {
        errors.push(`Linha ${rowNum}, Coluna A: Matrícula duplicada no arquivo (primeira ocorrência na linha ${matriculaSeen.get(matricula)})`)
      } else if (matricula) {
        matriculaSeen.set(matricula, rowNum)
      }

      if (emailSeen.has(email)) {
        errors.push(`Linha ${rowNum}, Coluna D: E-mail duplicado no arquivo (primeira ocorrência na linha ${emailSeen.get(email)})`)
      } else {
        emailSeen.set(email, rowNum)
      }

      students.push({
        linha: rowNum,
        matricula,
        nome_completo: nome,
        curso,
        email,
        campus: campus || campusRaw,
        resultado: 'erro',
      })
    }

    if (errors.length > 0) {
      const summary = {
        total_linhas: rawStudents.length,
        validos: 0,
        criados: 0,
        reutilizados: 0,
        ignorados: 0,
        erros: errors.length,
        distribuicao_campus: {} as Record<string, number>,
        distribuicao_curso: {} as Record<string, number>,
      }
      return new Response(
        JSON.stringify({ success: false, summary, students, errors }),
        { status: 200, headers: jsonHeaders }
      )
    }

    const allEmails = [...emailSeen.keys()]
    const allMatriculas = [...matriculaSeen.keys()]

    const { data: existingByEmail } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role')
      .in('email', allEmails)

    const profileByEmail = new Map<string, { id: string; role: string }>()
    for (const p of existingByEmail || []) {
      profileByEmail.set(normalizeEmail(p.email), { id: p.id, role: p.role })
    }

    const { data: existingByMatricula } = await supabaseAdmin
      .from('profiles')
      .select('id, matricula, role')
      .in('matricula', allMatriculas)

    const profileByMatricula = new Map<string, { id: string; role: string }>()
    for (const p of existingByMatricula || []) {
      if (p.matricula) profileByMatricula.set(normalizeText(p.matricula), { id: p.id, role: p.role })
    }

    const { data: existingAuthUsers } = await supabaseAdmin.auth.admin.listUsers()
    const authByEmail = new Map<string, string>()
    for (const u of existingAuthUsers?.users || []) {
      if (u.email) authByEmail.set(normalizeEmail(u.email), u.id)
    }

    const { data: activeCourses } = await supabaseAdmin
      .from('courses')
      .select('nome')
      .eq('ativo', true)
    const activeCourseNames = new Set(
      (activeCourses || []).map(c => c.nome.trim().toLowerCase())
    )

    for (let i = 0; i < students.length; i++) {
      const s = students[i]
      const rowNum = s.linha
      const raw = rawStudents[i]
      const matricula = normalizeText(String(raw.matricula || ''))
      const nome = normalizeText(String(raw.nome_completo || ''))
      const curso = normalizeText(String(raw.curso || ''))
      const email = normalizeEmail(String(raw.email || ''))
      const campus = normalizeCampus(String(raw.campus || ''))!

      s.matricula = matricula
      s.nome_completo = nome
      s.curso = curso
      s.email = email
      s.campus = campus

      const existingEmail = profileByEmail.get(email)
      const existingMat = profileByMatricula.get(matricula)

      if (existingEmail && existingMat && existingEmail.id !== existingMat.id) {
        s.resultado = 'erro'
        s.motivo = 'Matrícula e e-mail pertencem a pessoas diferentes'
        errors.push(`Linha ${rowNum}: Conflito - matrícula e e-mail pertencem a pessoas diferentes`)
        continue
      }

      const existingProfile = existingEmail || existingMat

      if (existingProfile) {
        if (existingProfile.role === 'aluno') {
          const updateData: Record<string, unknown> = {}
          if (nome) updateData.nome_completo = nome
          if (curso) updateData.curso = curso
          if (matricula && !existingMat) updateData.matricula = matricula
          if (Object.keys(updateData).length > 0) {
            await supabaseAdmin.from('profiles').update(updateData).eq('id', existingProfile.id)
          }
          s.resultado = 'reutilizado'
          s.motivo = 'Aluno já cadastrado'
        } else {
          s.resultado = 'erro'
          s.motivo = `E-mail associado a perfil incompatível (${existingProfile.role})`
          errors.push(`Linha ${rowNum}: E-mail associado a perfil incompatível (${existingProfile.role})`)
        }
        continue
      }

      if (authByEmail.has(email)) {
        s.resultado = 'reutilizado'
        s.motivo = 'Conta já existe no Auth'
        continue
      }

      const tempPassword = crypto.randomUUID().replace(/-/g, '').slice(0, 16) + '!A1b'

      const nameParts = nome.split(' ')
      const firstName = nameParts[0] || nome
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ' '

      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          role: 'aluno',
        },
      })

      if (createErr) {
        if (createErr.message?.includes('already been registered')) {
          s.resultado = 'reutilizado'
          s.motivo = 'Conta já existe no Auth'
          continue
        }
        s.resultado = 'erro'
        s.motivo = `Erro ao criar conta: ${createErr.message}`
        errors.push(`Linha ${rowNum}: Erro ao criar conta: ${createErr.message}`)
        continue
      }

      if (newUser?.user) {
        const profileData: Record<string, unknown> = {
          id: newUser.user.id,
          first_name: firstName,
          last_name: lastName,
          email,
          role: 'aluno',
          active: true,
          first_access_completed: false,
          campus,
          matricula,
          nome_completo: nome,
          curso,
        }

        const { error: profileErr } = await supabaseAdmin
          .from('profiles')
          .upsert(profileData, { onConflict: 'id' })

        if (profileErr) {
          s.resultado = 'erro'
          s.motivo = `Erro ao criar perfil: ${profileErr.message}`
          errors.push(`Linha ${rowNum}: Erro ao criar perfil: ${profileErr.message}`)
          continue
        }

        const code = generateCode()
        const { data: codeHash } = await supabaseAdmin.rpc('hash_access_code', { p_code: code })

        if (codeHash) {
          const codeEncrypted = encryptCode(code, encryptionSecret)
          const { error: codeErr } = await supabaseAdmin.from('access_codes').insert({
            user_id: newUser.user.id,
            code_hash: codeHash,
            code_encrypted: codeEncrypted,
            purpose: 'first_access',
            created_by: callerProfile.id,
          })

          if (!codeErr) {
            s.resultado = 'criado'
            s.codigo_primeiro_acesso = code
            s.motivo = 'Conta criada com sucesso'
          } else {
            s.resultado = 'criado'
            s.motivo = 'Conta criada (código não gerado)'
          }
        } else {
          s.resultado = 'criado'
          s.motivo = 'Conta criada (código não gerado)'
        }

        campusCount[campus] = (campusCount[campus] || 0) + 1
        cursoCount[curso] = (cursoCount[curso] || 0) + 1
      }
    }

    try {
      await supabaseAdmin.from('audit_logs').insert({
        actor_id: callerProfile.id,
        action: 'bulk_import_students',
        entity_type: 'profile',
        metadata: {
          total_linhas: rawStudents.length,
          criados: students.filter(s => s.resultado === 'criado').length,
          reutilizados: students.filter(s => s.resultado === 'reutilizado').length,
          erros: errors.length,
        },
      })
    } catch (_auditErr) {
      // audit failure is non-blocking
    }

    const summary = {
      total_linhas: rawStudents.length,
      validos: students.filter(s => s.resultado !== 'erro').length,
      criados: students.filter(s => s.resultado === 'criado').length,
      reutilizados: students.filter(s => s.resultado === 'reutilizado').length,
      ignorados: 0,
      erros: students.filter(s => s.resultado === 'erro').length,
      distribuicao_campus: campusCount,
      distribuicao_curso: cursoCount,
    }

    const result: ImportResult = {
      success: errors.length === 0,
      summary,
      students,
      errors,
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: jsonHeaders,
    })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    console.error('import-students-batch error:', msg)
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: jsonHeaders }
    )
  }
})
