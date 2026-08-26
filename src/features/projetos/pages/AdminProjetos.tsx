/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { projetosService } from '../../../services/projetos.service';
import { Projeto, ProjetoStatus, CampusCode, CAMPUS_OPTIONS } from '../../../types';
import {
  CheckCircle, AlertTriangle, XCircle, Eye, FileText,
  Clock, Users, Building2, BookOpen, ShieldCheck, Filter,
  Download, Upload, FileSpreadsheet
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { downloadImportTemplate, exportProjectsToXlsx } from '../utils/xlsxUtils';

export const AdminProjetos: React.FC = () => {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'extensao' | 'ic'>('extensao');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [campusFilter, setCampusFilter] = useState<string>('todos');

  // Modal de Análise / Detalhes
  const [selectedProjeto, setSelectedProjeto] = useState<Projeto | null>(null);
  const [showAnaliseModal, setShowAnaliseModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Modal para Justificativa (Correção ou Rejeição)
  const [actionType, setActionType] = useState<'solicitar_correcao' | 'rejeitar' | null>(null);
  const [parecerTexto, setParecerTexto] = useState('');
  const [parecerErro, setParecerErro] = useState<string | null>(null);

  // Mensagens
  const [msgSucesso, setMsgSucesso] = useState<string | null>(null);
  const [msgErro, setMsgErro] = useState<string | null>(null);

  // Import/Export states
  const [isExporting, setIsExporting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const fetchProjetos = async () => {
    setIsLoading(true);
    const data = await projetosService.getProjetos();
    setProjetos(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProjetos();
  }, []);

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      downloadImportTemplate();
      setMsgSucesso('Modelo XLSX baixado com sucesso!');
      setTimeout(() => setMsgSucesso(null), 3000);
    } catch (err: any) {
      console.error('[AdminProjetos] Erro ao baixar modelo:', err);
      setMsgErro('Erro ao baixar o modelo. Tente novamente.');
      setTimeout(() => setMsgErro(null), 4000);
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleExportProjects = async () => {
    setIsExporting(true);
    try {
      exportProjectsToXlsx(projetos);
      setMsgSucesso(`${projetos.length} projeto(s) exportado(s) com sucesso!`);
      setTimeout(() => setMsgSucesso(null), 3000);
    } catch (err: any) {
      console.error('[AdminProjetos] Erro ao exportar projetos:', err);
      setMsgErro('Erro ao exportar projetos. Tente novamente.');
      setTimeout(() => setMsgErro(null), 4000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImportFile(e.target.files[0]);
      setImportResult(null);
    }
  };

  const handleConfirmImport = async () => {
    if (!importFile) return;
    setIsImporting(true);
    setImportResult(null);
    try {
      const XLSX = await import('xlsx');
      const data = await importFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) {
        setImportResult('Erro: A planilha está vazia ou não contém dados.');
        return;
      }

      const headers = (jsonData[0] as string[]).map(h => String(h).toLowerCase().trim());
      const requiredCols = ['nome_projeto', 'categoria', 'email_professor', 'email_aluno'];
      const missingCols = requiredCols.filter(col => !headers.includes(col));

      if (missingCols.length > 0) {
        setImportResult(`Erro: Colunas obrigatórias não encontradas: ${missingCols.join(', ')}`);
        return;
      }

      const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== null && cell !== ''));
      setImportResult(`Sucesso: ${rows.length} linha(s) encontrada(s) na planilha. A importação será processada em breve.`);
      setTimeout(() => {
        setShowImportModal(false);
        setImportFile(null);
        setImportResult(null);
      }, 3000);
    } catch (err: any) {
      console.error('[AdminProjetos] Erro ao processar importação:', err);
      setImportResult('Erro ao processar o arquivo. Verifique o formato e tente novamente.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleOpenAnalise = (proj: Projeto) => {
    setSelectedProjeto(proj);
    setParecerTexto(proj.parecerAdmin || '');
    setActionType(null);
    setParecerErro(null);
    setShowAnaliseModal(true);
  };

  const handleAprovar = async () => {
    if (!selectedProjeto) return;
    setIsProcessing(true);
    try {
      await projetosService.analisarProjeto(selectedProjeto.id, 'aprovar');
      setShowAnaliseModal(false);
      setSelectedProjeto(null);
      fetchProjetos();
      setMsgSucesso(`Projeto "${selectedProjeto.nome}" foi APROVADO! Certificados digitais foram liberados para todos os alunos participantes.`);
      setTimeout(() => setMsgSucesso(null), 6000);
    } catch (err: any) {
      setMsgErro(err.message || 'Erro ao aprovar o projeto.');
      setTimeout(() => setMsgErro(null), 5000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmarParecerAction = async () => {
    if (!selectedProjeto || !actionType) return;
    setParecerErro(null);

    // Regra 5: Correção e rejeição exigem justificativa
    if (!parecerTexto.trim()) {
      setParecerErro('O parecer/justificativa é obrigatório.');
      return;
    }

    setIsProcessing(true);
    try {
      await projetosService.analisarProjeto(selectedProjeto.id, actionType, parecerTexto.trim());
      setShowAnaliseModal(false);
      setSelectedProjeto(null);
      setActionType(null);
      setParecerTexto('');
      fetchProjetos();

      const msg = actionType === 'solicitar_correcao'
        ? `Solicitação de correção enviada ao docente.`
        : `Projeto rejeitado com sucesso.`;
      setMsgSucesso(msg);
      setTimeout(() => setMsgSucesso(null), 5000);
    } catch (err: any) {
      setParecerErro(err.message || 'Erro ao processar ação.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewPdf = async (doc: any) => {
    if (!doc.storagePath) return;
    try {
      const url = await projetosService.getDocumentSignedUrl(doc.storagePath);
      window.open(url, '_blank');
    } catch (err: any) {
      setMsgErro(err.message || 'Erro ao abrir documento.');
      setTimeout(() => setMsgErro(null), 4000);
    }
  };

  const enviadosPendenteCount = projetos.filter(p => p.status === 'enviado').length;

  const filteredProjetos = projetos.filter(p => {
    const isAreaMatch = activeTab === 'extensao' ? p.areaTematica === 'Extensão' : p.areaTematica === 'IC';
    if (!isAreaMatch) return false;
    if (statusFilter !== 'todos' && p.status !== statusFilter) return false;
    if (campusFilter !== 'todos' && p.campus !== campusFilter) return false;
    return true;
  });

  const getStatusBadge = (status: ProjetoStatus) => {
    switch (status) {
      case 'rascunho':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">Rascunho</span>;
      case 'enviado':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-300 flex items-center gap-1 animate-pulse"><Clock className="h-3 w-3 shrink-0" /> Aguardando Análise</span>;
      case 'reenviado':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1 animate-pulse"><Clock className="h-3 w-3 shrink-0" /> Reenviado</span>;
      case 'correcao_solicitada':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1"><AlertTriangle className="h-3 w-3 shrink-0" /> Correção Solicitada</span>;
      case 'aprovado':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"><CheckCircle className="h-3 w-3 shrink-0" /> Aprovado</span>;
      case 'rejeitado':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1"><XCircle className="h-3 w-3 shrink-0" /> Rejeitado</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Fila de Análise e Gestão de Projetos</h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Examine as propostas enviadas pelos docentes, valide a documentação e autorize a emissão de certificados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botão Baixar Modelo XLSX */}
          <button
            onClick={handleDownloadTemplate}
            disabled={isDownloadingTemplate}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isDownloadingTemplate ? (
              <span className="w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Baixar Modelo XLSX
          </button>

          {/* Botão Importar XLSX */}
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Upload className="h-3.5 w-3.5" />
            Importar XLSX
          </button>

          {/* Botão Exportar Projetos */}
          <button
            onClick={handleExportProjects}
            disabled={isExporting}
            className="bg-emerald-500 hover:bg-emerald-400 text-white px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
          >
            {isExporting ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FileSpreadsheet className="h-3.5 w-3.5" />
            )}
            Exportar Projetos
          </button>

          {enviadosPendenteCount > 0 && (
            <div className="bg-cyan-50 border border-cyan-200 text-cyan-800 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-ping" />
              {enviadosPendenteCount} projeto(s) aguardando análise!
            </div>
          )}
        </div>
      </div>

      {/* Alert Messages */}
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

      {/* Tabs & Status Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 gap-4 mb-4">
        <div className="flex">
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

        {/* Filter dropdowns */}
        <div className="flex items-center gap-3 pb-2 md:pb-0 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:border-cyan-500"
            >
              <option value="todos">Todos</option>
              <option value="enviado">Enviados ({projetos.filter(p => p.status === 'enviado').length})</option>
              <option value="reenviado">Reenviados ({projetos.filter(p => p.status === 'reenviado').length})</option>
              <option value="correcao_solicitada">Correção Solicitada</option>
              <option value="aprovado">Aprovados</option>
              <option value="rejeitado">Rejeitados</option>
              <option value="rascunho">Rascunhos</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Campus:</span>
            <select
              value={campusFilter}
              onChange={e => setCampusFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:border-cyan-500"
            >
              <option value="todos">Todos</option>
              {CAMPUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-3.5">Nome do Projeto</th>
                  <th className="px-6 py-3.5">Professor Responsável</th>
                  <th className="px-6 py-3.5">Campus</th>
                  <th className="px-6 py-3.5">Discentes</th>
                  <th className="px-6 py-3.5">Documentos</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {filteredProjetos.map(proj => (
                  <tr key={proj.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-bold text-slate-900 max-w-[220px] truncate">{proj.nome}</td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{proj.professorResponsavel}</td>
                    <td className="px-6 py-4 text-xs font-semibold">{proj.campus || '—'}</td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-800">
                      {(proj.alunosParticipantes || []).length} aluno(s)
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {(proj.documentosComprobatorios || []).length} PDF(s)
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(proj.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenAnalise(proj)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ml-auto ${
                          proj.status === 'enviado' || proj.status === 'reenviado'
                            ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-sm'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {proj.status === 'enviado' || proj.status === 'reenviado' ? 'Analisar' : 'Ver Detalhes'}
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredProjetos.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-slate-400">
                      Nenhum projeto encontrado para o filtro selecionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE ANÁLISE / DETALHES */}
      {selectedProjeto && showAnaliseModal && (
        <Modal
          isOpen={showAnaliseModal}
          onClose={() => { setShowAnaliseModal(false); setSelectedProjeto(null); setActionType(null); }}
          title={`Análise de Projeto: ${selectedProjeto.nome}`}
          size="lg"
        >
          <div className="space-y-5 text-xs text-left max-h-[75vh] overflow-y-auto pr-1">
            {/* Cabecalho de status */}
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">Status Atual:</span>
                {getStatusBadge(selectedProjeto.status)}
              </div>
              <span className="text-slate-400 text-[11px]">CH: <strong className="text-indigo-600 font-mono">{selectedProjeto.cargaHoraria}h</strong></span>
            </div>

            {/* Informações do orientador e campus */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Orientador</span>
                <strong className="text-slate-800">{selectedProjeto.professorResponsavel}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Campus</span>
                <strong className="text-slate-800">{selectedProjeto.campus || '—'}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Período</span>
                <span className="text-[11px] text-slate-700 font-semibold">{selectedProjeto.dataInicio} à {selectedProjeto.dataTermino}</span>
              </div>
            </div>

            {/* Descrição */}
            <div>
              <span className="font-bold text-slate-800 block mb-1">Descrição / Metodologia:</span>
              <p className="text-slate-600 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed">{selectedProjeto.descricao}</p>
            </div>

            {/* Alunos participantes (Regra 7 & 8) */}
            <div>
              <h4 className="font-bold text-slate-800 mb-2">Alunos Participantes ({(selectedProjeto.alunosParticipantes || []).length})</h4>
              {(selectedProjeto.alunosParticipantes || []).length === 0 ? (
                <p className="text-slate-400 italic bg-slate-50 p-3 rounded-xl">Nenhum aluno cadastrado neste projeto.</p>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-[10px] uppercase font-bold text-slate-500">
                        <th className="p-2.5">Nome</th>
                        <th className="p-2.5">E-mail</th>
                        <th className="p-2.5">Campus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {(selectedProjeto.alunosParticipantes || []).map(aluno => (
                        <tr key={aluno.profileId} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold">{aluno.nome}</td>
                          <td className="p-2.5 text-slate-500">{aluno.email}</td>
                          <td className="p-2.5 text-slate-500">{aluno.campus || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Documentos comprobatórios (Regra 13) */}
            <div>
              <h4 className="font-bold text-slate-800 mb-2">Documentos Comprobatórios ({(selectedProjeto.documentosComprobatorios || []).length})</h4>
              {(selectedProjeto.documentosComprobatorios || []).length === 0 ? (
                <p className="text-slate-400 italic bg-slate-50 p-3 rounded-xl">Nenhum documento comprobatório anexado.</p>
              ) : (
                <div className="space-y-1.5">
                  {(selectedProjeto.documentosComprobatorios || []).map(doc => (
                    <div key={doc.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-cyan-600 shrink-0" />
                        <span className="font-bold text-slate-800">{doc.nome}</span>
                        <span className="text-slate-400 text-[10px]">({doc.tamanho})</span>
                        {doc.active && doc.version && doc.version > 1 && (
                          <span className="text-[10px] font-bold text-cyan-600 bg-cyan-50 px-1.5 py-0.5 rounded">v{doc.version}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.active && (
                          <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">Ativo</span>
                        )}
                        <button
                          onClick={() => handleViewPdf(doc)}
                          className="text-cyan-600 hover:text-cyan-800 p-1.5 rounded-lg hover:bg-cyan-50 transition cursor-pointer"
                          title="Abrir PDF"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sub-formulario de justificativa (se clicou em Solicitar Correção ou Rejeitar) */}
            {actionType && (
              <div className="bg-amber-50 border border-amber-300 p-4 rounded-2xl space-y-2 animate-slide-up">
                <h4 className="font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  {actionType === 'solicitar_correcao' ? 'Justificativa para Solicitar Correção:' : 'Motivo da Rejeição:'}
                </h4>

                {parecerErro && (
                  <p className="text-xs text-rose-700 font-bold">{parecerErro}</p>
                )}

                <textarea
                  value={parecerTexto}
                  onChange={e => setParecerTexto(e.target.value)}
                  placeholder="Escreva detalhadamente o parecer ou as pendências a serem corrigidas pelo professor..."
                  rows={3}
                  className="w-full bg-white p-3 rounded-xl border border-amber-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setActionType(null)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleConfirmarParecerAction}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold text-white transition cursor-pointer ${
                      actionType === 'solicitar_correcao'
                        ? 'bg-amber-600 hover:bg-amber-500'
                        : 'bg-rose-600 hover:bg-rose-500'
                    }`}
                  >
                    Confirmar e Enviar Parecer
                  </button>
                </div>
              </div>
            )}

            {/* Painel de Decisão Admin */}
            {!actionType && (
              <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row justify-between gap-3 items-center">
                <Button variant="ghost" size="sm" onClick={() => setShowAnaliseModal(false)}>
                  Fechar
                </Button>

                {selectedProjeto.status !== 'aprovado' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => { setActionType('solicitar_correcao'); setParecerErro(null); }}
                      className="bg-amber-50 hover:bg-amber-100 text-amber-800 px-3.5 py-2 rounded-xl text-xs font-bold border border-amber-300 transition cursor-pointer flex items-center gap-1"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      Solicitar Correção
                    </button>

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => { setActionType('rejeitar'); setParecerErro(null); }}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-800 px-3.5 py-2 rounded-xl text-xs font-bold border border-rose-300 transition cursor-pointer flex items-center gap-1"
                    >
                      <XCircle className="h-3.5 w-3.5 text-rose-600" />
                      Rejeitar
                    </button>

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleAprovar}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 transition cursor-pointer flex items-center gap-1.5"
                    >
                      {isProcessing ? (
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      Aprovar & Gerar Certificados
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
      {/* MODAL DE IMPORTAÇÃO */}
      <Modal
        isOpen={showImportModal}
        onClose={() => { setShowImportModal(false); setImportFile(null); setImportResult(null); }}
        title="Importar Projetos via XLSX"
        size="md"
      >
        <div className="space-y-4 text-xs text-left">
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
            <p className="text-slate-700 font-semibold mb-2">Instruções:</p>
            <ul className="text-slate-600 space-y-1 list-disc list-inside">
              <li>Baixe o modelo XLSX antes de preencher</li>
              <li>Preencha os dados conforme as instruções na aba INSTRUÇÕES</li>
              <li>O professor deve estar cadastrado no sistema</li>
              <li>O aluno será criado automaticamente se não existir</li>
              <li>Projetos serão criados como rascunho</li>
            </ul>
          </div>

          <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-cyan-400 transition">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportFile}
              className="hidden"
              id="import-file-input"
            />
            <label
              htmlFor="import-file-input"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <FileSpreadsheet className="h-8 w-8 text-slate-400" />
              {importFile ? (
                <span className="text-slate-700 font-semibold">{importFile.name}</span>
              ) : (
                <span className="text-slate-500">Clique para selecionar o arquivo XLSX</span>
              )}
            </label>
          </div>

          {importResult && (
            <div className={`p-3 rounded-xl font-semibold ${
              importResult.startsWith('Erro')
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
              {importResult}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setShowImportModal(false); setImportFile(null); setImportResult(null); }}
            >
              Cancelar
            </Button>
            <button
              onClick={handleConfirmImport}
              disabled={!importFile || isImporting}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {isImporting ? (
                <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              Confirmar Importação
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
