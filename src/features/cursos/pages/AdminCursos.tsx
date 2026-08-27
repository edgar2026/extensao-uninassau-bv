import React, { useState, useEffect, useCallback } from 'react';
import { cursosService, Course } from '../../../services/cursos.service';
import {
  Plus, X, Search, Edit3, Trash2, ToggleLeft, ToggleRight,
  AlertCircle, CheckCircle, GraduationCap
} from 'lucide-react';
import { PortalOverlay } from '../../../components/ui/PortalOverlay';

export const AdminCursos: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editCourse, setEditCourse] = useState<Course | null>(null);
  const [editName, setEditName] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCourse, setDeleteCourse] = useState<Course | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await cursosService.listCourses();
      setCourses(data);
    } catch {
      setError('Não foi possível carregar os cursos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const filteredCourses = courses.filter(c =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = courses.filter(c => c.ativo).length;
  const inactiveCount = courses.filter(c => !c.ativo).length;

  const handleCreate = async () => {
    const nome = newCourseName.trim().toUpperCase();
    if (!nome) { setCreateError('Nome é obrigatório.'); return; }
    setCreateLoading(true);
    setCreateError(null);
    try {
      await cursosService.createCourse(nome);
      setShowCreateModal(false);
      setNewCourseName('');
      await fetchCourses();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Erro ao criar curso.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleToggleActive = async (course: Course) => {
    try {
      await cursosService.updateCourse(course.id, { ativo: !course.ativo });
      await fetchCourses();
    } catch {
      setError('Erro ao alterar status do curso.');
    }
  };

  const handleEdit = (course: Course) => {
    setEditCourse(course);
    setEditName(course.nome);
    setEditError(null);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editCourse) return;
    const nome = editName.trim().toUpperCase();
    if (!nome) { setEditError('Nome é obrigatório.'); return; }
    setEditLoading(true);
    setEditError(null);
    try {
      await cursosService.updateCourse(editCourse.id, { nome });
      setShowEditModal(false);
      setEditCourse(null);
      await fetchCourses();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Erro ao atualizar curso.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = (course: Course) => {
    setDeleteCourse(course);
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteCourse) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await cursosService.deleteCourse(deleteCourse.id);
      setShowDeleteModal(false);
      setDeleteCourse(null);
      await fetchCourses();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir curso.';
      setDeleteError(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Cursos</h2>
          <p className="text-slate-400 text-xs mt-0.5">
            {courses.length} curso(s) cadastrado(s) — {activeCount} ativo(s), {inactiveCount} inativo(s)
          </p>
        </div>
        <button
          onClick={() => { setShowCreateModal(true); setNewCourseName(''); setCreateError(null); }}
          className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/10"
        >
          <Plus className="h-4 w-4" /> Cadastrar Curso
        </button>
      </div>

      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Buscar curso por nome"
          className="w-full bg-slate-50 pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded transition">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 font-semibold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-rose-400 hover:text-rose-600"><X className="h-3 w-3" /></button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3.5">Nome do Curso</th>
                <th className="px-4 py-3.5">Situação</th>
                <th className="px-4 py-3.5">Criado em</th>
                <th className="px-4 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {loading && (
                <tr><td colSpan={4} className="px-4 py-12 text-center">
                  <span className="w-6 h-6 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin inline-block" />
                  <p className="text-slate-400 text-xs mt-2">Carregando cursos...</p>
                </td></tr>
              )}
              {!loading && filteredCourses.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-12 text-center">
                  <GraduationCap className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-400 text-xs font-semibold">
                    {searchTerm ? 'Nenhum curso encontrado para esta busca.' : 'Nenhum curso cadastrado.'}
                  </p>
                </td></tr>
              )}
              {!loading && filteredCourses.map(course => (
                <tr key={course.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-bold text-slate-800">{course.nome}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${course.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {course.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">
                    {new Date(course.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-right flex items-center justify-end gap-1">
                    <button onClick={() => handleToggleActive(course)} className="p-1 rounded transition" title={course.ativo ? 'Desativar' : 'Ativar'}>
                      {course.ativo ? <ToggleRight className="h-4 w-4 text-emerald-600" /> : <ToggleLeft className="h-4 w-4 text-slate-400" />}
                    </button>
                    <button onClick={() => handleEdit(course)} className="text-slate-400 hover:text-slate-600 p-1 rounded transition" title="Editar">
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(course)} className="text-slate-400 hover:text-rose-600 p-1 rounded transition" title="Excluir">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <PortalOverlay onClose={() => { if (!createLoading) { setShowCreateModal(false); setNewCourseName(''); setCreateError(null); } }}>
          <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-200 shadow-2xl flex flex-col gap-5 animate-slide-up">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Cadastrar novo curso</h3>
              {!createLoading && <button onClick={() => { setShowCreateModal(false); setNewCourseName(''); setCreateError(null); }} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-600">Nome do Curso *</label>
              <input
                type="text"
                value={newCourseName}
                onChange={e => setNewCourseName(e.target.value)}
                placeholder="Ex: ENGENHARIA CIVIL"
                className="w-full bg-slate-50 p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 text-xs"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter' && newCourseName.trim()) handleCreate(); }}
              />
            </div>
            {createError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                <p className="text-rose-700 text-xs font-semibold">{createError}</p>
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button onClick={() => { setShowCreateModal(false); setNewCourseName(''); setCreateError(null); }} disabled={createLoading} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl uppercase tracking-wider transition disabled:opacity-50">Cancelar</button>
              <button onClick={handleCreate} disabled={createLoading || !newCourseName.trim()} className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs py-3 rounded-xl uppercase tracking-wider transition disabled:opacity-50 flex items-center justify-center gap-2">
                {createLoading && <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />}
                {createLoading ? 'Cadastrando...' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </PortalOverlay>
      )}

      {showEditModal && editCourse && (
        <PortalOverlay onClose={() => { if (!editLoading) { setShowEditModal(false); setEditCourse(null); setEditError(null); } }}>
          <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-200 shadow-2xl flex flex-col gap-5 animate-slide-up">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-cyan-600" /> Editar Curso
              </h3>
              {!editLoading && <button onClick={() => { setShowEditModal(false); setEditCourse(null); setEditError(null); }} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-600">Nome do Curso *</label>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full bg-slate-50 p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 text-xs"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter' && editName.trim()) handleSaveEdit(); }}
              />
            </div>
            {editError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                <p className="text-rose-700 text-xs font-semibold">{editError}</p>
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button onClick={() => { setShowEditModal(false); setEditCourse(null); setEditError(null); }} disabled={editLoading} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl uppercase tracking-wider transition disabled:opacity-50">Cancelar</button>
              <button onClick={handleSaveEdit} disabled={editLoading || !editName.trim()} className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs py-3 rounded-xl uppercase tracking-wider transition disabled:opacity-50 flex items-center justify-center gap-2">
                {editLoading && <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />}
                {editLoading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </PortalOverlay>
      )}

      {showDeleteModal && deleteCourse && (
        <PortalOverlay onClose={() => { if (!deleteLoading) { setShowDeleteModal(false); setDeleteCourse(null); setDeleteError(null); } }}>
          <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-200 shadow-2xl flex flex-col gap-5 animate-slide-up">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <div className="bg-rose-100 rounded-full p-1"><Trash2 className="h-4 w-4 text-rose-600" /></div>
                Excluir curso
              </h3>
              {!deleteLoading && <button onClick={() => { setShowDeleteModal(false); setDeleteCourse(null); setDeleteError(null); }} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>}
            </div>
            <p className="text-slate-600 text-xs">
              Tem certeza que deseja excluir o curso{' '}
              <span className="font-bold text-slate-900">{deleteCourse.nome}</span>?
            </p>
            {deleteError && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-amber-800 text-xs font-semibold">{deleteError}</p>
                </div>
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button onClick={() => { setShowDeleteModal(false); setDeleteCourse(null); setDeleteError(null); }} disabled={deleteLoading} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl uppercase tracking-wider transition disabled:opacity-50">Cancelar</button>
              <button onClick={handleConfirmDelete} disabled={deleteLoading} className="flex-1 bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs py-3 rounded-xl uppercase tracking-wider transition disabled:opacity-50 flex items-center justify-center gap-2">
                {deleteLoading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {deleteLoading ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </PortalOverlay>
      )}
    </div>
  );
};
