/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuditoriaLog, UserRole, SupabaseAuditLogRow } from '../types';
import { supabase } from '../lib/supabase';

export const auditoriaService = {
  getAuditoriaLogs: async (): Promise<AuditoriaLog[]> => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((log: SupabaseAuditLogRow) => ({
      id: String(log.id),
      usuarioNome: (log.metadata?.actor_name as string) || log.action || '',
      usuarioRole: ((log.metadata?.actor_role as string) || 'admin') as UserRole,
      acao: log.action || '',
      timestamp: log.created_at || '',
      ip: (log.metadata?.ip as string) || '',
    }));
  },

  logAuditoria: async (nome: string, role: UserRole, acao: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('audit_logs').insert({
      actor_id: user?.id || null,
      action: acao,
      entity_type: 'system',
      entity_id: null,
      metadata: {
        actor_name: nome,
        actor_role: role,
      },
    });

    if (error) {
      console.error('Erro ao registrar auditoria:', error);
    }
  },
};
