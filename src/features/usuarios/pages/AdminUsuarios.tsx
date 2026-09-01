/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { usuariosService } from '../../../services/usuarios.service';
import { cursosService, Course } from '../../../services/cursos.service';
import { supabase } from '../../../lib/supabase';
import { StudentImportRow, StudentImportResult, Usuario, UserRole, CampusCode, TitulacaoProfessor, TITULACAO_OPTIONS } from '../../../types';

interface CreateUsuarioForm {
  nome: string;
  email: string;
  role: UserRole;
  unidade: CampusCode;
  matricula?: string;
  curso?: string;
  titulacao?: TitulacaoProfessor;
}
import {
  Plus, Trash2, X, KeyRound, Clock, CheckCircle, Copy, AlertCircle,
  Ban, ShieldCheck, UserCheck, RotateCcw, FileSpreadsheet,
  Eye, Edit3, Archive, RefreshCw, Search, Filter, ChevronDown
} from 'lucide-react';
import { PortalOverlay } from '../../../components/ui/PortalOverlay';
import { UserAccessStatus } from '../../../types';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  professor: 'Professor',
  aluno: 'Aluno',
};

const ROLE_CLASSES: Record<string, string> = {
  admin: 'bg-rose-50 text-rose-600',
  professor: 'bg-indigo-50 text-indigo-600',
  aluno: 'bg-emerald-50 text-emerald-600',
};

const STATUS_CONFIG: Record<UserAccessStatus, { label: string; class: string; icon: React.FC<{ className?: string }> }> = {
  first_access_pending: { label: 'Aguardando criação da senha', class: 'bg-amber-50 text-amber-700 border border-amber-200', icon: Clock },
  active_code: { label: 'Acesso ativo', class: 'bg-emerald-50 text-emerald-700 border border-emerald-200', icon: UserCheck },
  reset_pending: { label: 'Recuperação solicitada', class: 'bg-orange-50 text-orange-700 border border-orange-200', icon: RotateCcw },
  mandatory_reset: { label: 'Novo código disponível', class: 'bg-violet-50 text-violet-700 border border-violet-200', icon: KeyRound },
  blocked: { label: 'Código bloqueado', class: 'bg-rose-50 text-rose-700 border border-rose-200', icon: Ban },
  inactive: { label: 'Usuário inativo', class: 'bg-slate-100 text-slate-500 border border-slate-200', icon: Ban },
  archived: { label: 'Usuário arquivado', class: 'bg-slate-100 text-slate-400 border border-slate-200', icon: Archive },
  access_completed: { label: 'Acesso ativo', class: 'bg-emerald-50 text-emerald-700 border border-emerald-200', icon: UserCheck },
};

const PURPOSE_LABELS: Record<string, string> = {
  first_access: 'Primeiro Acesso',
  password_reset: 'Redefinição de Senha',
  admin_restore: 'Restauração de Acesso',
};

