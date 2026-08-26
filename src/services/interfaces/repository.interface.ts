/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Projeto, ProjetoStatus, Certificado, Usuario,
  AlunoParticipante, DocumentoComprobatorio, AuditoriaLog, UserRole
} from '../../types';

/**
 * ─── ESPECIFICAÇÃO DE BUCKETS SUPABASE STORAGE ────────────────────────────────
 *
 * 1. Bucket `documentos` (Privado):
 *    - Armazena PDFs comprobatórios de projetos de extensão e IC enviados por professores.
 *    - Acesso de Upload: Professores autenticados.
 *    - Acesso de Leitura: Professores proprietários do projeto e Administradores.
 *
 * 2. Bucket `certificados` (Privado):
 *    - Armazena arquivos PDF finais dos certificados homologados.
 *    - Acesso de Upload: Trigger do banco ou função Admin pós-aprovação.
 *    - Acesso de Leitura: Aluno titular do certificado e Administradores.
 *
 * ─── POLÍTICAS DE RLS (ROW LEVEL SECURITY) RECOMENDADAS ───────────────────────
 *
 * Tabela `projetos`:
 *   - SELECT (Admin): true (visualiza todos os projetos na fila)
 *   - SELECT (Professor): professor_id = auth.uid() OR professor_email = auth.jwt()->>'email'
 *   - SELECT (Aluno): id IN (SELECT projeto_id FROM projeto_alunos WHERE aluno_matricula = auth.jwt()->>'matricula')
 *   - INSERT (Professor): auth.role() IN ('professor', 'admin')
 *   - UPDATE (Professor): (professor_id = auth.uid()) AND (status IN ('rascunho', 'correcao_solicitada'))
 *   - UPDATE (Admin): auth.jwt()->>'role' = 'admin'
 *
 * Tabela `certificados`:
 *   - SELECT (Público): true (permitido por codigo_autenticacao, codigo_certificado ou uuid para validação)
 *   - SELECT (Aluno): aluno_matricula = auth.jwt()->>'matricula'
 *   - INSERT (Admin / System): auth.jwt()->>'role' = 'admin'
 *   - UPDATE (Admin): auth.jwt()->>'role' = 'admin' (para revogação)
 */

export interface IProjetoRepository {
  findAll(): Promise<Projeto[]>;
  findById(id: string): Promise<Projeto | null>;
  findByProfessor(professorEmailOrName: string): Promise<Projeto[]>;
  findByAluno(alunoMatricula: string): Promise<Projeto[]>;
  save(projeto: Partial<Projeto> & { nome: string; professorResponsavel: string }, status?: 'rascunho' | 'enviado'): Promise<Projeto>;
  updateStatus(id: string, status: ProjetoStatus, parecerAdmin?: string): Promise<Projeto>;
}

export interface ICertificadoRepository {
  findAll(): Promise<Certificado[]>;
  findByAluno(alunoMatricula: string): Promise<Certificado[]>;
  findByCodeOrUuid(codeOrUuid: string): Promise<Certificado | null>;
  generateForProject(projeto: Projeto): Promise<Certificado[]>;
  toggleSituacao(id: string, situacao: 'Válido' | 'Revogado'): Promise<Certificado>;
  createAvulso(payload: Omit<Certificado, 'id' | 'codigoAutenticacao' | 'codigoCertificado' | 'uuid' | 'dataEmissao' | 'situacao'>): Promise<Certificado>;
}

export interface IUsuarioRepository {
  findAll(): Promise<Usuario[]>;
  findByRole(role: UserRole): Promise<Usuario[]>;
  create(nome: string, email: string, role: UserRole, unidade?: string): Promise<Usuario>;
}

export interface IAuditoriaRepository {
  log(usuarioNome: string, role: UserRole, acao: string): Promise<AuditoriaLog>;
  findAll(): Promise<AuditoriaLog[]>;
}
