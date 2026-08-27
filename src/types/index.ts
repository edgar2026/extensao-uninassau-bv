/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'professor' | 'aluno';

export type CampusCode = 'GRAÇAS' | 'CAXANGÁ' | 'BOA_VIAGEM';

export const CAMPUS_OPTIONS: { value: CampusCode; label: string; xlsx: string }[] = [
  { value: 'GRAÇAS', label: 'UNINASSAU Graças', xlsx: 'GRACAS' },
  { value: 'CAXANGÁ', label: 'UNINASSAU Caxangá', xlsx: 'CAXANGA' },
  { value: 'BOA_VIAGEM', label: 'UNINASSAU Boa Viagem', xlsx: 'BOA_VIAGEM' },
];

export function normalizeCampus(raw: string): CampusCode | null {
  const normalized = raw
    .trim()
    .toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '');

  if (normalized === 'GRACAS') return 'GRAÇAS';
  if (normalized === 'CAXANGA') return 'CAXANGÁ';
  if (normalized === 'BOAVIAGEM') return 'BOA_VIAGEM';
  return null;
}

export function campusDisplay(campus: CampusCode | null | undefined): string {
  if (!campus) return '';
  return CAMPUS_OPTIONS.find(c => c.value === campus)?.label || campus;
}

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  active: boolean;
  first_access_completed: boolean;
  campus?: CampusCode | null;
  matricula?: string | null;
  nome_completo?: string | null;
  curso?: string | null;
  created_at: string;
  updated_at: string;
}

export type UserAccessStatus =
  | 'first_access_pending'
  | 'active_code'
  | 'reset_pending'
  | 'blocked'
  | 'access_completed'
  | 'mandatory_reset'
  | 'inactive'
  | 'archived';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  active?: boolean;
  archived?: boolean;
  firstAccessCompleted?: boolean;
  passwordResetRequired?: boolean;
  unidade?: string;
  campus?: CampusCode | null;
  matricula?: string | null;
  nomeCompleto?: string | null;
  curso?: string | null;
  accessStatus?: UserAccessStatus;
  createdAt?: string;
  resetRequestDate?: string;
}

export type ProjetoStatus = 'rascunho' | 'enviado' | 'correcao_solicitada' | 'reenviado' | 'aprovado' | 'rejeitado';
export type ProjetoArea = 'Extensão' | 'IC';

export interface AlunoParticipante {
  profileId: string;
  nome: string;
  email: string;
  campus?: CampusCode | null;
  matricula?: string | null;
  curso?: string | null;
  firstAccessCompleted?: boolean;
}

export interface DocumentoComprobatorio {
  id: string;
  nome: string;
  tamanho: string;
  tipo: string;
  storagePath?: string;
  url?: string;
  dataUpload: string;
  version?: number;
  active?: boolean;
  sizeBytes?: number;
}

export interface Projeto {
  id: string;
  nome: string;
  descricao: string;
  professorId?: string;
  professorEmail?: string;
  professorResponsavel: string;
  campus?: CampusCode | null;
  areaTematica: ProjetoArea;
  dataInicio: string;
  dataTermino: string;
  cargaHoraria: number;
  status: ProjetoStatus;
  participantesCount: number;
  alunosParticipantes: AlunoParticipante[];
  documentosComprobatorios: DocumentoComprobatorio[];
  parecerAdmin?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  dataCriacao?: string;
  dataAtualizacao?: string;
}

export type RelatorioStatus =
  | 'Aguardando envio'
  | 'Em análise'
  | 'Correção solicitada'
  | 'Aprovado'
  | 'Reprovado';

export interface Relatorio {
  id: string;
  projetoId: string;
  projetoNome: string;
  alunoId: string;
  alunoNome: string;
  alunoMatricula: string;
  arquivoNome: string;
  arquivoTamanho?: string;
  dataEnvio: string;
  status: RelatorioStatus;
  observacoes?: string;
  feedbackProfessor?: string;
  horasHomologadas?: number;
}

