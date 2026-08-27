/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Unidade, Curso } from '../types';
import { supabase } from '../lib/supabase';
import { auditoriaService } from './auditoria.service';

export const unidadesService = {
  getUnidades: async (): Promise<Unidade[]> => {
    const { data, error } = await supabase
      .from('unidades')
      .select('*')
      .order('nome', { ascending: true });

    if (error || !data) return [];

    return data.map((u: any) => ({
      id: u.id,
      nome: u.nome,
      codigo: u.codigo,
      projetosCount: u.projetos_count || 0,
      responsavel: u.responsavel || '',
    }));
  },

  createUnidade: async (nome: string, codigo: string, responsavel: string): Promise<Unidade> => {
    const { data, error } = await supabase
      .from('unidades')
      .insert({
        nome,
        codigo,
        projetos_count: 0,
        responsavel,
      })
      .select()
      .single();

    if (error) throw new Error(`Erro ao criar unidade: ${error.message}`);

    await auditoriaService.logAuditoria('Administrativo', 'admin', `Cadastrou nova unidade: ${nome}`);

    return {
      id: data.id,
      nome: data.nome,
      codigo: data.codigo,
      projetosCount: data.projetos_count || 0,
      responsavel: data.responsavel || '',
    };
  },

  getCursos: async (): Promise<Curso[]> => {
    const { data: cursos, error: cursosError } = await supabase
      .from('courses')
      .select('*')
      .order('nome', { ascending: true });

    if (cursosError || !cursos) return [];

    return cursos.map((c: any) => ({
      id: c.id,
      nome: c.nome,
      ativo: c.ativo,
      created_at: c.created_at,
      updated_at: c.updated_at,
    }));
  },

  createCurso: async (nome: string): Promise<Curso> => {
    const { data, error } = await supabase
      .from('courses')
      .insert({
        nome,
        ativo: true,
      })
      .select()
      .single();

    if (error) throw new Error(`Erro ao criar curso: ${error.message}`);

    await auditoriaService.logAuditoria('Administrativo', 'admin', `Cadastrou novo curso: ${nome}`);

    return {
      id: data.id,
      nome: data.nome,
      ativo: data.ativo,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  },
};
