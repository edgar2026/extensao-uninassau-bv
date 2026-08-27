/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Certificado, Relatorio, Projeto } from '../types';
import { supabase } from '../lib/supabase';
import { auditoriaService } from './auditoria.service';
import { certificadosRepository } from './repositories/certificados.repository';
import { AppError, UnauthorizedError } from '../lib/errors';

export const certificadosService = {
  getCertificados: async (): Promise<Certificado[]> => {
    try {
      const views = await certificadosRepository.findAll();
      return views.map(certificadosRepository.toCertificado);
    } catch (err) {
      console.error('Erro ao buscar certificados via Supabase:', err);
      throw err;
    }
  },

  getCertificadosByAluno: async (alunoMatricula: string): Promise<Certificado[]> => {
    try {
      const views = await certificadosRepository.findByStudentId(alunoMatricula);
      return views.map(certificadosRepository.toCertificado);
    } catch (err) {
      console.error('Erro ao buscar certificados do aluno via Supabase:', err);
      throw err;
    }
  },

  validarCertificado: async (codigoOuAutenticacao: string): Promise<Certificado | null> => {
    await new Promise(resolve => setTimeout(resolve, 600));

    try {
      const result = await certificadosRepository.validatePublic(codigoOuAutenticacao);
      if (!result.valid || !result.certificate) return null;

      const c = result.certificate;
      return {
        id: '',
        codigoAutenticacao: c.public_code,
        codigoCertificado: c.codigo_certificado || '',
        alunoNome: c.student_name,
        alunoMatricula: '',
        alunoCpfLast6: '',
        projetoNome: c.project_title,
        professorResponsavel: c.professor_name,
        titulacaoProfessor: '',
        cargaHoraria: c.workload_hours,
        dataInicio: c.period.split(' a ')[0] || '',
        dataTermino: c.period.split(' a ')[1] || '',
        dataEmissao: c.issued_at,
        unidade: c.campus || '',
        situacao: c.status === 'valido' ? 'Válido' : 'Revogado',
        uuid: c.validation_uuid,
        motivoRevogacao: c.revocation_reason || undefined,
      };
    } catch (err) {
      console.error('Erro na validação via Supabase:', err);
      return null;
    }
  },

  toggleCertificadoSituacao: async (id: string, situacao: 'Válido' | 'Revogado'): Promise<Certificado> => {
    if (situacao === 'Revogado') {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new UnauthorizedError();
      await certificadosRepository.revoke(id, 'Revogado pelo administrador', user.id);
    } else {
      await certificadosRepository.unrevoke(id);
    }

    await auditoriaService.logAuditoria('Administrador', 'admin', `Alterou situação do certificado ${id} para ${situacao}`);

    const views = await certificadosRepository.findAll();
    const view = views.find(v => v.id === id);
    if (!view) throw new AppError('Certificado não encontrado após atualização');
    return certificadosRepository.toCertificado(view);
  },

  revogarCertificado: async (id: string, motivo: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    await certificadosRepository.revoke(id, motivo, user.id);
    await auditoriaService.logAuditoria('Administrador', 'admin', `Revogou certificado ${id}. Motivo: ${motivo}`);
  },

  restaurarCertificado: async (id: string): Promise<void> => {
    await certificadosRepository.unrevoke(id);
    await auditoriaService.logAuditoria('Administrador', 'admin', `Restaurou certificado ${id}`);
  },

  gerarCertificadosParaProjeto: async (projeto: Projeto): Promise<Certificado[]> => {
    if (projeto.status !== 'aprovado') {
      throw new AppError('Certificados só podem ser gerados para projetos aprovados.');
    }

    if (!projeto.professorId) {
      throw new AppError('Não foi possível gerar o certificado porque o professor orientador não está definido.');
    }

    const { data: profProfile } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, nome_completo')
      .eq('id', projeto.professorId)
      .single();

    if (!profProfile) {
      throw new AppError('Não foi possível gerar o certificado porque o perfil do professor orientador não foi encontrado.');
    }

    const profName = profProfile.nome_completo || `${profProfile.first_name} ${profProfile.last_name}`.trim();
    if (!profName) {
      throw new AppError('Não foi possível gerar o certificado porque o professor orientador não possui nome cadastrado.');
    }

    const { data, error } = await supabase.rpc('approve_project', { p_project_id: projeto.id });
    if (error) throw new AppError(`Erro ao gerar certificados: ${error.message}`);

    await auditoriaService.logAuditoria('Sistema', 'admin', `Gerou certificados para o projeto: ${projeto.nome}`);
    return [];
  },

  createCertificadoAvulso: async (payload: {
    alunoNome: string;
    alunoMatricula: string;
    alunoCpfLast6: string;
    projetoNome: string;
    professorResponsavel: string;
    titulacaoProfessor: string;
    cargaHoraria: number;
    dataInicio: string;
    dataTermino: string;
    unidade: string;
  }): Promise<Certificado> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    const { data: codeData, error: codeError } = await supabase.rpc('generate_sequential_cert_code');
    if (codeError) throw new AppError(`Erro ao gerar código do certificado: ${codeError.message}`);
    const codigoCert = codeData as string;

    const { data: pubData, error: pubError } = await supabase.rpc('generate_unique_public_code');
    if (pubError) throw new AppError(`Erro ao gerar código de autenticação: ${pubError.message}`);
    const publicCode = pubData as string;

    const { data, error } = await supabase
      .from('certificates')
      .insert({
        student_id: null,
        project_id: null,
        public_code: publicCode,
        codigo_certificado: codigoCert,
        validation_uuid: crypto.randomUUID(),
        status: 'valido',
      })
      .select()
      .single();

    if (error) throw new AppError(`Erro ao emitir certificado: ${error.message}`);

    await auditoriaService.logAuditoria('Administrativo', 'admin', `Emitiu certificado avulso ${codigoCert} para ${payload.alunoNome}`);

    return {
      id: data.id,
      codigoAutenticacao: publicCode,
      codigoCertificado: codigoCert,
      alunoNome: payload.alunoNome,
      alunoMatricula: payload.alunoMatricula,
      alunoCpfLast6: payload.alunoCpfLast6 || '000000',
      projetoNome: payload.projetoNome,
      professorResponsavel: payload.professorResponsavel,
      titulacaoProfessor: payload.titulacaoProfessor,
      cargaHoraria: payload.cargaHoraria,
      dataInicio: payload.dataInicio,
      dataTermino: payload.dataTermino,
      dataEmissao: data.issued_at,
      unidade: payload.unidade,
      situacao: 'Válido',
      uuid: data.validation_uuid,
    };
  },
};
