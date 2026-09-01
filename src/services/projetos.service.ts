/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Projeto, ProjetoStatus, ProjetoArea, AlunoParticipante, DocumentoComprobatorio, CampusCode } from '../types';
import { supabase } from '../lib/supabase';
import { auditoriaService } from './auditoria.service';
import { certificadosService } from './certificados.service';

const DOCUMENTS_BUCKET = 'project-documents';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface ProjectRow {
  id: string;
  professor_id: string;
  title: string;
  description: string;
  category: string;
  campus: string | null;
  workload_hours: number;
  start_date: string;
  end_date: string;
  status: string;
  admin_feedback: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

interface ParticipantRow {
  id: string;
  project_id: string;
  student_id: string;
  added_by: string;
  created_at: string;
  profiles: { first_name: string; last_name: string; email: string; campus: string | null; first_access_completed: boolean } | null;
}

interface DocumentRow {
  id: string;
  project_id: string;
  storage_path: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string;
  created_at: string;
  version: number;
  active: boolean;
}

function mapProjectRow(row: ProjectRow, participants: AlunoParticipante[], documents: DocumentoComprobatorio[]): Projeto {
  return {
    id: row.id,
    nome: row.title,
    descricao: row.description || '',
    professorId: row.professor_id,
    professorEmail: '',
    professorResponsavel: '',
    campus: (row.campus as CampusCode) || null,
    areaTematica: (row.category as ProjetoArea) || 'Extensão',
    dataInicio: row.start_date || '',
    dataTermino: row.end_date || '',
    cargaHoraria: row.workload_hours || 0,
    status: row.status as ProjetoStatus,
    participantesCount: participants.length,
    alunosParticipantes: participants,
    documentosComprobatorios: documents,
    parecerAdmin: row.admin_feedback || undefined,
    reviewedAt: row.reviewed_at || undefined,
    reviewedBy: row.reviewed_by || undefined,
    dataCriacao: row.created_at,
  };
}

async function fetchParticipants(projectId: string): Promise<AlunoParticipante[]> {
  const { data, error } = await supabase
    .from('project_participants')
    .select('id, student_id, profiles:profiles!project_participants_student_id_fkey(first_name, last_name, email, campus, first_access_completed)')
    .eq('project_id', projectId);

  if (error || !data) return [];

  return (data as unknown as ParticipantRow[]).map((p) => ({
    profileId: p.student_id,
    nome: p.profiles ? `${p.profiles.first_name} ${p.profiles.last_name}`.trim() : p.student_id,
    email: p.profiles?.email || '',
    campus: (p.profiles?.campus as CampusCode) || null,
    firstAccessCompleted: p.profiles?.first_access_completed ?? false,
  }));
}

async function fetchDocuments(projectId: string): Promise<DocumentoComprobatorio[]> {
  const { data, error } = await supabase
    .from('project_documents')
    .select('*')
    .eq('project_id', projectId)
    .order('version', { ascending: false });

  if (error || !data) return [];

  return (data as DocumentRow[]).map(d => ({
    id: d.id,
    nome: d.original_name,
    tamanho: `${(d.size_bytes / 1024 / 1024).toFixed(2)} MB`,
    tipo: d.mime_type,
    storagePath: d.storage_path,
    url: d.storage_path,
    dataUpload: d.created_at,
    version: d.version,
    active: d.active,
    sizeBytes: d.size_bytes,
  }));
}

async function fetchProfessorProfile(professorId: string): Promise<{ email: string; nome: string } | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('email, first_name, last_name')
    .eq('id', professorId)
    .single();

  if (error || !data) return null;
  return {
    email: data.email,
    nome: `${data.first_name} ${data.last_name}`.trim(),
  };
}

async function enrichProjectsWithDetails(projects: ProjectRow[]): Promise<Projeto[]> {
  if (projects.length === 0) return [];

  const projectIds = projects.map(p => p.id);

  const [participantsResults, documentsResults] = await Promise.all([
    Promise.all(projectIds.map(id => fetchParticipants(id))),
    Promise.all(projectIds.map(id => fetchDocuments(id))),
  ]);

  const professorIds = [...new Set(projects.map(p => p.professor_id).filter(Boolean))];
  const professorMap = new Map<string, { email: string; nome: string }>();

  if (professorIds.length > 0) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .in('id', professorIds);

    if (profs) {
      for (const p of profs) {
        professorMap.set(p.id, {
          email: p.email,
          nome: `${p.first_name} ${p.last_name}`.trim(),
        });
      }
    }
  }

  return projects.map((row, i) => {
    const projeto = mapProjectRow(row, participantsResults[i], documentsResults[i]);
    const prof = professorMap.get(row.professor_id);
    if (prof) {
      projeto.professorEmail = prof.email;
      projeto.professorResponsavel = prof.nome;
    }
    return projeto;
  });
}

