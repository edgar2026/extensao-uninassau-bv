/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CertificateRow, CertificateView, PublicCertificateResult, Certificado, CertificadoProfessor } from '../../types';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { AppError } from '../../lib/errors';

export interface CertificateViewWithTitulacao extends CertificateView {
  professor_titulacao: string | null;
  student_matricula: string | null;
}

const SELECT_COLUMNS = `
  c.id,
  c.public_code,
  c.codigo_certificado,
  c.validation_uuid::text as validation_uuid,
  c.status,
  c.issued_at,
  c.revoked_at,
  c.revocation_reason,
  c.student_id,
  c.project_id,
  p.title as project_title,
  p.start_date,
  p.end_date,
  p.workload_hours,
  p.campus,
  p.professor_id,
  COALESCE(pr_prof.nome_completo, TRIM(pr_prof.first_name || ' ' || pr_prof.last_name)) as professor_name,
  COALESCE(pr_student.nome_completo, TRIM(pr_student.first_name || ' ' || pr_student.last_name)) as student_name
`;

const FROM_CLAUSE = `
  certificates c
  JOIN projects p ON p.id = c.project_id
  JOIN profiles pr_student ON pr_student.id = c.student_id
  LEFT JOIN profiles pr_prof ON pr_prof.id = p.professor_id
`;

