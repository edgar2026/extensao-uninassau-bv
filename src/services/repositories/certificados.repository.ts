/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CertificateRow, CertificateView, PublicCertificateResult, Certificado } from '../../types';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { AppError } from '../../lib/errors';

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
  findAll: async (): Promise<CertificateView[]> => {
    if (!isSupabaseConfigured) return [];

    const { data, error } = await supabase
      .rpc('validate_certificate', { p_code: '__none__' })
      .select();

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
        projects!certificates_project_id_fkey(title, start_date, end_date, workload_hours, campus, professor_id),
        profiles!certificates_student_id_fkey(first_name, last_name, nome_completo)
      `)
      .order('issued_at', { ascending: false });

    if (rowsError) throw new AppError(`Erro ao buscar certificados: ${rowsError.message}`, 500);
    if (!rows) return [];

    // Fetch professor names in batch
    const professorIds = [...new Set(
      rows
        .map(r => (r.projects as any)?.professor_id)
        .filter(Boolean)
    )];

    let professorMap = new Map<string, string>();
    if (professorIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, nome_completo')
        .in('id', professorIds);
      if (profs) {
        profs.forEach(p => {
          const name = p.nome_completo || `${p.first_name} ${p.last_name}`.trim();
          professorMap.set(p.id, name);
        });
      }
    }

    return rows.map(row => {
      const proj = row.projects as any;
      const student = row.profiles as any;
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
        project_title: proj?.title || 'Projeto Desconhecido',
        project_id: row.project_id,
        start_date: proj?.start_date || '',
        end_date: proj?.end_date || '',
        workload_hours: proj?.workload_hours || 0,
        campus: proj?.campus || null,
        professor_name: professorMap.get(proj?.professor_id) || '',
      };
    });
  },

  findByStudentId: async (studentId: string): Promise<CertificateView[]> => {
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
        profiles!certificates_student_id_fkey(first_name, last_name, nome_completo)
      `)
      .eq('student_id', studentId)
      .order('issued_at', { ascending: false });

    if (error) throw new AppError(`Erro ao buscar certificados: ${error.message}`, 500);
    if (!rows) return [];

    const professorIds = [...new Set(
      rows.map(r => (r.projects as any)?.professor_id).filter(Boolean)
    )];

    let professorMap = new Map<string, string>();
    if (professorIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, nome_completo')
        .in('id', professorIds);
      if (profs) {
        profs.forEach(p => {
          const name = p.nome_completo || `${p.first_name} ${p.last_name}`.trim();
          professorMap.set(p.id, name);
        });
      }
    }

    return rows.map(row => {
      const proj = row.projects as any;
      const student = row.profiles as any;
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
        project_title: proj?.title || 'Projeto Desconhecido',
        project_id: row.project_id,
        start_date: proj?.start_date || '',
        end_date: proj?.end_date || '',
        workload_hours: proj?.workload_hours || 0,
        campus: proj?.campus || null,
        professor_name: professorMap.get(proj?.professor_id) || '',
      };
    });
  },

  /** Public validation via RPC - no auth required, returns only public data */
  validatePublic: async (code: string): Promise<PublicCertificateResult> => {
    const { data, error } = await supabase
      .rpc('validate_certificate', { p_code: code });

    if (error) throw new AppError(`Erro na validação: ${error.message}`, 500);
    return data as PublicCertificateResult;
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
    const publicCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    const { data, error } = await supabase
      .from('certificates')
      .insert({
        student_id: payload.student_id,
        project_id: payload.project_id,
        public_code: publicCode,
        codigo_certificado: payload.codigo_certificado,
        status: 'valido',
      })
      .select()
      .single();

    if (error) throw new AppError(`Erro ao criar certificado: ${error.message}`, 500);
    return data as CertificateRow;
  },

  /** Convert CertificateView to frontend Certificado model */
  toCertificado: (view: CertificateView): Certificado => {
    return {
      id: view.id,
      projetoId: view.project_id,
      codigoAutenticacao: view.public_code,
      codigoCertificado: view.codigo_certificado || `CERT-${new Date(view.issued_at).getFullYear()}-000`,
      alunoNome: view.student_name,
      alunoMatricula: view.student_id,
      alunoCpfLast6: '000000',
      projetoNome: view.project_title,
      professorResponsavel: view.professor_name,
      titulacaoProfessor: '',
      cargaHoraria: view.workload_hours,
      dataInicio: view.start_date,
      dataTermino: view.end_date,
      dataEmissao: view.issued_at.split('T')[0],
      unidade: view.campus || '',
      situacao: view.status === 'valido' ? 'Válido' : 'Revogado',
      uuid: view.validation_uuid,
      motivoRevogacao: view.revocation_reason || undefined,
    };
  },
};