export const projetosService = {
  getProjetos: async (): Promise<Projeto[]> => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('title', { ascending: true });

    if (error || !data) return [];
    return enrichProjectsWithDetails(data as ProjectRow[]);
  },

  getProjetosByProfessor: async (professorEmailOrName: string): Promise<Projeto[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('professor_id', user.id)
      .order('title', { ascending: true });

    if (error || !data) return [];
    return enrichProjectsWithDetails(data as ProjectRow[]);
  },

  getProjetosByAluno: async (alunoMatricula: string): Promise<Projeto[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: links, error: linkError } = await supabase
      .from('project_participants')
      .select('project_id')
      .eq('student_id', user.id);

    if (linkError || !links || links.length === 0) return [];

    const projectIds = links.map(l => l.project_id);

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .in('id', projectIds)
      .order('title', { ascending: true });

    if (error || !data) return [];
    return enrichProjectsWithDetails(data as ProjectRow[]);
  },

  getProjetoById: async (id: string): Promise<Projeto | null> => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    const [participants, documents] = await Promise.all([
      fetchParticipants(id),
      fetchDocuments(id),
    ]);
    const projeto = mapProjectRow(data as ProjectRow, participants, documents);

    const prof = await fetchProfessorProfile(data.professor_id);
    if (prof) {
      projeto.professorEmail = prof.email;
      projeto.professorResponsavel = prof.nome;
    }

    if (data.reviewed_by) {
      const reviewer = await fetchProfessorProfile(data.reviewed_by);
      if (reviewer) {
        projeto.reviewedBy = reviewer.nome;
      }
    }

    return projeto;
  },

  saveProjeto: async (
    projetoData: Partial<Projeto> & { nome: string; professorResponsavel: string },
    submittedStatus?: 'rascunho' | 'enviado' | 'reenviado'
  ): Promise<Projeto> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado.');

    const isEdit = Boolean(projetoData.id);

    if (projetoData.alunosParticipantes) {
      const profileIds = new Set<string>();
      for (const aluno of projetoData.alunosParticipantes) {
        if (profileIds.has(aluno.profileId)) {
          throw new Error(`O aluno "${aluno.nome}" foi adicionado mais de uma vez.`);
        }
        profileIds.add(aluno.profileId);
      }
    }

    if (isEdit) {
      const { data: existing } = await supabase
        .from('projects')
        .select('status')
        .eq('id', projetoData.id!)
        .single();

      if (!existing) throw new Error('Projeto não encontrado para atualização.');
      if (existing.status !== 'rascunho' && existing.status !== 'correcao_solicitada') {
        throw new Error(`Projetos com status '${existing.status}' estão bloqueados para edição.`);
      }

      const nextStatus = submittedStatus || existing.status;

      const updateData: Record<string, unknown> = {
        title: projetoData.nome,
        description: projetoData.descricao || '',
        category: projetoData.areaTematica || 'Extensão',
        campus: projetoData.campus || null,
        workload_hours: Number(projetoData.cargaHoraria) || 40,
        start_date: projetoData.dataInicio || null,
        end_date: projetoData.dataTermino || null,
        status: nextStatus,
      };

      if (submittedStatus === 'enviado') {
        updateData.submitted_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', projetoData.id!);

      if (error) throw new Error(`Erro ao atualizar projeto: ${error.message}`);

      if (projetoData.alunosParticipantes) {
        await supabase
          .from('project_participants')
          .delete()
          .eq('project_id', projetoData.id!);

        if (projetoData.alunosParticipantes.length > 0) {
          const newParticipants = projetoData.alunosParticipantes.map(a => ({
            project_id: projetoData.id!,
            student_id: a.profileId,
            added_by: user.id,
          }));

          await supabase.from('project_participants').insert(newParticipants);
        }
      }

      await auditoriaService.logAuditoria(
        projetoData.professorResponsavel,
        'professor',
        `Atualizou o projeto ${projetoData.nome} (Status: ${nextStatus})`
      );

      return (await projetosService.getProjetoById(projetoData.id!))!;
    }

    const newStatus: ProjetoStatus = submittedStatus || 'rascunho';

    const insertData: Record<string, unknown> = {
      professor_id: user.id,
      title: projetoData.nome,
      description: projetoData.descricao || '',
      category: projetoData.areaTematica || 'Extensão',
      campus: projetoData.campus || null,
      workload_hours: Number(projetoData.cargaHoraria) || 40,
      start_date: projetoData.dataInicio || null,
      end_date: projetoData.dataTermino || null,
      status: newStatus,
    };

    if (submittedStatus === 'enviado') {
      insertData.submitted_at = new Date().toISOString();
    }

    const { data: newProject, error } = await supabase
      .from('projects')
      .insert(insertData)
      .select()
      .single();

    if (error) throw new Error(`Erro ao criar projeto: ${error.message}`);

    if (projetoData.alunosParticipantes && projetoData.alunosParticipantes.length > 0) {
      const participants = projetoData.alunosParticipantes.map(a => ({
        project_id: newProject.id,
        student_id: a.profileId,
        added_by: user.id,
      }));

      await supabase.from('project_participants').insert(participants);
    }

    await auditoriaService.logAuditoria(
      projetoData.professorResponsavel,
      'professor',
      `Cadastrou o projeto ${projetoData.nome} (Status: ${newStatus})`
    );

    return (await projetosService.getProjetoById(newProject.id))!;
  },

  enviarProjeto: async (id: string): Promise<Projeto> => {
    const { data: existing, error: fetchError } = await supabase
      .from('projects')
      .select('status, title')
      .eq('id', id)
      .single();

    if (fetchError || !existing) throw new Error('Projeto não encontrado.');
    if (existing.status !== 'rascunho' && existing.status !== 'correcao_solicitada') {
      throw new Error('Apenas projetos em rascunho ou correção solicitada podem ser enviados.');
    }

    const newStatus: ProjetoStatus = existing.status === 'correcao_solicitada' ? 'reenviado' : 'enviado';

    const { error } = await supabase
      .from('projects')
      .update({
        status: newStatus,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw new Error(`Erro ao enviar projeto: ${error.message}`);

    await auditoriaService.logAuditoria('Professor', 'professor', `Enviou o projeto ${existing.title} para análise (Status: ${newStatus}).`);
    return (await projetosService.getProjetoById(id))!;
  },

  analisarProjeto: async (
    id: string,
    acao: 'aprovar' | 'solicitar_correcao' | 'rejeitar',
    parecerAdmin?: string
  ): Promise<Projeto> => {
    if ((acao === 'solicitar_correcao' || acao === 'rejeitar') && (!parecerAdmin || !parecerAdmin.trim())) {
      throw new Error('É obrigatório fornecer um parecer/justificativa para solicitar correção ou rejeitar o projeto.');
    }

    const { data: { user } } = await supabase.auth.getUser();

    const { data: proj, error: fetchError } = await supabase
      .from('projects')
      .select('title, status')
      .eq('id', id)
      .single();

    if (fetchError || !proj) throw new Error('Projeto não encontrado.');
    if (!['enviado', 'reenviado'].includes(proj.status)) {
      throw new Error(`Apenas projetos com status 'enviado' ou 'reenviado' podem ser analisados. Status atual: ${proj.status}`);
    }

    if (acao === 'aprovar') {
      const { data, error } = await supabase.rpc('approve_project', { p_project_id: id });
      if (error) throw new Error(`Erro ao aprovar projeto: ${error.message}`);
      await auditoriaService.logAuditoria('Administrador', 'admin', `Aprovou o projeto ${proj.title}`);

      // Gerar certificado de orientação do professor (não bloqueia a aprovação se falhar)
      try {
        const projetoAprovado = await projetosService.getProjetoById(id);
        if (projetoAprovado) {
          const certResult = await certificadosService.gerarCertificadoProfessor(projetoAprovado);
          if (certResult.blocked) {
            console.warn(`[Aprovação] Certificado do professor não gerado: ${certResult.blocked}`);
          }
        }
      } catch (certErr) {
        console.error('[Aprovação] Erro ao gerar certificado do professor:', certErr);
      }

      return (await projetosService.getProjetoById(id))!;
    }

    const statusMap: Record<string, ProjetoStatus> = {
      solicitar_correcao: 'correcao_solicitada',
      rejeitar: 'rejeitado',
    };

    const newStatus = statusMap[acao];

    const { error } = await supabase
      .from('projects')
      .update({
        status: newStatus,
        admin_feedback: parecerAdmin ? parecerAdmin.trim() : null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id || null,
      })
      .eq('id', id);

    if (error) throw new Error(`Erro ao atualizar projeto: ${error.message}`);

    await auditoriaService.logAuditoria(
      'Administrador',
      'admin',
      `Analisou o projeto ${proj.title}: Decisão=${newStatus}`
    );

    return (await projetosService.getProjetoById(id))!;
  },

  uploadDocument: async (
    projectId: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<DocumentoComprobatorio> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado.');

    if (file.type !== 'application/pdf') {
      throw new Error('Apenas arquivos PDF são aceitos.');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`O arquivo excede o limite de 5 MB. Tamanho: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    }

    if (file.size === 0) {
      throw new Error('O arquivo está vazio.');
    }

    const { data: project } = await supabase
      .from('projects')
      .select('professor_id')
      .eq('id', projectId)
      .single();

    if (!project) throw new Error('Projeto não encontrado.');

    const storagePath = `${project.professor_id}/${projectId}/${file.name}`;

    onProgress?.(10);

    const { error: uploadError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(storagePath, file, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Erro no upload: ${uploadError.message}`);
    }

    onProgress?.(70);

    const { data: existingDocs } = await supabase
      .from('project_documents')
      .select('id')
      .eq('project_id', projectId)
      .eq('active', true);

    if (existingDocs && existingDocs.length > 0) {
      await supabase
        .from('project_documents')
        .update({ active: false })
        .eq('project_id', projectId)
        .eq('active', true);
    }

    onProgress?.(85);

    const { data: docRow, error: insertError } = await supabase
      .from('project_documents')
      .insert({
        project_id: projectId,
        storage_path: storagePath,
        original_name: file.name,
        mime_type: 'application/pdf',
        size_bytes: file.size,
        uploaded_by: user.id,
        active: true,
      })
      .select()
      .single();

    if (insertError) {
      await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
      throw new Error(`Erro ao registrar documento: ${insertError.message}`);
    }

    onProgress?.(100);

    return {
      id: docRow.id,
      nome: file.name,
      tamanho: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      tipo: 'application/pdf',
      storagePath,
      dataUpload: docRow.created_at,
      version: docRow.version,
      active: docRow.active,
      sizeBytes: file.size,
    };
  },

  deleteDocument: async (documentId: string, storagePath: string): Promise<void> => {
    const { error } = await supabase
      .from('project_documents')
      .delete()
      .eq('id', documentId);

    if (error) throw new Error(`Erro ao remover registro: ${error.message}`);

    await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
  },

  getDocumentSignedUrl: async (storagePath: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(storagePath, 3600);

    if (error) throw new Error(`Erro ao gerar URL: ${error.message}`);
    return data.signedUrl;
  },

  getActiveDocument: async (projectId: string): Promise<DocumentoComprobatorio | null> => {
    const { data, error } = await supabase
      .from('project_documents')
      .select('*')
      .eq('project_id', projectId)
      .eq('active', true)
      .single();

    if (error || !data) return null;

    const doc = data as DocumentRow;
    return {
      id: doc.id,
      nome: doc.original_name,
      tamanho: `${(doc.size_bytes / 1024 / 1024).toFixed(2)} MB`,
      tipo: doc.mime_type,
      storagePath: doc.storage_path,
      dataUpload: doc.created_at,
      version: doc.version,
      active: doc.active,
      sizeBytes: doc.size_bytes,
    };
  },

  deleteProjeto: async (id: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado.');

    const { data: existing, error: fetchError } = await supabase
      .from('projects')
      .select('status, professor_id, title')
      .eq('id', id)
      .single();

    if (fetchError || !existing) throw new Error('Projeto não encontrado.');
    if (existing.professor_id !== user.id) throw new Error('Você não tem permissão para excluir este projeto.');
    if (existing.status !== 'rascunho') {
      throw new Error('Apenas projetos em rascunho podem ser excluídos.');
    }

    const { data: docs } = await supabase
      .from('project_documents')
      .select('storage_path')
      .eq('project_id', id);

    if (docs && docs.length > 0) {
      const paths = docs.map(d => d.storage_path).filter(Boolean);
      if (paths.length > 0) {
        await supabase.storage.from(DOCUMENTS_BUCKET).remove(paths);
      }
    }

    await supabase.from('project_documents').delete().eq('project_id', id);
    await supabase.from('project_participants').delete().eq('project_id', id);

    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (deleteError) throw new Error(`Erro ao excluir projeto: ${deleteError.message}`);

    await auditoriaService.logAuditoria(
      user.email || 'Professor',
      'professor',
      `Excluiu o projeto ${existing.title} (era um rascunho)`
    );
  },
};