export const certificadosRepository = {
  findAll: async (): Promise<CertificateViewWithTitulacao[]> => {
    if (!isSupabaseConfigured) return [];

    // Since RPC only works for single lookups, use direct query
    const { data: rows, error: rowsError } = await supabase
      .from('certificates')
      .select(`
        id,
        public_code,
        codigo_certificado,
        validation_uuid,
        status,
        issued_at,
        revoked_at,
        revocation_reason,
        student_id,
        project_id,
        professor_id,
        tipo,
        projects!certificates_project_id_fkey(title, start_date, end_date, workload_hours, campus, professor_id, category),
        profiles!certificates_student_id_fkey(first_name, last_name, nome_completo, matricula)
      `)
      .order('issued_at', { ascending: false });

    if (rowsError) throw new AppError(`Erro ao buscar certificados: ${rowsError.message}`, 500);
    if (!rows) return [];

    // Fetch professor names and titulacao in batch
    const professorIds = [...new Set(
      rows
        .map(r => (r.projects as any)?.professor_id)
        .filter(Boolean)
    )];

    let professorMap = new Map<string, { name: string; titulacao: string | null }>();
    if (professorIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, nome_completo, titulacao')
        .in('id', professorIds);
      if (profs) {
        profs.forEach(p => {
          const name = p.nome_completo || `${p.first_name} ${p.last_name}`.trim();
          professorMap.set(p.id, { name, titulacao: p.titulacao });
        });
      }
    }

    return rows.map(row => {
      const proj = row.projects as any;
      const student = row.profiles as any;
      const profData = professorMap.get(proj?.professor_id);
      return {
        id: row.id,
        public_code: row.public_code,
        codigo_certificado: row.codigo_certificado,
        validation_uuid: row.validation_uuid,
        status: row.status,
        issued_at: row.issued_at,
        revoked_at: row.revoked_at,
        revocation_reason: row.revocation_reason,
        student_name: student ? (student.nome_completo || `${student.first_name} ${student.last_name}`.trim()) : 'Desconhecido',
        student_id: row.student_id,
        student_matricula: student?.matricula || null,
        project_title: proj?.title || 'Projeto Desconhecido',
        project_id: row.project_id,
        start_date: proj?.start_date || '',
        end_date: proj?.end_date || '',
        workload_hours: proj?.workload_hours || 0,
        campus: proj?.campus || null,
        professor_name: profData?.name || '',
        professor_titulacao: profData?.titulacao || null,
        tipo: (row as any).tipo || 'aluno_participante',
        professor_id: (row as any).professor_id || null,
      };
    });
  },

  findByStudentId: async (studentId: string): Promise<CertificateViewWithTitulacao[]> => {
    if (!isSupabaseConfigured) return [];

    const { data: rows, error } = await supabase
      .from('certificates')
      .select(`
        id,
        public_code,
        codigo_certificado,
        validation_uuid,
        status,
        issued_at,
        revoked_at,
        revocation_reason,
        student_id,
        project_id,
        projects!certificates_project_id_fkey(title, start_date, end_date, workload_hours, campus, professor_id),
        profiles!certificates_student_id_fkey(first_name, last_name, nome_completo, matricula)
      `)
      .eq('student_id', studentId)
      .order('issued_at', { ascending: false });

    if (error) throw new AppError(`Erro ao buscar certificados: ${error.message}`, 500);
    if (!rows) return [];

    const professorIds = [...new Set(
      rows.map(r => (r.projects as any)?.professor_id).filter(Boolean)
    )];

    let professorMap = new Map<string, { name: string; titulacao: string | null }>();
    if (professorIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, nome_completo, titulacao')
        .in('id', professorIds);
      if (profs) {
        profs.forEach(p => {
          const name = p.nome_completo || `${p.first_name} ${p.last_name}`.trim();
          professorMap.set(p.id, { name, titulacao: p.titulacao });
        });
      }
    }

    return rows.map(row => {
      const proj = row.projects as any;
      const student = row.profiles as any;
      const profData = professorMap.get(proj?.professor_id);
      return {
        id: row.id,
        public_code: row.public_code,
        codigo_certificado: row.codigo_certificado,
        validation_uuid: row.validation_uuid,
        status: row.status,
        issued_at: row.issued_at,
        revoked_at: row.revoked_at,
        revocation_reason: row.revocation_reason,
        student_name: student ? (student.nome_completo || `${student.first_name} ${student.last_name}`.trim()) : 'Desconhecido',
        student_id: row.student_id,
        student_matricula: student?.matricula || null,
        project_title: proj?.title || 'Projeto Desconhecido',
        project_id: row.project_id,
        start_date: proj?.start_date || '',
        end_date: proj?.end_date || '',
        workload_hours: proj?.workload_hours || 0,
        campus: proj?.campus || null,
        professor_name: profData?.name || '',
        professor_titulacao: profData?.titulacao || null,
      };
    });
  },

  /** Public validation - supports student and professor orientation certificates */
  validatePublic: async (code: string): Promise<PublicCertificateResult> => {
    const cleanCode = code.trim();
    if (!cleanCode) return { valid: false, error: 'Código inválido' };

    // 1. Try standard RPC
    try {
      const { data, error } = await supabase
        .rpc('validate_certificate', { p_code: cleanCode });

      if (!error && data && (data as PublicCertificateResult).valid && (data as PublicCertificateResult).certificate) {
        return data as PublicCertificateResult;
      }
    } catch (e) {
      // Fallback below
    }

    // 2. Direct query fallback (handles professor certificates and direct lookup)
    const { data: rows, error: queryError } = await supabase
      .from('certificates')
      .select(`
        id,
        public_code,
        codigo_certificado,
        validation_uuid,
        status,
        issued_at,
        revoked_at,
        revocation_reason,
        student_id,
        professor_id,
        tipo,
        projects!certificates_project_id_fkey(title, start_date, end_date, workload_hours, campus, professor_id, category)
      `)
      .or(`public_code.eq.${cleanCode},codigo_certificado.eq.${cleanCode},validation_uuid.eq.${cleanCode}`)
      .limit(1);

    if (queryError || !rows || rows.length === 0) {
      return { valid: false, error: 'Certificado não encontrado' };
    }

    const row = rows[0] as any;
    const proj = row.projects;
    const isProf = row.tipo === 'professor_orientador';
    
    let profName = '';
    let profTitulacao: string | null = null;
    const profIdToFetch = isProf ? (row.professor_id || proj?.professor_id) : proj?.professor_id;
    
    if (profIdToFetch) {
      const { data: p } = await supabase
        .from('profiles')
        .select('first_name, last_name, nome_completo, titulacao')
        .eq('id', profIdToFetch)
        .single();
      if (p) {
        profName = p.nome_completo || `${p.first_name} ${p.last_name}`.trim();
        profTitulacao = p.titulacao || null;
      }
    }

    let studentName = '';
    if (!isProf && row.student_id) {
      const { data: st } = await supabase
        .from('profiles')
        .select('first_name, last_name, nome_completo')
        .eq('id', row.student_id)
        .single();
      if (st) {
        studentName = st.nome_completo || `${st.first_name} ${st.last_name}`.trim();
      }
    }

    const startDate = proj?.start_date || '';
    const endDate = proj?.end_date || '';
    const period = startDate && endDate ? `${startDate} a ${endDate}` : '';

    return {
      valid: true,
      certificate: {
        student_name: studentName,
        project_title: proj?.title || 'Projeto de Extensão',
        period,
        workload_hours: proj?.workload_hours || 0,
        campus: proj?.campus || null,
        professor_name: profName,
        professor_titulacao: profTitulacao,
        public_code: row.public_code,
        codigo_certificado: row.codigo_certificado,
        validation_uuid: row.validation_uuid,
        status: row.status,
        tipo: row.tipo || (isProf ? 'professor_orientador' : 'aluno_participante'),
        categoria: proj?.category || 'Extensão',
        issued_at: row.issued_at,
        revoked_at: row.revoked_at,
        revocation_reason: row.revocation_reason,
      },
    };
  },

  /** Revoke a certificate (admin only) */
  revoke: async (certificateId: string, reason: string, revokedBy: string): Promise<void> => {
    const { error } = await supabase
      .from('certificates')
      .update({
        status: 'revogado',
        revoked_at: new Date().toISOString(),
        revoked_by: revokedBy,
        revocation_reason: reason,
      })
      .eq('id', certificateId);

    if (error) throw new AppError(`Erro ao revogar certificado: ${error.message}`, 500);
  },

  /** Unrevoke a certificate (admin only) */
  unrevoke: async (certificateId: string): Promise<void> => {
    const { error } = await supabase
      .from('certificates')
      .update({
        status: 'valido',
        revoked_at: null,
        revoked_by: null,
        revocation_reason: null,
      })
      .eq('id', certificateId);

    if (error) throw new AppError(`Erro ao restaurar certificado: ${error.message}`, 500);
  },

  /** Create an avulso certificate (admin only) */
  createAvulso: async (payload: {
    student_id: string;
    project_id: string;
    codigo_certificado: string;
  }): Promise<CertificateRow> => {
    const { data: pubData, error: pubError } = await supabase.rpc('generate_unique_public_code');
    if (pubError) throw new AppError(`Erro ao gerar código de autenticação: ${pubError.message}`, 500);
    const publicCode = pubData as string;

    const { data, error } = await supabase
      .from('certificates')
      .insert({
        student_id: payload.student_id,
        project_id: payload.project_id,
        public_code: publicCode,
        codigo_certificado: payload.codigo_certificado,
        validation_uuid: crypto.randomUUID(),
        status: 'valido',
      })
      .select()
      .single();

    if (error) throw new AppError(`Erro ao criar certificado: ${error.message}`, 500);
    return data as CertificateRow;
  },

  /** Find professor orientation certificates by professor_id */
  findByProfessorId: async (professorId: string): Promise<CertificadoProfessor[]> => {
    if (!isSupabaseConfigured) return [];

    const { data: rows, error } = await supabase
      .from('certificates')
      .select(`
        id,
        public_code,
        codigo_certificado,
        validation_uuid,
        status,
        issued_at,
        revoked_at,
        revocation_reason,
        professor_id,
        project_id,
        projects!certificates_project_id_fkey(title, start_date, end_date, campus, category)
      `)
      .eq('tipo', 'professor_orientador')
      .eq('professor_id', professorId)
      .order('issued_at', { ascending: false });

    if (error) throw new AppError(`Erro ao buscar certificados do professor: ${error.message}`, 500);
    if (!rows) return [];

    // Fetch professor profile
    const { data: profProfile } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, nome_completo, titulacao, campus')
      .eq('id', professorId)
      .single();

    const profName = profProfile
      ? (profProfile.nome_completo || `${profProfile.first_name} ${profProfile.last_name}`.trim())
      : 'Professor';
    const profTitulacao = profProfile?.titulacao || '';

    return rows.map(row => {
      const proj = row.projects as any;
      return {
        id: row.id,
        projetoId: row.project_id,
        projetoNome: proj?.title || 'Projeto',
        projetoCategoria: proj?.category || 'Extensão',
        professorId: row.professor_id || professorId,
        professorNome: profName,
        professorTitulacao: profTitulacao,
        dataInicio: proj?.start_date || '',
        dataTermino: proj?.end_date || '',
        dataEmissao: (row.issued_at || '').split('T')[0],
        unidade: proj?.campus || '',
        codigoPublico: row.public_code,
        codigoCertificado: row.codigo_certificado || '',
        validationUuid: row.validation_uuid,
        situacao: row.status === 'valido' ? 'Válido' : 'Revogado',
        motivoRevogacao: row.revocation_reason || undefined,
      };
    });
  },

  /** Create a professor orientation certificate (idempotent — uses unique index) */
  createProfessorCertificate: async (professorId: string, projectId: string): Promise<{ created: boolean; id?: string; error?: string }> => {
    if (!isSupabaseConfigured) return { created: false, error: 'Supabase not configured' };

    // Check if already exists
    const { data: existing } = await supabase
      .from('certificates')
      .select('id')
      .eq('tipo', 'professor_orientador')
      .eq('professor_id', professorId)
      .eq('project_id', projectId)
      .maybeSingle();

    if (existing) return { created: false, id: existing.id };

    // Generate unique public code
    const { data: pubData, error: pubError } = await supabase.rpc('generate_unique_public_code');
    if (pubError) return { created: false, error: `Código: ${pubError.message}` };

    const { data, error } = await supabase
      .from('certificates')
      .insert({
        tipo: 'professor_orientador',
        professor_id: professorId,
        project_id: projectId,
        student_id: null,
        public_code: pubData as string,
        codigo_certificado: null,
        validation_uuid: crypto.randomUUID(),
        status: 'valido',
      })
      .select('id')
      .single();

    if (error) {
      // Unique constraint violation = already exists (race condition)
      if (error.code === '23505') return { created: false };
      return { created: false, error: error.message };
    }

    return { created: true, id: data.id };
  },

  /** Convert CertificateView to frontend Certificado model */
  toCertificado: (view: CertificateViewWithTitulacao): Certificado => {
    return {
      id: view.id,
      projetoId: view.project_id,
      codigoAutenticacao: view.public_code,
      codigoCertificado: view.codigo_certificado || '',
      alunoNome: view.student_name,
      alunoMatricula: view.student_matricula || '',
      alunoCpfLast6: '000000',
      projetoNome: view.project_title,
      professorResponsavel: view.professor_name,
      titulacaoProfessor: view.professor_titulacao || '',
      cargaHoraria: view.workload_hours,
      dataInicio: view.start_date,
      dataTermino: view.end_date,
      dataEmissao: view.issued_at.split('T')[0],
      unidade: view.campus || '',
      situacao: view.status === 'valido' ? 'Válido' : 'Revogado',
      uuid: view.validation_uuid,
      motivoRevogacao: view.revocation_reason || undefined,
      tipo: ((view as any).tipo as 'aluno_participante' | 'professor_orientador') || 'aluno_participante',
      professorId: (view as any).professor_id || undefined,
    };
  },
};
