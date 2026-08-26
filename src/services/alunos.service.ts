/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import { auditoriaService } from './auditoria.service';

interface AlunoVinculado {
  matricula: string;
  nome: string;
  curso: string;
  unidade: string;
  email: string;
  telefone1: string;
  telefone2: string;
  projetosIds: string[];
}

export const alunosService = {
  getAlunosVinculados: async (filters?: {
    search?: string;
    limit?: number;
    projetoId?: string;
    projetosIds?: string[];
  }): Promise<AlunoVinculado[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile) return [];

    if (filters?.projetoId) {
      const { data: links, error } = await supabase
        .from('project_participants')
        .select('student_id')
        .eq('project_id', filters.projetoId);

      if (error || !links || links.length === 0) return [];

      const studentIds = links.map(l => l.student_id);

      let query = supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', studentIds);

      if (filters.search) {
        const s = filters.search.trim();
        query = query.or(`first_name.ilike.%${s}%,last_name.ilike.%${s}%,email.ilike.%${s}%`);
      }

      const limitVal = filters.limit ?? 1000;
      query = query.limit(limitVal);

      const { data, error: profileError } = await query;
      if (profileError || !data) return [];

      return data.map(p => ({
        matricula: p.id,
        nome: `${p.first_name} ${p.last_name}`.trim(),
        curso: '',
        unidade: '',
        email: p.email || '',
        telefone1: '',
        telefone2: '',
        projetosIds: [filters.projetoId!],
      }));
    }

    if (filters?.projetosIds && filters.projetosIds.length > 0) {
      const { data: links, error } = await supabase
        .from('project_participants')
        .select('student_id, project_id')
        .in('project_id', filters.projetosIds);

      if (error || !links || links.length === 0) return [];

      const studentProjectMap = new Map<string, string[]>();
      for (const link of links) {
        const existing = studentProjectMap.get(link.student_id) || [];
        existing.push(link.project_id);
        studentProjectMap.set(link.student_id, existing);
      }

      const studentIds = [...studentProjectMap.keys()];

      let query = supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', studentIds);

      if (filters.search) {
        const s = filters.search.trim();
        query = query.or(`first_name.ilike.%${s}%,last_name.ilike.%${s}%,email.ilike.%${s}%`);
      }

      const limitVal = filters.limit ?? 1000;
      query = query.limit(limitVal);

      const { data, error: profileError } = await query;
      if (profileError || !data) return [];

      return data.map(p => ({
        matricula: p.id,
        nome: `${p.first_name} ${p.last_name}`.trim(),
        curso: '',
        unidade: '',
        email: p.email || '',
        telefone1: '',
        telefone2: '',
        projetosIds: studentProjectMap.get(p.id) || [],
      }));
    }

    let query = supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('role', 'aluno');

    if (filters?.search) {
      const s = filters.search.trim();
      query = query.or(`first_name.ilike.%${s}%,last_name.ilike.%${s}%,email.ilike.%${s}%`);
    }

    const limitVal = filters?.limit ?? 100;
    query = query.limit(limitVal);

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map(p => ({
      matricula: p.id,
      nome: `${p.first_name} ${p.last_name}`.trim(),
      curso: '',
      unidade: '',
      email: p.email || '',
      telefone1: '',
      telefone2: '',
      projetosIds: [],
    }));
  },

  getAlunosStats: async (): Promise<{ totalCount: number; cursosMap: Record<string, number> }> => {
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'aluno');

    if (error) return { totalCount: 0, cursosMap: {} };

    return { totalCount: count || 0, cursosMap: {} };
  },

  cadastrarAlunoManual: async (aluno: {
    matricula: string;
    nome: string;
    curso: string;
    unidade: string;
    email?: string;
    telefone1?: string;
    telefone2?: string;
  }): Promise<void> => {
    const parts = aluno.nome.trim().split(' ');
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const session = await supabase.auth.getSession();

    const response = await fetch(`${supabaseUrl}/functions/v1/create-managed-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${session.data.session?.access_token}`,
      },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        email: aluno.email || `${aluno.matricula}@estudante.uninassau.br`,
        role: 'aluno',
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Erro ao cadastrar aluno');
    }

    await auditoriaService.logAuditoria('Administrativo', 'admin', `Cadastrou aluno ${aluno.nome} manualmente`);
  },

  importarAlunosBaseEmMassa: async (
    alunosList: Array<{ matricula: string; nome: string; curso: string; unidade: string; email?: string; telefone1?: string; telefone2?: string }>,
    onProgress?: (sent: number, total: number) => void
  ): Promise<{ successCount: number; errors: string[] }> => {
    let successCount = 0;
    const errors: string[] = [];
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    if (!token) return { successCount: 0, errors: ['Usuário não autenticado.'] };

    for (let i = 0; i < alunosList.length; i++) {
      const aluno = alunosList[i];
      if (!aluno.matricula || !aluno.nome) {
        errors.push(`Linha ${i + 1}: Matrícula e Nome são obrigatórios.`);
        continue;
      }

      const parts = aluno.nome.trim().split(' ');
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';

      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/create-managed-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            email: aluno.email || `${aluno.matricula}@estudante.uninassau.br`,
            role: 'aluno',
          }),
        });

        if (response.ok) {
          successCount++;
        } else {
          const err = await response.json();
          errors.push(`Aluno ${aluno.nome}: ${err.error || 'Erro desconhecido'}`);
        }
      } catch (err: any) {
        errors.push(`Aluno ${aluno.nome}: ${err.message}`);
      }

      onProgress?.(i + 1, alunosList.length);
    }

    if (successCount > 0) {
      await auditoriaService.logAuditoria('Administrativo', 'admin', `Importou em massa ${successCount} alunos para o diretório`);
    }
    return { successCount, errors };
  },

  vincularAlunoManual: async (vinculo: {
    matricula: string;
    nome: string;
    curso: string;
    cpfLast6: string;
    projetoId: string;
  }): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado.');

    const { data: existing } = await supabase
      .from('project_participants')
      .select('id')
      .eq('project_id', vinculo.projetoId)
      .eq('student_id', vinculo.matricula)
      .limit(1);

    if (existing && existing.length > 0) return;

    const { error } = await supabase
      .from('project_participants')
      .insert({
        project_id: vinculo.projetoId,
        student_id: vinculo.matricula,
        added_by: user.id,
      });

    if (error && !error.message.includes('duplicate')) {
      throw new Error(`Erro ao vincular aluno: ${error.message}`);
    }

    await auditoriaService.logAuditoria('Administrador', 'admin', `Vinculou aluno ${vinculo.nome} ao projeto ID ${vinculo.projetoId}`);
  },

  importarAlunosEmMassa: async (
    alunosList: Array<{ matricula: string; nome: string; curso: string; cpfLast6: string }>,
    projetoId: string
  ): Promise<{ successCount: number; errors: string[] }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { successCount: 0, errors: ['Usuário não autenticado.'] };

    const { data: proj } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projetoId)
      .limit(1);

    if (!proj || proj.length === 0) {
      return { successCount: 0, errors: ['Projeto de destino não encontrado.'] };
    }

    let successCount = 0;
    const errors: string[] = [];
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    if (!token) return { successCount: 0, errors: ['Usuário não autenticado.'] };

    for (let i = 0; i < alunosList.length; i++) {
      const aluno = alunosList[i];
      if (!aluno.matricula || !aluno.nome) {
        errors.push(`Linha ${i + 1}: Dados obrigatórios ausentes.`);
        continue;
      }

      try {
        const parts = aluno.nome.trim().split(' ');
        const firstName = parts[0] || '';
        const lastName = parts.slice(1).join(' ') || '';

        const response = await fetch(`${supabaseUrl}/functions/v1/create-managed-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            email: `${aluno.matricula}@estudante.uninassau.br`,
            role: 'aluno',
            project_id: projetoId,
          }),
        });

        if (response.ok) {
          successCount++;
        } else {
          const err = await response.json();
          errors.push(`Aluno ${aluno.nome}: ${err.error || 'Erro desconhecido'}`);
        }
      } catch (err: any) {
        errors.push(`Aluno ${aluno.nome}: ${err.message}`);
      }
    }

    if (successCount > 0) {
      await auditoriaService.logAuditoria('Administrador', 'admin', `Importou em massa ${successCount} alunos para o projeto ID ${projetoId}`);
    }
    return { successCount, errors };
  },
};
