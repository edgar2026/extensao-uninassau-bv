/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { projetosService } from '../../../services/projetos.service';
import {
  Projeto, ProjetoArea, ProjetoStatus,
  AlunoParticipante, DocumentoComprobatorio, CampusCode
} from '../../../types';
import {
  Plus, X, CheckCircle, FileText, AlertTriangle, Lock,
  Eye, Edit3, Send, Download, ChevronRight, ChevronLeft, Trash2
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { DataStep } from '../components/DataStep';
import { ParticipantsStep } from '../components/ParticipantsStep';
import { DocumentStep } from '../components/DocumentStep';
import { ReviewStep } from '../components/ReviewStep';

const WIZARD_STEPS = ['Dados do Projeto', 'Participantes', 'Documento', 'Revisão'];

export const ProfessorProjetos: React.FC = () => {
  const { user } = useAuth();
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'extensao' | 'ic'>('extensao');

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const [nome, setNome] = useState('');
  const [areaTematica, setAreaTematica] = useState<ProjetoArea>('Extensão');
  const [campus, setCampus] = useState<CampusCode | ''>('');
  const [descricao, setDescricao] = useState('');
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [dataTermino, setDataTermino] = useState(new Date().toISOString().split('T')[0]);
  const [cargaHoraria, setCargaHoraria] = useState(40);

  const [alunosForm, setAlunosForm] = useState<AlunoParticipante[]>([]);
  const [docsForm, setDocsForm] = useState<DocumentoComprobatorio[]>([]);

  const [detalhesProjeto, setDetalhesProjeto] = useState<Projeto | null>(null);
  const [msgSucesso, setMsgSucesso] = useState<string | null>(null);
  const [msgErro, setMsgErro] = useState<string | null>(null);
  const [deletingProjeto, setDeletingProjeto] = useState<Projeto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProjetos = useCallback(async () => {
    if (user) {
      setIsLoading(true);
      const data = await projetosService.getProjetosByProfessor(user.email || user.nome);
      setProjetos(data);
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProjetos();
  }, [fetchProjetos]);

  const resetForm = () => {
    setNome('');
    setAreaTematica(activeTab === 'extensao' ? 'Extensão' : 'IC');
    setCampus('');
    setDescricao('');
    setDataInicio(new Date().toISOString().split('T')[0]);
    setDataTermino(new Date().toISOString().split('T')[0]);
    setCargaHoraria(40);
    setAlunosForm([]);
    setDocsForm([]);
    setEditingId(null);
    setIsEditing(false);
    setCurrentStep(0);
  };

  const handleOpenNovoModal = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEditarModal = (proj: Projeto) => {
    if (proj.status !== 'rascunho' && proj.status !== 'correcao_solicitada') {
      setMsgErro(`O projeto está com status "${proj.status}" e não pode ser editado.`);
      setTimeout(() => setMsgErro(null), 4000);
      return;
    }

    setEditingId(proj.id);
    setIsEditing(true);
    setNome(proj.nome);
    setAreaTematica(proj.areaTematica);
    setCampus(proj.campus || '');
    setDescricao(proj.descricao);
    setDataInicio(proj.dataInicio);
    setDataTermino(proj.dataTermino);
    setCargaHoraria(proj.cargaHoraria);
    setAlunosForm(proj.alunosParticipantes || []);
    setDocsForm(proj.documentosComprobatorios || []);
    setCurrentStep(0);
    setShowModal(true);
  };

  const getMissingFields = (): string[] => {
    const missing: string[] = [];
    if (!campus) missing.push('Campus');
    if (!nome.trim()) missing.push('Título do projeto');
    if (!descricao.trim()) missing.push('Descrição');
    if (!dataInicio) missing.push('Data inicial');
    if (!dataTermino) missing.push('Data final');
    if (cargaHoraria <= 0) missing.push('Carga horária');
    if (alunosForm.length === 0) missing.push('Pelo menos 1 participante');
    if (!docsForm.some(d => d.active)) missing.push('Documento PDF comprobatório');
    return missing;
  };

  const canSubmit = getMissingFields().length === 0;

  const handleSaveForm = async (targetStatus: 'rascunho' | 'enviado' | 'reenviado') => {
    if ((targetStatus === 'enviado' || targetStatus === 'reenviado') && !canSubmit) {
      setMsgErro('Preencha todos os campos obrigatórios antes de enviar.');
      setTimeout(() => setMsgErro(null), 4000);
      return;
    }

    setIsSaving(true);
    try {
      await projetosService.saveProjeto(
        {
          id: editingId || undefined,
          nome: nome.trim(),
          descricao: descricao.trim(),
          professorEmail: user?.email,
          professorResponsavel: user?.nome || 'Prof. Responsável',
          campus: campus || undefined,
          areaTematica,
          dataInicio,
          dataTermino,
          cargaHoraria: Number(cargaHoraria),
          alunosParticipantes: alunosForm,
          documentosComprobatorios: docsForm,
        },
        targetStatus
      );

      setShowModal(false);
      resetForm();
      fetchProjetos();

      const acaoTxt = targetStatus === 'rascunho'
        ? 'salvo como rascunho'
        : targetStatus === 'reenviado'
          ? 'reenviado para análise'
          : 'enviado para análise';
      setMsgSucesso(`Projeto ${acaoTxt} com sucesso!`);
      setTimeout(() => setMsgSucesso(null), 5000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar projeto.';
      setMsgErro(message);
      setTimeout(() => setMsgErro(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnviarDireto = async (proj: Projeto) => {
    try {
      await projetosService.enviarProjeto(proj.id);
      fetchProjetos();
      setMsgSucesso(`Projeto "${proj.nome}" enviado para análise!`);
      setTimeout(() => setMsgSucesso(null), 4000);
    } catch (err: any) {
      setMsgErro(err.message || 'Erro ao enviar projeto.');
      setTimeout(() => setMsgErro(null), 4000);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingProjeto) return;
    setIsDeleting(true);
    try {
      await projetosService.deleteProjeto(deletingProjeto.id);
      setDeletingProjeto(null);
      fetchProjetos();
      setMsgSucesso(`Projeto "${deletingProjeto.nome}" excluído com sucesso!`);
      setTimeout(() => setMsgSucesso(null), 4000);
    } catch (err: any) {
      setMsgErro(err.message || 'Erro ao excluir projeto.');
      setTimeout(() => setMsgErro(null), 4000);
    } finally {
      setIsDeleting(false);
    }
  };

  const canAdvanceStep = (): boolean => {
    switch (currentStep) {
      case 0:
        return Boolean(nome.trim() && campus && descricao.trim() && dataInicio && dataTermino && cargaHoraria > 0);
      case 1:
        return alunosForm.length >= 1;
      case 2:
        return docsForm.some(d => d.active);
      case 3:
        return canSubmit;
      default:
        return false;
    }
  };

  const filteredProjetos = projetos.filter(p =>
    activeTab === 'extensao' ? p.areaTematica === 'Extensão' : p.areaTematica === 'IC'
  );

  const getStatusBadge = (status: ProjetoStatus) => {
    switch (status) {
      case 'rascunho':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">Rascunho</span>;
      case 'enviado':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">Enviado para Análise</span>;
      case 'reenviado':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Reenviado</span>;
      case 'correcao_solicitada':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1"><AlertTriangle className="h-3 w-3 shrink-0" /> Correção Solicitada</span>;
      case 'aprovado':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"><CheckCircle className="h-3 w-3 shrink-0" /> Aprovado</span>;
      case 'rejeitado':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Rejeitado</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Meus Projetos de Extensão & IC</h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Cadastre seus projetos, inclua alunos participantes, anexe comprovações e envie para validação.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenNovoModal}
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-cyan-500/10 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Novo Projeto
          </button>
        </div>
      </div>

      {msgSucesso && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-4 py-3 rounded-xl flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {msgSucesso}
        </div>
      )}
      {msgErro && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {msgErro}
        </div>
      )}

      <div className="flex border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('extensao')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'extensao'
              ? 'border-cyan-500 text-cyan-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Extensão Universitária
        </button>
        <button
          onClick={() => setActiveTab('ic')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'ic'
              ? 'border-cyan-500 text-cyan-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Iniciação Científica (IC)
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredProjetos.map(proj => {
            const canEdit = proj.status === 'rascunho' || proj.status === 'correcao_solicitada';

            return (
              <div key={proj.id} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex justify-between items-start gap-3 mb-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600">
                      {proj.areaTematica}
                    </span>
                    {getStatusBadge(proj.status)}
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mb-1.5">{proj.nome}</h3>
                  <p className="text-xs text-slate-500 line-clamp-3 mb-3">{proj.descricao}</p>

                  {proj.status === 'correcao_solicitada' && proj.parecerAdmin && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-3 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-amber-800 mb-1">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                        Correção solicitada pelo administrador
                      </div>
                      {proj.reviewedAt && (
                        <p className="text-amber-700 text-[10px] mb-1.5 pl-5">
                          Solicitado em {new Date(proj.reviewedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          {proj.reviewedBy && ` por ${proj.reviewedBy}`}
                        </p>
                      )}
                      <p className="text-amber-900 leading-relaxed font-medium pl-5 whitespace-pre-wrap">{proj.parecerAdmin}</p>
                    </div>
                  )}

                  {proj.status === 'rejeitado' && proj.parecerAdmin && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 mb-3 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-rose-800 mb-1">
                        Justificativa da Rejeição:
                      </div>
                      <p className="text-rose-900 leading-relaxed font-medium">{proj.parecerAdmin}</p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                    <div>
                      <span className="text-slate-400">Campus:</span> <strong className="text-slate-700">{proj.campus || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">CH:</span> <strong className="text-indigo-600 font-mono">{proj.cargaHoraria}h</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Alunos:</span> <strong className="text-slate-700">{(proj.alunosParticipantes || []).length} discentes</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Anexos:</span> <strong className="text-slate-700">{(proj.documentosComprobatorios || []).length} PDF(s)</strong>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                    <button
                      onClick={() => setDetalhesProjeto(proj)}
                      className="flex items-center gap-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" /> Detalhes
                    </button>

                    <div className="flex items-center gap-2">
                      {canEdit ? (
                        <>
                          <button
                            onClick={() => handleOpenEditarModal(proj)}
                            className="flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-200 transition cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5" /> {proj.status === 'correcao_solicitada' ? 'Corrigir' : 'Editar'}
                          </button>
                          {proj.status === 'rascunho' && (
                            <>
                              <button
                                onClick={() => handleEnviarDireto(proj)}
                                className="flex items-center gap-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shadow-sm"
                              >
                                <Send className="h-3.5 w-3.5" /> Enviar
                              </button>
                              <button
                                onClick={() => setDeletingProjeto(proj)}
                                className="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-rose-200 transition cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Excluir
                              </button>
                            </>
                          )}
                        </>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                          <Lock className="h-3 w-3" /> Bloqueado
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredProjetos.length === 0 && (
            <div className="col-span-2 bg-slate-50 text-slate-400 text-xs p-12 rounded-2xl border border-slate-200 text-center">
              Nenhum projeto cadastrado nesta categoria. Clique em <strong>"Novo Projeto"</strong> para registrar.
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={isEditing ? 'Editar Projeto' : 'Novo Projeto'}
        size="lg"
      >
        <div className="space-y-4 text-xs text-left">
          {/* Step indicators */}
          <div className="flex items-center justify-between mb-4">
            {WIZARD_STEPS.map((step, i) => (
              <div key={step} className="flex items-center">
                <div className={`flex items-center gap-1.5 ${i <= currentStep ? 'text-cyan-600' : 'text-slate-400'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    i < currentStep ? 'bg-cyan-500 text-white' :
                    i === currentStep ? 'bg-cyan-100 text-cyan-700 border-2 border-cyan-500' :
                    'bg-slate-100 text-slate-400'
                  }`}>
                    {i < currentStep ? <CheckCircle className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <span className="hidden md:inline text-[10px] font-semibold">{step}</span>
                </div>
                {i < WIZARD_STEPS.length - 1 && (
                  <div className={`w-8 h-0.5 mx-1 ${i < currentStep ? 'bg-cyan-500' : 'bg-slate-200'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step content */}
          <div className="min-h-[300px] max-h-[60vh] overflow-y-auto pr-1">
            {currentStep === 0 && (
              <DataStep
                nome={nome} setNome={setNome}
                areaTematica={areaTematica} setAreaTematica={setAreaTematica}
                campus={campus} setCampus={setCampus}
                descricao={descricao} setDescricao={setDescricao}
                dataInicio={dataInicio} setDataInicio={setDataInicio}
                dataTermino={dataTermino} setDataTermino={setDataTermino}
                cargaHoraria={cargaHoraria} setCargaHoraria={setCargaHoraria}
              />
            )}
            {currentStep === 1 && (
              <ParticipantsStep
                alunos={alunosForm}
                setAlunos={setAlunosForm}
                isEditable={!editingId || isEditing}
              />
            )}
            {currentStep === 2 && (
              <DocumentStep
                projectId={editingId}
                documentos={docsForm}
                setDocumentos={setDocsForm}
                isEditable={!editingId || isEditing}
                onSaveDraft={async () => {
                  try {
                    const result = await projetosService.saveProjeto(
                      {
                        id: editingId || undefined,
                        nome: nome.trim() || 'Projeto sem título',
                        descricao: descricao.trim(),
                        professorEmail: user?.email,
                        professorResponsavel: user?.nome || 'Prof. Responsável',
                        campus: campus || undefined,
                        areaTematica,
                        dataInicio,
                        dataTermino,
                        cargaHoraria: Number(cargaHoraria),
                        alunosParticipantes: alunosForm,
                        documentosComprobatorios: docsForm,
                      },
                      'rascunho'
                    );
                    setEditingId(result.id);
                    return result.id;
                  } catch {
                    return null;
                  }
                }}
              />
            )}
            {currentStep === 3 && (
              <ReviewStep
                nome={nome}
                areaTematica={areaTematica}
                campus={campus}
                descricao={descricao}
                dataInicio={dataInicio}
                dataTermino={dataTermino}
                cargaHoraria={cargaHoraria}
                professorNome={user?.nome || ''}
                alunos={alunosForm}
                documentos={docsForm}
                canSubmit={canSubmit}
                missingFields={getMissingFields()}
              />
            )}
          </div>

          {/* Navigation buttons */}
          <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
            <Button variant="ghost" size="sm" onClick={() => { setShowModal(false); resetForm(); }}>
              Cancelar
            </Button>

            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(s => s - 1)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl font-bold cursor-pointer text-xs flex items-center gap-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Anterior
                </button>
              )}

              {currentStep < WIZARD_STEPS.length - 1 ? (
                <button
                  type="button"
                  disabled={!canAdvanceStep()}
                  onClick={() => setCurrentStep(s => s + 1)}
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-4 py-2 rounded-xl font-bold cursor-pointer text-xs flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Próximo <ChevronRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSaveForm('rascunho')}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 rounded-xl font-bold cursor-pointer disabled:opacity-50 text-xs"
                  >
                    Salvar Rascunho
                  </button>
                  <button
                    type="button"
                    disabled={isSaving || !canSubmit}
                    onClick={() => handleSaveForm(editingId && projetos.find(p => p.id === editingId)?.status === 'correcao_solicitada' ? 'reenviado' : 'enviado')}
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-5 py-2 rounded-xl font-bold shadow-lg shadow-cyan-500/10 cursor-pointer disabled:opacity-50 text-xs flex items-center gap-1.5"
                  >
                    {isSaving ? (
                      <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    {editingId && projetos.find(p => p.id === editingId)?.status === 'correcao_solicitada'
                      ? 'Reenviar para Análise'
                      : 'Enviar para Análise'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {detalhesProjeto && (
        <Modal
          isOpen={Boolean(detalhesProjeto)}
          onClose={() => setDetalhesProjeto(null)}
          title={`Detalhes: ${detalhesProjeto.nome}`}
          size="lg"
        >
          <div className="space-y-4 text-xs text-left max-h-[75vh] overflow-y-auto pr-1">
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-700">Status:</span>
              {getStatusBadge(detalhesProjeto.status)}
            </div>

            {detalhesProjeto.parecerAdmin && (
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl">
                <span className="font-bold text-amber-800 block mb-1">Correção solicitada pelo administrador</span>
                {detalhesProjeto.reviewedAt && (
                  <p className="text-amber-700 text-[10px] mb-1.5">
                    Solicitado em {new Date(detalhesProjeto.reviewedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {detalhesProjeto.reviewedBy && ` por ${detalhesProjeto.reviewedBy}`}
                  </p>
                )}
                <p className="text-amber-900 leading-relaxed font-medium whitespace-pre-wrap">{detalhesProjeto.parecerAdmin}</p>
              </div>
            )}

            <div>
              <span className="font-bold text-slate-700 block mb-1">Descrição:</span>
              <p className="text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">{detalhesProjeto.descricao}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-slate-600">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Campus</span>
                <span className="font-bold">{detalhesProjeto.campus || '—'}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Carga Horária</span>
                <span className="font-bold font-mono text-indigo-600">{detalhesProjeto.cargaHoraria}h</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Período</span>
                <span className="font-semibold text-[11px]">{detalhesProjeto.dataInicio} à {detalhesProjeto.dataTermino}</span>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-800 mb-2">Alunos ({(detalhesProjeto.alunosParticipantes || []).length})</h4>
              {(detalhesProjeto.alunosParticipantes || []).length === 0 ? (
                <p className="text-slate-400 italic">Nenhum aluno cadastrado.</p>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-[10px] uppercase font-bold text-slate-500">
                        <th className="p-2.5">Nome</th>
                        <th className="p-2.5">E-mail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {(detalhesProjeto.alunosParticipantes || []).map(aluno => (
                        <tr key={aluno.profileId}>
                          <td className="p-2.5 font-bold">{aluno.nome}</td>
                          <td className="p-2.5 text-slate-500">{aluno.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <h4 className="font-bold text-slate-800 mb-2">Documentos ({(detalhesProjeto.documentosComprobatorios || []).length})</h4>
              {(detalhesProjeto.documentosComprobatorios || []).length === 0 ? (
                <p className="text-slate-400 italic">Nenhum documento anexado.</p>
              ) : (
                <div className="space-y-1.5">
                  {(detalhesProjeto.documentosComprobatorios || []).map(doc => (
                    <div key={doc.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs">
                      <FileText className="h-4 w-4 text-cyan-600 shrink-0" />
                      <span className="font-bold text-slate-800">{doc.nome}</span>
                      <span className="text-slate-400 text-[10px]">({doc.tamanho})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => setDetalhesProjeto(null)}>Fechar</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de Confirmação de Exclusão */}
      <Modal
        isOpen={Boolean(deletingProjeto)}
        onClose={() => { if (!isDeleting) setDeletingProjeto(null); }}
        title="Confirmar Exclusão"
        size="sm"
      >
        <div className="space-y-4 text-xs text-left">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
              <Trash2 className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <p className="font-bold text-slate-800 mb-1">Tem certeza que deseja excluir este projeto?</p>
              <p className="text-slate-500">
                O projeto <strong className="text-slate-700">"{deletingProjeto?.nome}"</strong> será removido permanentemente. Esta ação não pode ser desfeita.
              </p>
            </div>
          </div>

          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
            <p className="text-rose-700 text-[11px] font-medium">
              Todos os dados, participantes e documentos anexados serão excluídos.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setDeletingProjeto(null)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {isDeleting ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Excluir Projeto
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
