import { supabase } from '../lib/supabase';

export interface Course {
  id: string;
  nome: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export const cursosService = {
  listCourses: async (): Promise<Course[]> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Sessão expirada.');

    const response = await supabase.functions.invoke('admin-manage-courses', {
      body: { action: 'list' },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (response.error) {
      const errData = (response.error as any).context || (response.error as any).data || {};
      throw new Error(errData.error || response.error.message || 'Erro ao listar cursos');
    }

    return response.data.courses || [];
  },

  listActiveCourses: async (): Promise<{ id: string; nome: string }[]> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Sessão expirada.');

    const response = await supabase.functions.invoke('admin-manage-courses', {
      body: { action: 'list_active' },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (response.error) {
      const errData = (response.error as any).context || (response.error as any).data || {};
      throw new Error(errData.error || response.error.message || 'Erro ao listar cursos');
    }

    return response.data.courses || [];
  },

  createCourse: async (nome: string): Promise<Course> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Sessão expirada.');

    const response = await supabase.functions.invoke('admin-manage-courses', {
      body: { action: 'create', nome },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (response.error) {
      const errData = (response.error as any).context || (response.error as any).data || {};
      throw new Error(errData.error || response.error.message || 'Erro ao criar curso');
    }

    return response.data.course;
  },

  updateCourse: async (id: string, data: { nome?: string; ativo?: boolean }): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Sessão expirada.');

    const response = await supabase.functions.invoke('admin-manage-courses', {
      body: { action: 'update', id, ...data },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (response.error) {
      const errData = (response.error as any).context || (response.error as any).data || {};
      throw new Error(errData.error || response.error.message || 'Erro ao atualizar curso');
    }
  },

  deleteCourse: async (id: string): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Sessão expirada.');

    const response = await supabase.functions.invoke('admin-manage-courses', {
      body: { action: 'delete', id },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (response.error) {
      const errData = (response.error as any).context || (response.error as any).data || {};
      throw new Error(errData.error || response.error.message || 'Erro ao excluir curso');
    }
  },
};