export interface Certificado {
  id: string;
  projetoId?: string;
  codigoAutenticacao: string;
  codigoCertificado: string;
  alunoNome: string;
  alunoMatricula: string;
  alunoCpfLast6: string;
  projetoNome: string;
  professorResponsavel: string;
  titulacaoProfessor: string;
  cargaHoraria: number;
  dataInicio: string;
  dataTermino: string;
  dataEmissao: string;
  unidade: string;
  situacao: 'Válido' | 'Revogado';
  uuid: string;
  motivoRevogacao?: string;
}

/** Supabase `certificates` row (raw DB model) */
export interface CertificateRow {
  id: string;
  project_id: string;
  student_id: string;
  public_code: string;
  validation_uuid: string;
  codigo_certificado: string | null;
  status: 'valido' | 'revogado';
  issued_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
  revocation_reason: string | null;
}

/** Joined view returned by repository queries */
export interface CertificateView {
  id: string;
  public_code: string;
  codigo_certificado: string | null;
  validation_uuid: string;
  status: 'valido' | 'revogado';
  issued_at: string;
  revoked_at: string | null;
  revocation_reason: string | null;
  student_name: string;
  student_id: string;
  project_title: string;
  project_id: string;
  start_date: string;
  end_date: string;
  workload_hours: number;
  campus: CampusCode | null;
  professor_name: string;
}

/** Public certificate validation result (no emails, no internal IDs) */
export interface PublicCertificateResult {
  valid: boolean;
  certificate?: {
    student_name: string;
    project_title: string;
    period: string;
    workload_hours: number;
    campus: CampusCode | null;
    professor_name: string;
    public_code: string;
    codigo_certificado: string | null;
    validation_uuid: string;
    status: 'valido' | 'revogado';
    issued_at: string;
    revoked_at: string | null;
    revocation_reason: string | null;
  };
  error?: string;
}

export interface Unidade {
  id: string;
  nome: string;
  codigo: string;
  projetosCount: number;
  responsavel: string;
}

export interface Curso {
  id: string;
  nome: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssinaturaDigital {
  id: string;
  nome: string;
  cargo: string;
  unidade: string;
  arquivoNome: string;
  imagemUrl?: string;
  storagePath?: string;
  dataCadastro: string;
  ativo: boolean;
}

export interface AuditoriaLog {
  id: string;
  usuarioNome: string;
  usuarioRole: UserRole;
  acao: string;
  timestamp: string;
  ip: string;
}

export interface StudentImportRow {
  linha: number;
  matricula: string;
  nome_completo: string;
  curso: string;
  email: string;
  campus: string;
  resultado: 'criado' | 'reutilizado' | 'ignorado' | 'erro';
  motivo?: string;
  codigo_primeiro_acesso?: string;
}

export interface StudentImportResult {
  success: boolean;
  summary: {
    total_linhas: number;
    validos: number;
    criados: number;
    reutilizados: number;
    ignorados: number;
    erros: number;
    distribuicao_campus: Record<string, number>;
    distribuicao_curso: Record<string, number>;
  };
  students: StudentImportRow[];
  errors: string[];
}

export interface SupabaseProfileRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  active: boolean;
  first_access_completed: boolean;
  password_reset_required: boolean;
  created_at: string;
  updated_at: string;
  campus: CampusCode | null;
  unidade: string | null;
  matricula: string | null;
  nome_completo: string | null;
  curso: string | null;
  archived_at: string | null;
  credentials_updated_at: string | null;
}

export interface SupabaseAccessCodeRow {
  user_id: string;
  purpose: 'first_access' | 'password_reset' | 'admin_restore';
  used_at: string | null;
  revoked_at: string | null;
  blocked_at: string | null;
}

export interface SupabaseAuditLogRow {
  id: number;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SupabasePasswordResetRequestRow {
  id: string;
  user_id: string;
  email_normalized: string;
  status: 'pendente' | 'atendida' | 'cancelada';
  created_at: string;
}

export interface SupabaseAssinaturaRow {
  id: string;
  nome: string;
  cargo: string;
  unidade: string;
  arquivo_nome: string | null;
  imagem_url: string | null;
  storage_path: string | null;
  data_cadastro: string;
  ativo: boolean;
}
