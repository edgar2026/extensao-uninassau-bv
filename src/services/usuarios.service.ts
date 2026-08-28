/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Usuario, AssinaturaDigital, UserRole, UserAccessStatus, SupabaseProfileRow, SupabaseAccessCodeRow, SupabaseAuditLogRow, SupabasePasswordResetRequestRow, SupabaseAssinaturaRow } from '../types';
import { supabase } from '../lib/supabase';
import { auditoriaService } from './auditoria.service';

/**
 * Normaliza string de campus para comparação segura.
 * Remove acentos, prefixo UNINASSAU, espaços extras, converte para maiúsculas.
 * "UNINASSAU Graças" → "GRACAS", "GRAÇAS" → "GRACAS", "Boa Viagem" → "BOA_VIAGEM"
 */
export const normalizeCampus = (value: string): string => {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/UNINASSAU\s*/g, '')
    .trim()
    .replace(/\s+/g, '_');
};

const RPC_STATUS_MAP: Record<string, UserAccessStatus> = {
  archived: 'archived',
  inactive: 'inactive',
  blocked: 'blocked',
  recovery_requested: 'reset_pending',
  new_code_available: 'mandatory_reset',
  waiting_password: 'first_access_pending',
  active: 'access_completed',
  inconsistent: 'inactive',
  not_found: 'inactive',
};

function computeAccessStatus(profile: {
  active: boolean;
  first_access_completed: boolean;
  password_reset_required?: boolean;
  has_active_code: boolean;
  has_blocked_code: boolean;
  has_pending_reset: boolean;
  archived?: boolean;
}): UserAccessStatus {
  if (profile.archived) return 'archived';
  if (!profile.active) return 'inactive';
  if (profile.has_blocked_code) return 'blocked';
  if (profile.has_pending_reset) return 'reset_pending';
  if (profile.password_reset_required) return 'mandatory_reset';
  if (profile.first_access_completed && !profile.has_active_code) return 'access_completed';
  if (profile.has_active_code) return 'active_code';
  return 'first_access_pending';
}

