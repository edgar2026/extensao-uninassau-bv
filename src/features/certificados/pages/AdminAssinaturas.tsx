/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { usuariosService } from '../../../services/usuarios.service';
import { AssinaturaDigital } from '../../../types';
import {
  Plus, X, Upload, Building2, User, Briefcase,
  CheckCircle, XCircle, ImagePlus, Trash2, PenTool,
  Eye, Pencil, AlertTriangle
} from 'lucide-react';
import { PortalOverlay } from '../../../components/ui/PortalOverlay';

const UNIDADES = [
  'UNINASSAU Graças',
  'UNINASSAU Caxangá',
  'UNINASSAU Boa Viagem',
];

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];
const MAX_SIZE_BYTES = 2 * 1024 * 1024;

const validateFile = (file: File): string | null => {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return 'Envie a assinatura em PNG, JPG ou WEBP.';
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Envie a assinatura em PNG, JPG ou WEBP.';
  }
  if (file.size > MAX_SIZE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return `Arquivo muito grande (${mb} MB). Limite: 2 MB.`;
  }
  return null;
};

export const AdminAssinaturas: React.FC = () => {
  const [assinaturas, setAssinaturas] = useState<AssinaturaDigital[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [viewingAss, setViewingAss] = useState<AssinaturaDigital | null>(null);
  const [editingAss, setEditingAss] = useState<AssinaturaDigital | null>(null);
  const [deletingAss, setDeletingAss] = useState<AssinaturaDigital | null>(null);

  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('');
  const [unidade, setUnidade] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const fetchAssinaturas = async () => {
    setIsLoading(true);
    try {
      const data = await usuariosService.getAssinaturas();
      setAssinaturas(data);
    } catch {
      setError('Erro ao carregar assinaturas.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAssinaturas(); }, []);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const resetForm = () => {
    setNome('');
    setCargo('');
    setUnidade('');
    setImageFile(null);
    setImagePreview(null);
    setError(null);
  };

  const handleImageSelect = (file: File, isEdit = false) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent, isEdit = false) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageSelect(file, isEdit);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !cargo.trim() || !unidade) return;
    setIsSaving(true);
    setError(null);
    try {
      await usuariosService.createAssinatura(nome.trim(), cargo.trim(), unidade, imageFile);
      resetForm();
      setShowCreateModal(false);
      setSuccess('Assinatura cadastrada com sucesso.');
      fetchAssinaturas();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado ao cadastrar assinatura.';
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = (ass: AssinaturaDigital) => {
    setEditingAss(ass);
    setNome(ass.nome);
    setCargo(ass.cargo);
    setUnidade(ass.unidade);
    setImageFile(null);
    setImagePreview(ass.imagemUrl || null);
    setError(null);
    setShowEditModal(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAss || !nome.trim() || !cargo.trim() || !unidade) return;
    setIsSaving(true);
    setError(null);
    try {
      await usuariosService.updateAssinatura(
        editingAss.id,
        nome.trim(),
        cargo.trim(),
        unidade,
        imageFile,
        editingAss.storagePath || null
      );
      resetForm();
      setShowEditModal(false);
      setEditingAss(null);
      setSuccess('Assinatura atualizada com sucesso.');
      fetchAssinaturas();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado ao atualizar assinatura.';
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingAss) return;
    setDeleteLoading(true);
    try {
      await usuariosService.deleteAssinatura(deletingAss.id, deletingAss.storagePath || null);
      setShowDeleteModal(false);
      setDeletingAss(null);
      setSuccess('Assinatura excluída com sucesso.');
      fetchAssinaturas();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir assinatura.';
      setError(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggle = async (ass: AssinaturaDigital) => {
    try {
      await usuariosService.toggleAssinatura(ass.id, !ass.ativo, ass.unidade);
      setSuccess(ass.ativo ? 'Assinatura desativada.' : 'Assinatura ativada.');
      fetchAssinaturas();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao alterar status.';
      setError(msg);
    }
  };

  const closeAllModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowViewModal(false);
    setShowDeleteModal(false);
    setViewingAss(null);
    setEditingAss(null);
    setDeletingAss(null);
    resetForm();
  };

  const uploadArea = (isEdit: boolean) => (
    <div className="flex flex-col gap-1.5">
      <label className="font-semibold text-slate-600 flex items-center gap-1.5">
        <ImagePlus className="h-3 w-3" /> Carimbo / Assinatura
      </label>
      <div
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
          dragActive
            ? 'border-cyan-500 bg-cyan-50'
            : imagePreview
              ? 'border-emerald-300 bg-emerald-50/30'
              : 'border-slate-200 hover:border-cyan-300 hover:bg-slate-50/50'
        }`}
        onClick={() => (isEdit ? editFileInputRef : fileInputRef).current?.click()}
        onDragOver={e => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={e => handleDrop(e, isEdit)}
      >
        {imagePreview ? (
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview do carimbo"
              className="max-h-36 mx-auto object-contain"
            />
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setImageFile(null); setImagePreview(null); }}
              className="absolute top-0 right-0 bg-rose-50 hover:bg-rose-100 text-rose-500 p-1 rounded-full border border-rose-200 transition cursor-pointer"
            >
              <Trash2 className="h-3 w-3" />
            </button>
            <p className="text-[10px] text-emerald-600 font-semibold mt-2">
              {imageFile ? imageFile.name : 'Imagem atual'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4">
            <Upload className="h-8 w-8 text-slate-300" />
            <p className="text-[10px] text-slate-500 font-medium">
              Arraste a imagem aqui ou <span className="text-cyan-600 font-bold">clique para selecionar</span>
            </p>
            <p className="text-[9px] text-slate-400">PNG, JPG ou WEBP — máx. 2 MB — fundo transparente recomendado</p>
          </div>
        )}
      </div>
      <input
        ref={isEdit ? editFileInputRef : fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) handleImageSelect(f, isEdit);
          e.target.value = '';
        }}
      />
    </div>
  );

  const formFields = () => (
    <>
      <div className="flex flex-col gap-1.5">
        <label className="font-semibold text-slate-600 flex items-center gap-1.5">
          <User className="h-3 w-3" /> Nome Completo do Diretor
        </label>
        <input
          type="text"
          value={nome}
          onChange={e => setNome(e.target.value)}
          placeholder="Ex: Hesdras Viana"
          required
          className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 w-full text-xs focus:outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="font-semibold text-slate-600 flex items-center gap-1.5">
          <Briefcase className="h-3 w-3" /> Cargo Oficial
        </label>
        <input
          type="text"
          value={cargo}
          onChange={e => setCargo(e.target.value)}
          placeholder="Ex: Diretor Executivo"
          required
          className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 w-full text-xs focus:outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="font-semibold text-slate-600 flex items-center gap-1.5">
          <Building2 className="h-3 w-3" /> Campus
        </label>
        <select
          value={unidade}
          onChange={e => setUnidade(e.target.value)}
          required
          className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 w-full text-xs focus:outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500"
        >
          <option value="">Selecione o campus...</option>
          {UNIDADES.map(u => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </div>

      {uploadArea(Boolean(editingAss))}
    </>
  );

  const isAtivoCount = (unidadeStr: string) =>
    assinaturas.filter(a => a.unidade === unidadeStr && a.ativo).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Assinaturas e Carimbos de Diretores</h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Cadastre os diretores de cada campus. A assinatura será inserida automaticamente nos certificados.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowCreateModal(true); }}
          className="flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-sm cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Cadastrar Assinatura
        </button>
      </div>

      {/* GLOBAL MESSAGES */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-rose-400 hover:text-rose-600 cursor-pointer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-700 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {/* CARDS GRID */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : assinaturas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-2xl border border-slate-200">
          <PenTool className="h-12 w-12 text-slate-200" />
          <p className="text-sm font-semibold text-slate-400">Nenhuma assinatura cadastrada</p>
          <p className="text-xs text-slate-300 text-center max-w-xs">
            Cadastre os diretores de cada campus para que suas assinaturas apareçam automaticamente nos certificados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {assinaturas.map(ass => (
            <div
              key={ass.id}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition hover:shadow-md ${
                ass.ativo ? 'border-slate-200' : 'border-slate-100 opacity-60'
              }`}
            >
              {/* Image Preview Area */}
              <div className="h-36 bg-slate-50 border-b border-slate-100 flex items-center justify-center relative">
                {ass.imagemUrl ? (
                  <img
                    src={ass.imagemUrl}
                    alt={`Carimbo de ${ass.nome}`}
                    className="max-h-full max-w-full object-contain p-4"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <ImagePlus className="h-10 w-10 text-slate-200" />
                    <span className="text-[10px] text-slate-400 font-medium">Sem imagem</span>
                  </div>
                )}
                <span className={`absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  ass.ativo
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : 'bg-slate-100 text-slate-400 border-slate-200'
                }`}>
                  {ass.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              {/* Info */}
              <div className="p-4 space-y-1">
                <h3 className="font-extrabold text-slate-900 text-sm leading-tight">{ass.nome}</h3>
                <p className="text-xs text-cyan-600 font-semibold">{ass.cargo}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                  <p className="text-xs text-slate-500 font-medium">{ass.unidade}</p>
                </div>
                <p className="text-[10px] text-slate-400 pt-0.5">
                  Cadastrado em {new Date(ass.dataCadastro).toLocaleDateString('pt-BR')}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-1.5 px-4 pb-4">
                <button
                  onClick={() => { setViewingAss(ass); setShowViewModal(true); }}
                  className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  <Eye className="h-3 w-3" /> Ver
                </button>
                <button
                  onClick={() => openEditModal(ass)}
                  className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 text-cyan-600 hover:bg-cyan-50 transition cursor-pointer"
                >
                  <Pencil className="h-3 w-3" /> Editar
                </button>
                <button
                  onClick={() => handleToggle(ass)}
                  className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition cursor-pointer ${
                    ass.ativo
                      ? 'text-rose-600 border-rose-200 hover:bg-rose-50'
                      : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                  }`}
                >
                  {ass.ativo ? (
                    <><XCircle className="h-3 w-3" /> Desativar</>
                  ) : (
                    <><CheckCircle className="h-3 w-3" /> Ativar</>
                  )}
                </button>
                <button
                  onClick={() => { setDeletingAss(ass); setShowDeleteModal(true); setError(null); }}
                  className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" /> Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL — CREATE */}
      {showCreateModal && (
        <PortalOverlay onClose={closeAllModals}>
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full border border-slate-200 shadow-2xl flex flex-col gap-5 animate-slide-up" style={{ maxHeight: 'calc(100vh - 32px)', overflowY: 'auto' }}>
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Cadastrar Assinatura</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Preencha os dados e envie o carimbo (PNG, JPG ou WEBP, máx. 2 MB).</p>
              </div>
              <button onClick={closeAllModals} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1">
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-[11px]">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              {formFields()}
              <button
                type="submit"
                disabled={isSaving || !nome.trim() || !cargo.trim() || !unidade}
                className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs py-3 rounded-xl uppercase tracking-wider transition cursor-pointer"
              >
                {isSaving ? 'Salvando...' : 'Cadastrar Assinatura'}
              </button>
            </form>
          </div>
        </PortalOverlay>
      )}

      {/* MODAL — EDIT */}
      {showEditModal && editingAss && (
        <PortalOverlay onClose={closeAllModals}>
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full border border-slate-200 shadow-2xl flex flex-col gap-5 animate-slide-up" style={{ maxHeight: 'calc(100vh - 32px)', overflowY: 'auto' }}>
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Editar Assinatura</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Altere os dados ou substitua a imagem do carimbo.</p>
              </div>
              <button onClick={closeAllModals} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1">
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-[11px]">
                {error}
              </div>
            )}

            <form onSubmit={handleEdit} className="space-y-4 text-xs">
              {formFields()}
              <button
                type="submit"
                disabled={isSaving || !nome.trim() || !cargo.trim() || !unidade}
                className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs py-3 rounded-xl uppercase tracking-wider transition cursor-pointer"
              >
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </form>
          </div>
        </PortalOverlay>
      )}

      {/* MODAL — VIEW */}
      {showViewModal && viewingAss && (
        <PortalOverlay onClose={closeAllModals}>
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full border border-slate-200 shadow-2xl flex flex-col gap-5 animate-slide-up">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Visualizar Assinatura</h3>
              <button onClick={closeAllModals} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-4">
              {viewingAss.imagemUrl ? (
                <img
                  src={viewingAss.imagemUrl}
                  alt={`Carimbo de ${viewingAss.nome}`}
                  className="max-h-48 object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 py-8">
                  <ImagePlus className="h-16 w-16 text-slate-200" />
                  <span className="text-xs text-slate-400">Sem imagem cadastrada</span>
                </div>
              )}

              <div className="w-full space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-400 font-semibold">Nome</span>
                  <span className="text-slate-800 font-bold">{viewingAss.nome}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-400 font-semibold">Cargo</span>
                  <span className="text-slate-800 font-bold">{viewingAss.cargo}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-400 font-semibold">Campus</span>
                  <span className="text-slate-800 font-bold">{viewingAss.unidade}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-400 font-semibold">Status</span>
                  <span className={`font-bold ${viewingAss.ativo ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {viewingAss.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400 font-semibold">Cadastrado em</span>
                  <span className="text-slate-800 font-bold">
                    {new Date(viewingAss.dataCadastro).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={closeAllModals}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </PortalOverlay>
      )}

      {/* MODAL — DELETE CONFIRMATION */}
      {showDeleteModal && deletingAss && (
        <PortalOverlay onClose={closeAllModals}>
          <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-200 shadow-2xl flex flex-col gap-5 animate-slide-up">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Excluir Assinatura</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Esta ação é irreversível.</p>
                </div>
              </div>
              <button onClick={closeAllModals} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 text-xs space-y-1">
              <p className="text-slate-800 font-bold">{deletingAss.nome}</p>
              <p className="text-slate-500">{deletingAss.cargo}</p>
              <p className="text-slate-400">{deletingAss.unidade}</p>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-[11px] text-amber-700">
              <strong>Atenção:</strong> A assinatura será removida permanentemente, incluindo o arquivo de imagem no storage.
              Certificados gerados futuramente não terão assinatura para este campus até que uma nova seja cadastrada.
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-[11px]">
                {error}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={closeAllModals}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="text-xs bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white px-4 py-2 rounded-xl font-bold cursor-pointer transition"
              >
                {deleteLoading ? 'Excluindo...' : 'Excluir Assinatura'}
              </button>
            </div>
          </div>
        </PortalOverlay>
      )}
    </div>
  );
};