export const AdminUsuarios: React.FC = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState<'select' | 'form'>('select');
  const [selectedRole, setSelectedRole] = useState<'aluno' | 'professor' | 'admin' | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeModalData, setCodeModalData] = useState<{ nome: string; email: string; purpose: string; code: string } | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const { register, handleSubmit, reset, watch } = useForm<CreateUsuarioForm>();

  const [isCreating, setIsCreating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Usuario | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteDependencies, setDeleteDependencies] = useState<string[] | null>(null);

  const [showViewCodeModal, setShowViewCodeModal] = useState(false);
  const [viewCodeData, setViewCodeData] = useState<{ nome: string; purpose: string; created_at: string; code: string } | null>(null);
  const [viewCodeLoading, setViewCodeLoading] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editUserData, setEditUserData] = useState<Usuario | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [showResetRequestsModal, setShowResetRequestsModal] = useState(false);
  const [pendingResets, setPendingResets] = useState<{ id: string; user_id: string; email: string; created_at: string }[]>([]);
  const [isLoadingResets, setIsLoadingResets] = useState(false);

  const [activeCourses, setActiveCourses] = useState<{ id: string; nome: string }[]>([]);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUsuarios = useCallback(async (search?: string, status?: string) => {
    setIsSearching(true);
    setSearchError(null);
    try {
      const result = await usuariosService.searchUsuarios(search, status);
      setUsuarios(result);
    } catch {
      setSearchError('Não foi possível consultar os usuários. Tente novamente.');
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  useEffect(() => {
    cursosService.listActiveCourses().then(setActiveCourses).catch(() => {});
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchUsuarios(value || undefined, statusFilter === 'all' ? undefined : statusFilter);
    }, 350);
  }, [statusFilter, fetchUsuarios]);

  const handleSearchEnter = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      fetchUsuarios(searchTerm || undefined, statusFilter === 'all' ? undefined : statusFilter);
    }
  }, [searchTerm, statusFilter, fetchUsuarios]);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    fetchUsuarios(undefined, statusFilter === 'all' ? undefined : statusFilter);
  }, [statusFilter, fetchUsuarios]);

  const handleFilterChange = useCallback((newFilter: string) => {
    setStatusFilter(newFilter);
    fetchUsuarios(searchTerm || undefined, newFilter === 'all' ? undefined : newFilter);
  }, [searchTerm, fetchUsuarios]);

  const onSubmit = async (data: CreateUsuarioForm) => {
    setIsCreating(true);
    setCreateError(null);
    try {
      const result = await usuariosService.createUsuario(
        data.nome,
        data.email,
        data.role,
        data.unidade,
        data.role === 'aluno' ? data.matricula : undefined,
        data.role === 'aluno' ? data.curso : undefined,
        data.role === 'professor' ? data.titulacao : undefined
      );
      setShowCreateModal(false);
      setCreateStep('select');
      setSelectedRole(null);
      reset();

      await fetchUsuarios();

      if (result.code) {
        setCodeModalData({
          nome: result.nome,
          email: result.email,
          purpose: 'first_access',
          code: result.code,
        });
        setShowCodeModal(true);
      }
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Não foi possível criar o usuário.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleGenerateCode = async (user: Pick<Usuario, 'id' | 'nome' | 'email'>, purpose: 'first_access' | 'password_reset' | 'admin_restore') => {
    setCodeLoading(true);
    setCodeError(null);
    try {
      const result = await usuariosService.generateAccessCode(user.id, purpose);
      setCodeModalData({
        nome: user.nome,
        email: user.email,
        purpose,
        code: result.code,
      });
      setShowCodeModal(true);
      await fetchUsuarios();
    } catch (err: unknown) {
      setCodeError(err instanceof Error ? err.message : 'Não foi possível gerar o código.');
    } finally {
      setCodeLoading(false);
    }
  };

  const handleViewCode = async (user: Pick<Usuario, 'id' | 'nome'>) => {
    setViewCodeLoading(true);
    setCodeError(null);
    try {
      const result = await usuariosService.viewActiveCode(user.id);
      setViewCodeData({
        nome: user.nome,
        purpose: result.purpose,
        created_at: result.created_at,
        code: result.code,
      });
      setShowViewCodeModal(true);
    } catch (err: unknown) {
      setCodeError(err instanceof Error ? err.message : 'Nenhum código ativo encontrado.');
    } finally {
      setViewCodeLoading(false);
    }
  };

  const handleRevokeCode = async (userId: string, purpose: 'first_access' | 'password_reset') => {
    setRevokingId(userId);
    try {
      await usuariosService.revokeAccessCode(userId, purpose);
      await fetchUsuarios();
    } catch {
      setCodeError('Não foi possível invalidar o código.');
    } finally {
      setRevokingId(null);
    }
  };

  const handleEditUser = (user: Usuario) => {
    setEditError(null);
    setEditUserData(user);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editUserData) return;
    setEditLoading(true);
    setEditError(null);
    try {
      const nomeCompleto = (editUserData.nomeCompleto || editUserData.nome || '').trim();
      await usuariosService.updateUser(editUserData.id, {
        nome_completo: nomeCompleto || null,
        campus: editUserData.campus,
        role: editUserData.role,
        ...(editUserData.role === 'aluno' ? {
          matricula: editUserData.matricula || null,
          curso: editUserData.curso || null,
        } : {}),
        ...(editUserData.role === 'professor' ? {
          titulacao: editUserData.titulacao || null,
        } : {}),
      });
      setShowEditModal(false);
      setEditUserData(null);
      await fetchUsuarios();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Erro ao atualizar usuário.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleActive = async (user: Pick<Usuario, 'id' | 'active'>) => {
    try {
      await usuariosService.toggleUserActive(user.id, !user.active);
      await fetchUsuarios();
    } catch {
      setCodeError('Erro ao alterar status do usuário.');
    }
  };

  const handleArchive = async (user: Pick<Usuario, 'id'>) => {
    try {
      await usuariosService.archiveUser(user.id);
      await fetchUsuarios();
    } catch {
      setCodeError('Erro ao arquivar usuário.');
    }
  };

  const handleDelete = (user: Usuario) => {
    setDeleteTarget(user);
    setDeleteConfirmText('');
    setDeleteError(null);
    setDeleteDependencies(null);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || deleteConfirmText !== 'EXCLUIR') return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await usuariosService.deleteUser(deleteTarget.id);
      setShowDeleteModal(false);
      setDeleteTarget(null);
      await fetchUsuarios();
    } catch (err: unknown) {
      const e = err as any;
      if (e?.code === 'USER_HAS_DEPENDENCIES' && e?.dependencies) {
        setDeleteDependencies(e.dependencies);
        setDeleteError(e.message || 'Este usuário possui vínculos e não pode ser excluído.');
      } else {
        setDeleteError(e?.message || 'Erro ao excluir usuário.');
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleArchiveFromDeleteModal = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await usuariosService.archiveUser(deleteTarget.id);
      setShowDeleteModal(false);
      setDeleteTarget(null);
      await fetchUsuarios();
    } catch {
      setDeleteError('Erro ao arquivar usuário.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleShowResetRequests = async () => {
    setIsLoadingResets(true);
    setShowResetRequestsModal(true);
    try {
      const requests = await usuariosService.getPendingResetRequests();
      setPendingResets(requests);
    } catch {
      setCodeError('Erro ao carregar solicitações.');
    } finally {
      setIsLoadingResets(false);
    }
  };

  const handleRestoreFromReset = async (userId: string) => {
    try {
      await handleGenerateCode({ id: userId, nome: '', email: '' }, 'admin_restore');
      setShowResetRequestsModal(false);
      await fetchUsuarios();
    } catch {
      setCodeError('Erro ao restaurar acesso.');
    }
  };

  const copyCode = async () => {
    if (viewCodeData?.code) {
      await navigator.clipboard.writeText(viewCodeData.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportStudents = async () => {
    setIsExporting(true);
    try {
      const students = await usuariosService.getAlunos();
      const { exportStudentsXlsx } = await import('../utils/studentImportUtils');
      exportStudentsXlsx(students);
    } catch {
      setCodeError('Erro ao exportar alunos.');
    } finally {
      setIsExporting(false);
    }
  };

  const pendingResetCount = usuarios.filter(u => u.accessStatus === 'reset_pending').length;

  const getActions = (user: Usuario) => {
    const status = user.accessStatus as UserAccessStatus;
    const actions: React.ReactNode[] = [];

    // View code
    if (status === 'active_code' || status === 'first_access_pending' || status === 'reset_pending') {
      actions.push(
        <button
          key="view-code"
          onClick={() => handleViewCode(user)}
          disabled={viewCodeLoading}
          className="text-cyan-600 hover:text-cyan-700 p-1 rounded transition"
          title="Visualizar código ativo"
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
      );
    }

    // Generate new code
    if (status === 'first_access_pending') {
      actions.push(
        <button
          key="gen-fa"
          onClick={() => handleGenerateCode(user, 'first_access')}
          disabled={codeLoading}
          className="text-amber-600 hover:text-amber-700 p-1 rounded transition"
          title="Gerar código de primeiro acesso"
        >
          <KeyRound className="h-3.5 w-3.5" />
        </button>
      );
    }

    if (status === 'access_completed' || status === 'mandatory_reset' || status === 'reset_pending') {
      actions.push(
        <button
          key="gen-pr"
          onClick={() => handleGenerateCode(user, 'password_reset')}
          disabled={codeLoading}
          className="text-cyan-600 hover:text-cyan-700 p-1 rounded transition"
          title="Gerar código de redefinição"
        >
          <KeyRound className="h-3.5 w-3.5" />
        </button>
      );
    }

    // Revoke code
    if (status === 'active_code') {
      actions.push(
        <button
          key="revoke"
          onClick={() => handleRevokeCode(user.id, 'first_access')}
          disabled={revokingId === user.id}
          className="text-orange-600 hover:text-orange-700 p-1 rounded transition"
          title="Invalidar código"
        >
          <Ban className="h-3.5 w-3.5" />
        </button>
      );
    }

    // Edit
    actions.push(
      <button
        key="edit"
        onClick={() => handleEditUser(user)}
        className="text-slate-400 hover:text-slate-600 p-1 rounded transition"
        title="Editar"
      >
        <Edit3 className="h-3.5 w-3.5" />
      </button>
    );

    // Toggle active/inactive
    if (status !== 'archived') {
      actions.push(
        <button
          key="toggle"
          onClick={() => handleToggleActive(user)}
          className={`p-1 rounded transition ${user.active ? 'text-slate-400 hover:text-amber-600' : 'text-slate-400 hover:text-emerald-600'}`}
          title={user.active ? 'Desativar' : 'Ativar'}
        >
          {user.active ? <Ban className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
        </button>
      );
    }

    // Archive
    if (status !== 'archived' && user.active) {
      actions.push(
        <button
          key="archive"
          onClick={() => handleArchive(user)}
          className="text-slate-400 hover:text-slate-600 p-1 rounded transition"
          title="Arquivar"
        >
          <Archive className="h-3.5 w-3.5" />
        </button>
      );
    }

    // Delete
    actions.push(
      <button
        key="delete"
        onClick={() => handleDelete(user)}
        className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
        title="Excluir"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    );

    return actions;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Usuários do Sistema</h2>
          <p className="text-slate-400 text-xs mt-0.5">Gerencie credenciais, importações em massa e primeiro acesso.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pendingResetCount > 0 && (
            <button
              onClick={handleShowResetRequests}
              className="bg-orange-50 hover:bg-orange-100 text-orange-700 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-orange-200"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Recuperações ({pendingResetCount})
            </button>
          )}
          <button
            onClick={handleExportStudents}
            disabled={isExporting}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <span className="w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <FileSpreadsheet className="h-3.5 w-3.5" />
            )}
            Exportar Alunos
          </button>
          <button
            onClick={() => { setShowCreateModal(true); setCreateStep('select'); setSelectedRole(null); setCreateError(null); reset(); }}
            className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/10"
          >
            <Plus className="h-4 w-4" /> Cadastrar Usuário
          </button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Search input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={handleSearchEnter}
            placeholder="Buscar por nome, matrícula, e-mail ou curso"
            className="w-full bg-slate-50 pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition"
          />
          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded transition"
              title="Limpar busca"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {isSearching && (
            <div className="absolute right-8 top-1/2 -translate-y-1/2">
              <span className="w-3.5 h-3.5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin block" />
            </div>
          )}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs font-semibold text-slate-500">Filtrar:</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => handleFilterChange('all')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Todos ({usuarios.length})
            </button>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
              const count = usuarios.filter(u => u.accessStatus === key).length;
              if (count === 0) return null;
              return (
                <button
                  key={key}
                  onClick={() => handleFilterChange(key)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${statusFilter === key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {cfg.label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm w-full">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs" style={{ minWidth: '1400px' }}>
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3.5 align-middle whitespace-nowrap">Nome completo</th>
                <th className="px-4 py-3.5 align-middle whitespace-nowrap">Matrícula</th>
                <th className="px-4 py-3.5 align-middle whitespace-nowrap">Curso</th>
                <th className="px-4 py-3.5 align-middle whitespace-nowrap">Titulação</th>
                <th className="px-4 py-3.5 align-middle whitespace-nowrap">E-mail</th>
                <th className="px-4 py-3.5 align-middle whitespace-nowrap">Perfil</th>
                <th className="px-4 py-3.5 align-middle whitespace-nowrap">Campus</th>
                <th className="px-4 py-3.5 align-middle whitespace-nowrap">Situação</th>
                <th className="px-4 py-3.5 align-middle whitespace-nowrap">Situação de Acesso</th>
                <th className="px-4 py-3.5 align-middle whitespace-nowrap">Data de Cadastro</th>
                <th className="px-4 py-3.5 text-right align-middle whitespace-nowrap sticky right-0 bg-slate-50 z-10 min-w-[180px] group-hover:bg-slate-100/75">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {isSearching && usuarios.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center align-middle">
                    <span className="w-6 h-6 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin inline-block" />
                    <p className="text-slate-400 text-xs mt-2">Carregando usuários...</p>
                  </td>
                </tr>
              )}
              {!isSearching && searchError && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center align-middle">
                    <AlertCircle className="h-8 w-8 text-rose-400 mx-auto mb-2" />
                    <p className="text-rose-600 text-xs font-semibold">{searchError}</p>
                    <button
                      onClick={handleClearSearch}
                      className="mt-3 text-cyan-600 hover:text-cyan-700 text-xs font-bold underline"
                    >
                      Limpar busca e filtros
                    </button>
                  </td>
                </tr>
              )}
              {!isSearching && !searchError && usuarios.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center align-middle">
                    <Search className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-400 text-xs font-semibold">Nenhum usuário encontrado para os filtros informados.</p>
                    <button
                      onClick={handleClearSearch}
                      className="mt-3 text-cyan-600 hover:text-cyan-700 text-xs font-bold underline"
                    >
                      Limpar busca e filtros
                    </button>
                  </td>
                </tr>
              )}
              {!isSearching && !searchError && usuarios.map(user => {
                const statusCfg = user.accessStatus ? STATUS_CONFIG[user.accessStatus] : null;
                const StatusIcon = statusCfg?.icon || Clock;
                return (
                  <tr key={user.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-800 align-middle whitespace-nowrap">{user.nomeCompleto || user.nome}</td>
                    <td className="px-4 py-3 text-[11px] font-mono align-middle whitespace-nowrap">
                      {user.role === 'aluno'
                        ? (user.matricula || <span className="text-amber-600 italic">Cadastro incompleto</span>)
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-[11px] align-middle whitespace-nowrap">
                      {user.role === 'aluno'
                        ? (user.curso || <span className="text-amber-600 italic">Cadastro incompleto</span>)
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-[11px] align-middle whitespace-nowrap">
                      {user.role === 'professor'
                        ? (user.titulacao || <span className="text-amber-600 italic">Cadastro incompleto</span>)
                        : '-'}
                    </td>
                    <td className="px-4 py-3 align-middle whitespace-nowrap">{user.email}</td>
                    <td className="px-4 py-3 align-middle whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${ROLE_CLASSES[user.role] || 'bg-slate-100 text-slate-500'}`}>
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] align-middle whitespace-nowrap">{user.campus || '-'}</td>
                    <td className="px-4 py-3 align-middle whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${user.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {user.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle whitespace-nowrap">
                      {statusCfg && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 w-fit ${statusCfg.class}`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusCfg.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500 align-middle whitespace-nowrap">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-4 py-3 text-right align-middle whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 z-10">
                      <div className="flex items-center justify-end gap-1">
                        {getActions(user)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Error toast */}
      {codeError && (
        <div className="fixed bottom-4 right-4 bg-rose-50 border border-rose-200 rounded-xl p-4 shadow-lg flex items-center gap-2 z-50">
          <AlertCircle className="h-4 w-4 text-rose-600" />
          <span className="text-rose-700 text-xs font-medium">{codeError}</span>
          <button onClick={() => setCodeError(null)} className="text-rose-400 hover:text-rose-600 ml-2">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Delete User Modal */}
      {showDeleteModal && deleteTarget && (
        <PortalOverlay onClose={() => { if (!deleteLoading) { setShowDeleteModal(false); setDeleteTarget(null); } }}>
          <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-200 shadow-2xl flex flex-col gap-5 animate-slide-up">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <div className="bg-rose-100 rounded-full p-1">
                  <Trash2 className="h-4 w-4 text-rose-600" />
                </div>
                Excluir usuário
              </h3>
              {!deleteLoading && (
                <button onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {deleteDependencies ? (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-amber-800 text-xs font-semibold">Este usuário possui vínculos no sistema e não pode ser excluído definitivamente.</p>
                      <ul className="mt-2 space-y-0.5">
                        {deleteDependencies.map((dep, i) => (
                          <li key={i} className="text-amber-700 text-[11px]">• {dep}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-600 text-xs">
                    <span className="font-semibold w-20">Nome:</span>
                    <span className="text-slate-800">{deleteTarget.nomeCompleto || deleteTarget.nome}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 text-xs">
                    <span className="font-semibold w-20">E-mail:</span>
                    <span className="text-slate-800">{deleteTarget.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 text-xs">
                    <span className="font-semibold w-20">Perfil:</span>
                    <span className="text-slate-800">{ROLE_LABELS[deleteTarget.role] || deleteTarget.role}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); setDeleteDependencies(null); }}
                    disabled={deleteLoading}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl uppercase tracking-wider transition disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleArchiveFromDeleteModal}
                    disabled={deleteLoading}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs py-3 rounded-xl uppercase tracking-wider transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {deleteLoading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {deleteLoading ? 'Arquivando...' : 'Arquivar usuário'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-slate-600 text-xs">
                  Esta ação excluirá permanentemente o cadastro de{' '}
                  <span className="font-bold text-slate-900">{deleteTarget.nomeCompleto || deleteTarget.nome}</span>.
                </p>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-600 text-xs">
                    <span className="font-semibold w-20">Nome:</span>
                    <span className="text-slate-800">{deleteTarget.nomeCompleto || deleteTarget.nome}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 text-xs">
                    <span className="font-semibold w-20">E-mail:</span>
                    <span className="text-slate-800">{deleteTarget.email}</span>
                  </div>
                  {deleteTarget.matricula && (
                    <div className="flex items-center gap-2 text-slate-600 text-xs">
                      <span className="font-semibold w-20">Matrícula:</span>
                      <span className="text-slate-800 font-mono">{deleteTarget.matricula}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-slate-600 text-xs">
                    <span className="font-semibold w-20">Perfil:</span>
                    <span className="text-slate-800">{ROLE_LABELS[deleteTarget.role] || deleteTarget.role}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 text-xs">
                    <span className="font-semibold w-20">Campus:</span>
                    <span className="text-slate-800">{deleteTarget.campus || '—'}</span>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-amber-800 text-[11px] leading-relaxed">
                    Usuários que possuem projetos, participações, certificados ou histórico não podem ser excluídos definitivamente.
                    Nesses casos, o cadastro deverá ser arquivado.
                  </p>
                </div>

                {deleteError && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                    <p className="text-rose-700 text-xs font-semibold">{deleteError}</p>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Digite <span className="font-mono font-bold text-rose-600">EXCLUIR</span> para confirmar
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    disabled={deleteLoading}
                    placeholder="EXCLUIR"
                    className="w-full bg-slate-50 p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 text-xs font-mono tracking-wider transition disabled:opacity-50"
                    onKeyDown={(e) => { if (e.key === 'Enter' && deleteConfirmText === 'EXCLUIR') handleConfirmDelete(); }}
                    autoFocus
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }}
                    disabled={deleteLoading}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl uppercase tracking-wider transition disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    disabled={deleteLoading || deleteConfirmText !== 'EXCLUIR'}
                    className="flex-1 bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs py-3 rounded-xl uppercase tracking-wider transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {deleteLoading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {deleteLoading ? 'Excluindo...' : 'Excluir definitivamente'}
                  </button>
                </div>
              </>
            )}
          </div>
        </PortalOverlay>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <PortalOverlay onClose={() => { setShowCreateModal(false); setCreateStep('select'); setSelectedRole(null); setCreateError(null); }}>
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-2xl flex flex-col gap-5 animate-slide-up" style={{ width: 'calc(100vw - 32px)', maxWidth: '560px' }}>
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                {createStep === 'select' ? 'Qual tipo de usuário deseja cadastrar?' : `Cadastrar novo ${selectedRole === 'aluno' ? 'aluno' : selectedRole === 'professor' ? 'professor' : 'administrador'}`}
              </h3>
              <button onClick={() => { setShowCreateModal(false); setCreateStep('select'); setSelectedRole(null); setCreateError(null); }} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>

            {createStep === 'select' && (
              <div className="flex flex-col gap-3">
                <p className="text-slate-500 text-xs">Selecione o perfil para continuar:</p>
                <button
                  onClick={() => { setSelectedRole('aluno'); setCreateStep('form'); setCreateError(null); reset(); }}
                  className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition text-left"
                >
                  <div className="bg-emerald-100 rounded-full p-2">
                    <UserCheck className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-xs">Aluno</p>
                    <p className="text-slate-400 text-[10px]">Matrícula, nome, curso, e-mail e campus</p>
                  </div>
                </button>
                <button
                  onClick={() => { setSelectedRole('professor'); setCreateStep('form'); setCreateError(null); reset(); }}
                  className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition text-left"
                >
                  <div className="bg-indigo-100 rounded-full p-2">
                    <ShieldCheck className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-xs">Professor</p>
                    <p className="text-slate-400 text-[10px]">Nome, e-mail e campus</p>
                  </div>
                </button>
                <button
                  onClick={() => { setSelectedRole('admin'); setCreateStep('form'); setCreateError(null); reset(); }}
                  className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-rose-400 hover:bg-rose-50/50 transition text-left"
                >
                  <div className="bg-rose-100 rounded-full p-2">
                    <ShieldCheck className="h-4 w-4 text-rose-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-xs">Administrador</p>
                    <p className="text-slate-400 text-[10px]">Nome, e-mail e campus</p>
                  </div>
                </button>
              </div>
            )}

            {createStep === 'form' && selectedRole && (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
                {selectedRole === 'aluno' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-slate-600">Matrícula *</label>
                    <input type="text" placeholder="Ex: 2024001001" {...register('matricula', { required: true })} className="w-full bg-slate-50 p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 font-mono" />
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-600">Nome Completo *</label>
                  <input type="text" placeholder="Nome completo do usuário" {...register('nome', { required: true })} className="w-full bg-slate-50 p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500" />
                </div>
                {selectedRole === 'aluno' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-slate-600">Curso *</label>
                    <select {...register('curso', { required: true })} className="w-full bg-slate-50 p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 text-xs">
                      <option value="">Selecione o curso</option>
                      {activeCourses.map(c => (
                        <option key={c.id} value={c.nome}>{c.nome}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-600">E-mail Institucional *</label>
                  <input type="email" placeholder="usuario@uninassau.br" {...register('email', { required: true })} className="w-full bg-slate-50 p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500" />
                </div>
                {selectedRole === 'professor' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-slate-600">Titulação *</label>
                    <select {...register('titulacao', { required: true })} className="w-full bg-slate-50 p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 text-xs">
                      <option value="">Selecione a titulação</option>
                      {TITULACAO_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-600">Campus *</label>
                  <select {...register('unidade', { required: true })} className="w-full bg-slate-50 p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500">
                    <option value="GRAÇAS">UNINASSAU Graças</option>
                    <option value="CAXANGÁ">UNINASSAU Caxangá</option>
                    <option value="BOA_VIAGEM">UNINASSAU Boa Viagem</option>
                  </select>
                </div>

                {createError && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                    <p className="text-rose-700 text-xs font-semibold">{createError}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => { setCreateStep('select'); setSelectedRole(null); setCreateError(null); reset(); }}
                    disabled={isCreating}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl uppercase tracking-wider transition disabled:opacity-50"
                  >
                    Voltar
                  </button>
                  <button type="submit" disabled={isCreating} className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs py-3 rounded-xl uppercase tracking-wider transition disabled:opacity-50 flex items-center justify-center gap-2">
                    {isCreating && <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />}
                    {isCreating ? 'Cadastrando...' : 'Cadastrar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </PortalOverlay>
      )}

      {/* View Code Modal */}
      {showViewCodeModal && viewCodeData && (
        <PortalOverlay onClose={() => { setShowViewCodeModal(false); setViewCodeData(null); setCopied(false); }}>
          <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-200 shadow-2xl flex flex-col gap-5 animate-slide-up">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <div className="bg-cyan-100 rounded-full p-1">
                  <Eye className="h-4 w-4 text-cyan-600" />
                </div>
                Código Ativo
              </h3>
              <button onClick={() => { setShowViewCodeModal(false); setViewCodeData(null); setCopied(false); }} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-slate-600 text-xs">
                  <span className="font-semibold w-24">Usuário:</span>
                  <span className="text-slate-800">{viewCodeData.nome}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 text-xs">
                  <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-semibold">Finalidade:</span>
                  <span className="text-slate-800">{PURPOSE_LABELS[viewCodeData.purpose] || viewCodeData.purpose}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 text-xs">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-semibold">Criado em:</span>
                  <span className="text-slate-800">{new Date(viewCodeData.created_at).toLocaleString('pt-BR')}</span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-amber-800 text-xs font-semibold">Este código é de uso único.</p>
                    <p className="text-amber-600 text-[11px] mt-1">
                      Gerar outro código invalidará este automaticamente.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-slate-500 text-[10px] font-semibold uppercase mb-2">Código de acesso</p>
                <div className="flex items-center gap-2">
                  <code className="text-xl font-mono font-bold text-slate-900 tracking-wider select-all bg-white px-3 py-2 rounded-lg border border-slate-200 flex-1 text-center">
                    {viewCodeData.code}
                  </code>
                  <button
                    onClick={copyCode}
                    className="shrink-0 bg-cyan-500 hover:bg-cyan-400 text-slate-950 p-2 rounded-lg transition flex items-center gap-1 text-xs font-semibold"
                    title="Copiar código"
                  >
                    {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>

              <button
                onClick={() => { setShowViewCodeModal(false); setViewCodeData(null); setCopied(false); }}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 rounded-xl uppercase tracking-wider transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </PortalOverlay>
      )}

      {/* Code Modal (after creation/generation) */}
      {showCodeModal && codeModalData && (
        <PortalOverlay onClose={() => { setShowCodeModal(false); setCodeModalData(null); setCopied(false); }}>
          <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-200 shadow-2xl flex flex-col gap-5 animate-slide-up">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <div className="bg-emerald-100 rounded-full p-1">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                </div>
                Código gerado com sucesso
              </h3>
              <button onClick={() => { setShowCodeModal(false); setCodeModalData(null); setCopied(false); }} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-slate-600 text-xs">
                  <span className="font-semibold w-24">Usuário:</span>
                  <span className="text-slate-800">{codeModalData.nome}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 text-xs">
                  <span className="font-semibold w-24">E-mail:</span>
                  <span className="text-slate-800">{codeModalData.email}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 text-xs">
                  <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-semibold">Finalidade:</span>
                  <span className="text-slate-800">{PURPOSE_LABELS[codeModalData.purpose]}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 text-xs">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-semibold">Validade:</span>
                  <span className="text-slate-800">Válido até o primeiro uso</span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-amber-800 text-xs font-semibold">Este código será exibido apenas esta vez.</p>
                    <p className="text-amber-600 text-[11px] mt-1">
                      Anote ou copie o código abaixo e envie ao usuário por canal seguro.
                      Gerar outro código invalidará este automaticamente.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-slate-500 text-[10px] font-semibold uppercase mb-2">Código de acesso</p>
                <div className="flex items-center gap-2">
                  <code className="text-xl font-mono font-bold text-slate-900 tracking-wider select-all bg-white px-3 py-2 rounded-lg border border-slate-200 flex-1 text-center">
                    {codeModalData.code}
                  </code>
                  <button
                    onClick={async () => {
                      if (codeModalData?.code) {
                        await navigator.clipboard.writeText(codeModalData.code);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }
                    }}
                    className="shrink-0 bg-cyan-500 hover:bg-cyan-400 text-slate-950 p-2 rounded-lg transition flex items-center gap-1 text-xs font-semibold"
                    title="Copiar código"
                  >
                    {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>

              <button
                onClick={() => { setShowCodeModal(false); setCodeModalData(null); setCopied(false); }}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 rounded-xl uppercase tracking-wider transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </PortalOverlay>
      )}

      {/* Edit User Modal */}
      {showEditModal && editUserData && (
        <PortalOverlay onClose={() => { setShowEditModal(false); setEditUserData(null); }}>
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-2xl flex flex-col gap-5 animate-slide-up" style={{ width: 'calc(100vw - 32px)', maxWidth: '560px' }}>
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-cyan-600" />
                Editar Usuário
              </h3>
              <button onClick={() => { setShowEditModal(false); setEditUserData(null); }} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-600">Nome Completo</label>
                <input
                  type="text"
                  value={editUserData.nomeCompleto || editUserData.nome || ''}
                  onChange={e => setEditUserData({ ...editUserData, nomeCompleto: e.target.value })}
                  className="w-full bg-slate-50 p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500"
                />
              </div>
              {editUserData.role === 'aluno' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-slate-600">Matrícula</label>
                    <input
                      type="text"
                      value={editUserData.matricula || ''}
                      onChange={e => setEditUserData({ ...editUserData, matricula: e.target.value })}
                      className="w-full bg-slate-50 p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-slate-600">Curso</label>
                    <select
                      value={editUserData.curso || ''}
                      onChange={e => setEditUserData({ ...editUserData, curso: e.target.value })}
                      className="w-full bg-slate-50 p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 text-xs"
                    >
                      <option value="">Selecione o curso</option>
                      {activeCourses.map(c => (
                        <option key={c.id} value={c.nome}>{c.nome}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-600">Campus</label>
                <select
                  value={editUserData.campus || ''}
                  onChange={e => setEditUserData({ ...editUserData, campus: e.target.value })}
                  className="w-full bg-slate-50 p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500"
                >
                  <option value="GRAÇAS">UNINASSAU Graças</option>
                  <option value="CAXANGÁ">UNINASSAU Caxangá</option>
                  <option value="BOA_VIAGEM">UNINASSAU Boa Viagem</option>
                </select>
              </div>
              {editUserData.role === 'professor' && (
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-600">Titulação *</label>
                  <select
                    value={editUserData.titulacao || ''}
                    onChange={e => setEditUserData({ ...editUserData, titulacao: e.target.value as TitulacaoProfessor })}
                    className="w-full bg-slate-50 p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 text-xs"
                  >
                    <option value="">Selecione a titulação</option>
                    {TITULACAO_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-600">Perfil</label>
                <select
                  value={editUserData.role || 'aluno'}
                  onChange={e => setEditUserData({ ...editUserData, role: e.target.value })}
                  className="w-full bg-slate-50 p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500"
                >
                  <option value="aluno">Aluno</option>
                  <option value="professor">Professor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              {editError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5">
                  <p className="text-[11px] text-rose-700 font-medium">{editError}</p>
                </div>
              )}
              <button
                onClick={handleSaveEdit}
                disabled={editLoading}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs py-3 rounded-xl uppercase tracking-wider transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {editLoading && <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />}
                {editLoading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </PortalOverlay>
      )}

      {/* Pending Reset Requests Modal */}
      {showResetRequestsModal && (
        <PortalOverlay onClose={() => { setShowResetRequestsModal(false); setPendingResets([]); }}>
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full border border-slate-200 shadow-2xl flex flex-col gap-5 animate-slide-up max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-orange-600" />
                Solicitações de Recuperação Pendentes
              </h3>
              <button onClick={() => { setShowResetRequestsModal(false); setPendingResets([]); }} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            {isLoadingResets ? (
              <div className="flex justify-center py-8">
                <span className="w-6 h-6 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : pendingResets.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Nenhuma solicitação de recuperação pendente.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingResets.map((req) => (
                  <div key={req.id} className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{req.email}</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Solicitado em: {new Date(req.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRestoreFromReset(req.user_id)}
                      className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-3 py-1.5 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                    >
                      <KeyRound className="h-3 w-3" />
                      Restaurar e Gerar Código
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => { setShowResetRequestsModal(false); setPendingResets([]); }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </PortalOverlay>
      )}
    </div>
  );
};