export const usuariosService = {
  getUsuarios: async (): Promise<Usuario[]> => {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('first_name', { ascending: true });

    if (error || !profiles) return [];

    const userIds = profiles.map((p: SupabaseProfileRow) => p.id);

    const { data: codes } = await supabase
      .from('access_codes')
      .select('user_id, purpose, used_at, revoked_at, blocked_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false });

    const codeMap = new Map<string, { has_active: boolean; has_blocked: boolean }>();
    const seen = new Set<string>();

    for (const code of (codes || []) as SupabaseAccessCodeRow[]) {
      const key = `${code.user_id}:${code.purpose}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const isActive = !code.used_at && !code.revoked_at && !code.blocked_at;
      const isBlocked = !!code.blocked_at && !code.used_at && !code.revoked_at;
      codeMap.set(key, { has_active: isActive, has_blocked: isBlocked });
    }

    // Fetch pending reset requests
    const { data: pendingResets } = await supabase
      .from('password_reset_requests')
      .select('user_id, created_at')
      .eq('status', 'pendente')
      .in('user_id', userIds);

    const resetMap = new Map<string, string>();
    for (const req of pendingResets || []) {
      resetMap.set(req.user_id, req.created_at);
    }

    return profiles.map((p: SupabaseProfileRow) => {
      const faCode = codeMap.get(`${p.id}:first_access`);
      const prCode = codeMap.get(`${p.id}:password_reset`);

      const has_active_code = faCode?.has_active || prCode?.has_active || false;
      const has_blocked_code = faCode?.has_blocked || prCode?.has_blocked || false;
      const has_pending_reset = resetMap.has(p.id);

      const accessStatus = computeAccessStatus({
        active: p.active,
        first_access_completed: p.first_access_completed,
        password_reset_required: p.password_reset_required,
        has_active_code,
        has_blocked_code,
        has_pending_reset,
        archived: !!p.archived_at,
      });

      return {
        id: p.id,
        nome: `${p.first_name} ${p.last_name}`.trim(),
        email: p.email,
        role: p.role as UserRole,
        firstName: p.first_name,
        lastName: p.last_name,
        active: p.active,
        archived: !!p.archived_at,
        firstAccessCompleted: p.first_access_completed,
        passwordResetRequired: p.password_reset_required,
        unidade: p.unidade,
        campus: p.campus,
        titulacao: p.titulacao,
        matricula: p.matricula,
        nomeCompleto: p.nome_completo,
        curso: p.curso,
        accessStatus,
        createdAt: p.created_at,
        resetRequestDate: resetMap.get(p.id) || undefined,
      };
    });
  },

  searchUsuarios: async (search?: string, statusFilter?: string): Promise<Usuario[]> => {
    const { data, error } = await supabase.rpc('search_users', {
      p_search: search || null,
      p_status_filter: statusFilter || 'all',
    });

    if (error || !data) return [];

    return (data as Array<{
      id: string;
      first_name: string;
      last_name: string | null;
      email: string;
      role: string;
      active: boolean;
      first_access_completed: boolean;
      password_reset_required: boolean;
      credentials_updated_at: string | null;
      created_at: string;
      campus: string | null;
      matricula: string | null;
      nome_completo: string | null;
      curso: string | null;
      titulacao: string | null;
      status_key: string;
      status_label: string;
    }>).map((row) => ({
      id: row.id,
      nome: row.nome_completo || `${row.first_name} ${row.last_name || ''}`.trim(),
      email: row.email,
      role: row.role as UserRole,
      firstName: row.first_name,
      lastName: row.last_name || undefined,
      active: row.active,
      archived: row.status_key === 'archived',
      firstAccessCompleted: row.first_access_completed,
      passwordResetRequired: row.password_reset_required,
      campus: row.campus as Usuario['campus'],
      matricula: row.matricula,
      nomeCompleto: row.nome_completo,
      curso: row.curso,
      titulacao: row.titulacao as Usuario['titulacao'],
      accessStatus: RPC_STATUS_MAP[row.status_key] || 'inactive',
      createdAt: row.created_at,
    }));
  },

  createUsuario: async (
    nome: string,
    email: string,
    role: UserRole,
    campus: string,
    matricula?: string,
    curso?: string,
    titulacao?: string
  ): Promise<Usuario & { code?: string }> => {
    const parts = nome.trim().split(' ');
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';

    const { data, error } = await supabase.functions.invoke('create-managed-user', {
      body: {
        first_name: firstName,
        last_name: lastName,
        email,
        role,
        campus: campus || null,
        matricula: matricula || null,
        nome_completo: nome.trim(),
        curso: curso || null,
        titulacao: titulacao || null,
      },
    });

    if (error) {
      const errData = (error as any).context || (error as any).data || {};
      throw new Error(errData.error || error.message || 'Erro ao criar usuário');
    }

    if (!data.success) {
      throw new Error(data.error || 'Erro ao criar usuário');
    }

    await auditoriaService.logAuditoria('Administrativo', 'admin', `Cadastrou novo usuário: ${nome} (${role})`);

    return {
      id: data.user_id,
      nome,
      email,
      role,
      firstName,
      lastName,
      active: true,
      firstAccessCompleted: false,
      matricula: matricula || null,
      curso: curso || null,
      code: data.code,
    };
  },

  getAssinaturas: async (): Promise<AssinaturaDigital[]> => {
    const { data, error } = await supabase
      .from('assinaturas')
      .select('*')
      .order('data_cadastro', { ascending: false });

    if (error || !data) return [];

    const result: AssinaturaDigital[] = [];
    for (const a of data as SupabaseAssinaturaRow[]) {
      let signedUrl = a.imagem_url || '';
      if (a.storage_path) {
        const { data: urlData } = await supabase.storage
          .from('certificate-signatures')
          .createSignedUrl(a.storage_path, 3600);
        if (urlData?.signedUrl) signedUrl = urlData.signedUrl;
      }
      result.push({
        id: a.id,
        nome: a.nome,
        cargo: a.cargo,
        unidade: a.unidade,
        arquivoNome: a.arquivo_nome || '',
        imagemUrl: signedUrl,
        storagePath: a.storage_path || '',
        dataCadastro: a.data_cadastro,
        ativo: a.ativo,
      });
    }
    return result;
  },

  getAssinaturaSignedUrl: async (storagePath: string): Promise<string> => {
    if (!storagePath) return '';
    const { data } = await supabase.storage
      .from('certificate-signatures')
      .createSignedUrl(storagePath, 3600);
    return data?.signedUrl || '';
  },

  getAssinaturaByUnidade: async (unidade: string): Promise<AssinaturaDigital | null> => {
    if (!unidade) return null;

    const normalizedUnidade = normalizeCampus(unidade);

    const { data, error } = await supabase
      .from('assinaturas')
      .select('*')
      .eq('ativo', true);

    if (error || !data || data.length === 0) return null;

    const match = data.find((a: SupabaseAssinaturaRow) => normalizeCampus(a.unidade) === normalizedUnidade);
    if (!match) return null;

    let signedUrl = match.imagem_url || '';
    if (match.storage_path) {
      const { data: urlData } = await supabase.storage
        .from('certificate-signatures')
        .createSignedUrl(match.storage_path, 3600);
      if (urlData?.signedUrl) signedUrl = urlData.signedUrl;
    }

    return {
      id: match.id,
      nome: match.nome,
      cargo: match.cargo,
      unidade: match.unidade,
      arquivoNome: match.arquivo_nome || '',
      imagemUrl: signedUrl,
      storagePath: match.storage_path || '',
      dataCadastro: match.data_cadastro,
      ativo: match.ativo,
    };
  },

  createAssinatura: async (
    nome: string,
    cargo: string,
    unidade: string,
    imageFile: File | null
  ): Promise<AssinaturaDigital> => {
    let storagePath: string | null = null;
    let arquivoNome = 'sem_imagem';

    if (imageFile) {
      const ext = imageFile.name.split('.').pop() || 'png';
      const path = `assinaturas/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('certificate-signatures')
        .upload(path, imageFile, { upsert: true, contentType: imageFile.type });

      if (uploadError) throw new Error(`Falha no upload da imagem: ${uploadError.message}`);

      const { data: existsCheck } = await supabase.storage
        .from('certificate-signatures')
        .list('assinaturas', { search: path.split('/').pop() });

      if (!existsCheck || existsCheck.length === 0) {
        throw new Error('Falha ao confirmar upload: arquivo não encontrado no storage.');
      }

      storagePath = path;
      arquivoNome = imageFile.name;
    }

    const { data, error } = await supabase
      .from('assinaturas')
      .insert({
        nome,
        cargo,
        unidade,
        arquivo_nome: arquivoNome,
        imagem_url: null,
        storage_path: storagePath,
        ativo: true,
      })
      .select()
      .single();

    if (error) throw new Error(`Erro ao salvar assinatura: ${error.message}`);

    let signedUrl = '';
    if (storagePath) {
      const { data: urlData } = await supabase.storage
        .from('certificate-signatures')
        .createSignedUrl(storagePath, 3600);
      if (urlData?.signedUrl) signedUrl = urlData.signedUrl;
    }

    await auditoriaService.logAuditoria('Administrativo', 'admin', `Cadastrou diretor/assinatura: ${nome} - ${unidade}`);

    return {
      id: data.id,
      nome: data.nome,
      cargo: data.cargo,
      unidade: data.unidade,
      arquivoNome: data.arquivo_nome || '',
      imagemUrl: signedUrl,
      storagePath: data.storage_path || '',
      dataCadastro: data.data_cadastro,
      ativo: data.ativo,
    };
  },

  updateAssinatura: async (
    id: string,
    nome: string,
    cargo: string,
    unidade: string,
    imageFile: File | null,
    oldStoragePath: string | null
  ): Promise<AssinaturaDigital> => {
    let storagePath: string | null = oldStoragePath;
    let arquivoNome: string | undefined;

    if (imageFile) {
      const ext = imageFile.name.split('.').pop() || 'png';
      const path = `assinaturas/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('certificate-signatures')
        .upload(path, imageFile, { upsert: true, contentType: imageFile.type });

      if (uploadError) throw new Error(`Falha no upload da nova imagem: ${uploadError.message}`);

      const { data: existsCheck } = await supabase.storage
        .from('certificate-signatures')
        .list('assinaturas', { search: path.split('/').pop() });

      if (!existsCheck || existsCheck.length === 0) {
        throw new Error('Falha ao confirmar upload: arquivo não encontrado no storage.');
      }

      storagePath = path;
      arquivoNome = imageFile.name;

      if (oldStoragePath && oldStoragePath !== path) {
        await supabase.storage
          .from('certificate-signatures')
          .remove([oldStoragePath]);
      }
    }

    const updatePayload: Record<string, unknown> = { nome, cargo, unidade };
    if (storagePath !== undefined) updatePayload.storage_path = storagePath;
    if (arquivoNome !== undefined) updatePayload.arquivo_nome = arquivoNome;

    const { data, error } = await supabase
      .from('assinaturas')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar assinatura: ${error.message}`);

    let signedUrl = '';
    if (storagePath) {
      const { data: urlData } = await supabase.storage
        .from('certificate-signatures')
        .createSignedUrl(storagePath, 3600);
      if (urlData?.signedUrl) signedUrl = urlData.signedUrl;
    }

    await auditoriaService.logAuditoria('Administrativo', 'admin', `Atualizou assinatura: ${nome} - ${unidade}`);

    return {
      id: data.id,
      nome: data.nome,
      cargo: data.cargo,
      unidade: data.unidade,
      arquivoNome: data.arquivo_nome || '',
      imagemUrl: signedUrl,
      storagePath: data.storage_path || '',
      dataCadastro: data.data_cadastro,
      ativo: data.ativo,
    };
  },

  deleteAssinatura: async (id: string, storagePath: string | null): Promise<void> => {
    if (storagePath) {
      const { error: storageError } = await supabase.storage
        .from('certificate-signatures')
        .remove([storagePath]);
      if (storageError) {
        console.warn('Aviso: não foi possível remover arquivo do storage:', storageError.message);
      }
    }

    const { error } = await supabase
      .from('assinaturas')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Erro ao excluir assinatura: ${error.message}`);

    await auditoriaService.logAuditoria('Administrativo', 'admin', `Excluiu assinatura id: ${id}`);
  },

  toggleAssinatura: async (id: string, ativo: boolean, unidade: string): Promise<void> => {
    if (ativo) {
      const { data: existing } = await supabase
        .from('assinaturas')
        .select('id')
        .eq('unidade', unidade)
        .eq('ativo', true)
        .neq('id', id);

      if (existing && existing.length > 0) {
        const idsToDeactivate = existing.map(e => e.id);
        await supabase
          .from('assinaturas')
          .update({ ativo: false })
          .in('id', idsToDeactivate);
      }
    }

    const { error } = await supabase
      .from('assinaturas')
      .update({ ativo })
      .eq('id', id);

    if (error) throw new Error(`Erro ao atualizar assinatura: ${error.message}`);

    const acao = ativo ? 'Ativou' : 'Desativou';
    await auditoriaService.logAuditoria('Administrativo', 'admin', `${acao} assinatura id: ${id}`);
  },

  generateAccessCode: async (userId: string, purpose: 'first_access' | 'password_reset' | 'admin_restore'): Promise<{ code: string; created_at: string }> => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const session = await supabase.auth.getSession();

    const response = await fetch(`${supabaseUrl}/functions/v1/admin-generate-access-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${session.data.session?.access_token}`,
      },
      body: JSON.stringify({ target_user_id: userId, purpose }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Erro ao gerar código de acesso');
    }

    await auditoriaService.logAuditoria(
      'Administrativo',
      'admin',
      `Gerou código de ${purpose === 'first_access' ? 'primeiro acesso' : 'redefinição de senha'} para: ${userId}`
    );

    return {
      code: result.code,
      created_at: result.created_at,
    };
  },

  revokeAccessCode: async (userId: string, purpose: 'first_access' | 'password_reset'): Promise<void> => {
    const { error } = await supabase
      .from('access_codes')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('purpose', purpose)
      .is('used_at', null)
      .is('revoked_at', null);

    if (error) throw new Error('Erro ao invalidar código');

    await auditoriaService.logAuditoria(
      'Administrativo',
      'admin',
      `Invalidou código de ${purpose === 'first_access' ? 'primeiro acesso' : 'redefinição de senha'} do usuário ${userId}`
    );
  },

  viewActiveCode: async (userId: string): Promise<{ purpose: string; created_at: string; code: string }> => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const session = await supabase.auth.getSession();

    const response = await fetch(`${supabaseUrl}/functions/v1/admin-view-active-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${session.data.session?.access_token}`,
      },
      body: JSON.stringify({ user_id: userId }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Erro ao consultar código');
    }

    return {
      purpose: result.purpose,
      created_at: result.created_at,
      code: result.code,
    };
  },

  getAlunos: async (): Promise<{
    matricula: string;
    nome_completo: string;
    curso: string;
    email: string;
    campus: string;
    situacao: string;
    primeiro_acesso: string;
    data_cadastro: string;
  }[]> => {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, campus, role, active, first_access_completed, created_at, matricula, nome_completo, curso')
      .eq('role', 'aluno')
      .order('first_name', { ascending: true });

    if (error || !profiles) return [];

    const userIds = profiles.map((p: SupabaseProfileRow) => p.id);

    const { data: codes } = await supabase
      .from('access_codes')
      .select('user_id, purpose, used_at, revoked_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false });

    const codeMap = new Map<string, { has_active: boolean; used: boolean }>();
    const seen = new Set<string>();

    for (const code of (codes || []) as SupabaseAccessCodeRow[]) {
      const key = `${code.user_id}:${code.purpose}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const isActive = !code.used_at && !code.revoked_at;
      const isUsed = !!code.used_at;
      codeMap.set(key, { has_active: isActive, used: isUsed });
    }

    return profiles.map((p: SupabaseProfileRow) => {
      const faCode = codeMap.get(`${p.id}:first_access`);

      let situacao = 'Ativo';
      if (!p.active) situacao = 'Inativo';
      else if (p.first_access_completed) situacao = 'Acesso concluído';
      else if (faCode?.has_active) situacao = 'Aguardando primeiro acesso';
      else if (faCode?.used) situacao = 'Primeiro acesso utilizado';

      let primeiro_acesso = 'Pendente';
      if (p.first_access_completed) primeiro_acesso = 'Concluído';
      else if (faCode?.has_active) primeiro_acesso = 'Código ativo';
      else if (faCode?.used) primeiro_acesso = 'Utilizado';

      return {
        matricula: p.matricula || '',
        nome_completo: p.nome_completo || `${p.first_name} ${p.last_name}`.trim(),
        curso: p.curso || '',
        email: p.email,
        campus: p.campus || '',
        situacao,
        primeiro_acesso,
        data_cadastro: new Date(p.created_at).toLocaleDateString('pt-BR'),
      };
    });
  },

  getImportHistory: async (): Promise<{
    id: number;
    data: string;
    acao: string;
    detalhes: string;
  }[]> => {
    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('id, action, metadata, created_at')
      .in('action', ['bulk_import_students', 'bulk_import_projects', 'create_managed_user', 'reuse_existing_user'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !logs) return [];

    return logs.map((log: SupabaseAuditLogRow) => {
      const meta = log.metadata || {};
      let detalhes = '';

      if (log.action === 'bulk_import_students') {
        detalhes = `Total: ${meta.total_linhas || 0} | Criados: ${meta.criados || 0} | Reutilizados: ${meta.reutilizados || 0} | Erros: ${meta.erros || 0}`;
      } else if (log.action === 'bulk_import_projects') {
        detalhes = `Importação de projetos em lote`;
      } else if (log.action === 'create_managed_user') {
        detalhes = `Usuário criado: ${meta.email || ''} (${meta.role || ''})`;
      } else if (log.action === 'reuse_existing_user') {
        detalhes = `Usuário reutilizado: ${meta.email || ''} (${meta.role || ''})`;
      }

      return {
        id: log.id,
        data: new Date(log.created_at).toLocaleString('pt-BR'),
        acao: log.action,
        detalhes,
      };
    });
  },

  updateUser: async (userId: string, data: { first_name?: string; last_name?: string; campus?: string; role?: string; matricula?: string; nome_completo?: string; curso?: string; titulacao?: string }): Promise<void> => {
    const updates: Record<string, unknown> = {};
    if (data.first_name !== undefined) updates.first_name = data.first_name;
    if (data.last_name !== undefined) updates.last_name = data.last_name;
    if (data.campus !== undefined) updates.campus = data.campus;
    if (data.role !== undefined) updates.role = data.role;
    if (data.matricula !== undefined) updates.matricula = data.matricula;
    if (data.nome_completo !== undefined) updates.nome_completo = data.nome_completo;
    if (data.curso !== undefined) updates.curso = data.curso;
    if (data.titulacao !== undefined) updates.titulacao = data.titulacao;

    const { data: updated, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select('id');

    if (error) throw new Error(`Erro ao atualizar usuário: ${error.message}`);
    if (!updated || updated.length === 0) {
      throw new Error('Não foi possível atualizar o usuário (verifique se o usuário existe ou se sua conta tem permissão).');
    }
  },

  toggleUserActive: async (userId: string, active: boolean): Promise<void> => {
    const { error } = await supabase
      .from('profiles')
      .update({ active })
      .eq('id', userId);

    if (error) throw new Error('Erro ao alterar status do usuário');
  },

  archiveUser: async (userId: string): Promise<void> => {
    const { error } = await supabase
      .from('profiles')
      .update({ active: false, archived_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw new Error('Erro ao arquivar usuário');
  },

  deleteUser: async (userId: string): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Sessão expirada.');

    const response = await supabase.functions.invoke('admin-delete-user', {
      body: { user_id: userId },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (response.error) {
      const errData = response.data || {};
      const err = new Error(errData.message || response.error.message || 'Erro ao excluir usuário');
      (err as any).code = errData.code;
      (err as any).dependencies = errData.dependencies;
      throw err;
    }
  },

  requestPasswordReset: async (email: string): Promise<{ message: string }> => {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/request-password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const result = await response.json();
    return { message: result.message || 'Solicitação registrada.' };
  },

  getPendingResetRequests: async (): Promise<{ id: string; user_id: string; email: string; created_at: string }[]> => {
    const { data: requests, error } = await supabase
      .from('password_reset_requests')
      .select('id, user_id, email_normalized, created_at')
      .eq('status', 'pendente')
      .order('created_at', { ascending: false });

    if (error || !requests) return [];

    return requests.map((r: SupabasePasswordResetRequestRow) => ({
      id: r.id,
      user_id: r.user_id,
      email: r.email_normalized,
      created_at: r.created_at,
    }));
  },
};
