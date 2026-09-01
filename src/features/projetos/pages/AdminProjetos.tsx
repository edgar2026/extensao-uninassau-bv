/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { projetosService } from '../../../services/projetos.service';
import { Projeto, ProjetoStatus, CAMPUS_OPTIONS } from '../../../types';
import {
  CheckCircle, AlertTriangle, XCircle, Eye, FileText,
  Clock, RotateCcw, Filter, Download, ChevronDown,
  FileSpreadsheet, FileDown, X
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { exportProjectsToXlsx, exportProjectsToCsv, exportProjectsToPdf } from '../utils/xlsxUtils';

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

  // Export states
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const fetchProjetos = async () => {
    setIsLoading(true);
    const data = await projetosService.getProjetos();
    setProjetos(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProjetos();
  }, []);

  // Fechar dropdown de exportação ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Base de projetos válidos para a aba e campus ativos (exclui rascunhos de docentes)
  const baseProjetos = projetos.filter(p => {
    if (p.status === 'rascunho') return false;
    const isAreaMatch = activeTab === 'extensao' ? p.areaTematica === 'Extensão' : p.areaTematica === 'IC';
    if (!isAreaMatch) return false;
    if (campusFilter !== 'todos' && p.campus !== campusFilter) return false;
    return true;
  });

  // Contagens dos 3 indicadores administrativos
  const countPrimeiraAnalise = baseProjetos.filter(p => p.status === 'enviado').length;
  const countCorrecaoProfessor = baseProjetos.filter(p => p.status === 'correcao_solicitada').length;
  const countReenviados = baseProjetos.filter(p => p.status === 'reenviado').length;

  // Filtragem final para a tabela
  const filteredProjetos = baseProjetos.filter(p => {
    if (statusFilter !== 'todos' && p.status !== statusFilter) return false;
    return true;
  });

  // Handler unificado de exportação respeitando filtros ativos
  const handleExport = (type: 'excel' | 'csv' | 'pdf') => {
    setShowExportMenu(false);

    if (filteredProjetos.length === 0) {
      setMsgErro('Nenhum projeto encontrado para exportar com os filtros ativos.');
      setTimeout(() => setMsgErro(null), 4000);
      return;
    }

    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      const suffix = activeTab === 'extensao' ? 'extensao' : 'iniciacao_cientifica';

      if (type === 'excel') {
        exportProjectsToXlsx(filteredProjetos, `projetos_${suffix}_${timestamp}.xlsx`);
        setMsgSucesso(`${filteredProjetos.length} projeto(s) exportado(s) em Excel com sucesso!`);
      } else if (type === 'csv') {
        exportProjectsToCsv(filteredProjetos, `projetos_${suffix}_${timestamp}.csv`);
        setMsgSucesso(`${filteredProjetos.length} projeto(s) exportado(s) em CSV com sucesso!`);
      } else if (type === 'pdf') {
        exportProjectsToPdf(filteredProjetos, `relatorio_projetos_${suffix}_${timestamp}.pdf`);
        setMsgSucesso(`Relatório PDF gerado com ${filteredProjetos.length} projeto(s)!`);
      }
      setTimeout(() => setMsgSucesso(null), 4000);
    } catch (err: any) {
      console.error('[AdminProjetos] Erro ao exportar:', err);
      setMsgErro('Erro ao exportar arquivo. Tente novamente.');
      setTimeout(() => setMsgErro(null), 4000);
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

    // Regra: Correção e rejeição exigem justificativa
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

  const getStatusBadge = (status: ProjetoStatus) => {
    switch (status) {
      case 'rascunho':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">Rascunho</span>;
      case 'enviado':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
            <Clock className="h-3 w-3 shrink-0 text-blue-600 animate-pulse" /> Aguardando Análise
          </span>
        );
      case 'reenviado':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1">
            <RotateCcw className="h-3 w-3 shrink-0 text-purple-600" /> Reenviado
          </span>
        );
      case 'correcao_solicitada':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600" /> Aguardando correção do professor
          </span>
        );
      case 'aprovado':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <CheckCircle className="h-3 w-3 shrink-0" /> Aprovado
          </span>
        );
      case 'rejeitado':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
            <XCircle className="h-3 w-3 shrink-0" /> Rejeitado
          </span>
        );
      default:
        return null;
    }
  };

  const getStatusFilterLabel = (status: string) => {
    switch (status) {
      case 'enviado': return 'Aguardando primeira análise';
      case 'correcao_solicitada': return 'Aguardando correção do professor';
      case 'reenviado': return 'Reenviados para nova análise';
      case 'aprovado': return 'Aprovados';
      case 'rejeitado': return 'Rejeitados';
      default: return 'Todos';
    }
  };

  // Textos formatados com singular / plural rigoroso
  const textoPrimeiraAnalise = `${countPrimeiraAnalise} ${countPrimeiraAnalise === 1 ? 'projeto aguardando' : 'projetos aguardando'} primeira análise`;
  const textoCorrecaoProfessor = `${countCorrecaoProfessor} ${countCorrecaoProfessor === 1 ? 'projeto aguardando' : 'projetos aguardando'} correção do professor`;
  const textoReenviados = `${countReenviados} ${countReenviados === 1 ? 'projeto reenviado' : 'projetos reenviados'} para nova análise`;

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Header com Título e Botão de Exportação */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Fila de Análise e Gestão de Projetos</h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Examine as propostas enviadas pelos docentes, valide a documentação e autorize a emissão de certificados.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão Único de Exportar com Menu Suspenso */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm"
              title="Opções de Exportação"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Exportar</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 animate-fade-in">
                <button
                  onClick={() => handleExport('excel')}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer transition"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Exportar Excel (.xlsx)</span>
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer transition"
                >
                  <FileText className="h-4 w-4 text-cyan-600 shrink-0" />
                  <span>Exportar CSV (.csv)</span>
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer transition"
                >
                  <FileDown className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>Exportar PDF (.pdf)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cards de Acompanhamento (Indicadores Administrativos) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Card 1: Aguardando primeira análise */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'enviado' ? 'todos' : 'enviado')}
          className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center gap-3.5 ${
            statusFilter === 'enviado'
              ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
              : countPrimeiraAnalise > 0
              ? 'bg-white border-blue-200/80 hover:border-blue-300 hover:bg-blue-50/30 shadow-xs'
              : 'bg-white/60 border-slate-200/70 hover:bg-white hover:border-slate-300 opacity-75 shadow-xs'
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
            statusFilter === 'enviado' || countPrimeiraAnalise > 0
              ? 'bg-blue-100 text-blue-700'
              : 'bg-slate-100 text-slate-400'
          }`}>
            <Clock className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-900 leading-none">{countPrimeiraAnalise}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                statusFilter === 'enviado' ? 'text-blue-700' : 'text-slate-400'
              }`}>
                {countPrimeiraAnalise === 1 ? 'Projeto' : 'Projetos'}
              </span>
            </div>
            <p className={`text-xs font-bold truncate mt-0.5 ${
              statusFilter === 'enviado' ? 'text-blue-950' : 'text-slate-800'
            }`}>
              {textoPrimeiraAnalise}
            </p>
            <p className="text-[10px] text-blue-600/90 font-medium">Aguardando decisão administrativa</p>
          </div>
        </button>

        {/* Card 2: Aguardando correção do professor */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'correcao_solicitada' ? 'todos' : 'correcao_solicitada')}
          className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center gap-3.5 ${
            statusFilter === 'correcao_solicitada'
              ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
              : countCorrecaoProfessor > 0
              ? 'bg-white border-amber-200/80 hover:border-amber-300 hover:bg-amber-50/30 shadow-xs'
              : 'bg-white/60 border-slate-200/70 hover:bg-white hover:border-slate-300 opacity-75 shadow-xs'
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
            statusFilter === 'correcao_solicitada' || countCorrecaoProfessor > 0
              ? 'bg-amber-100 text-amber-700'
              : 'bg-slate-100 text-slate-400'
          }`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-900 leading-none">{countCorrecaoProfessor}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                statusFilter === 'correcao_solicitada' ? 'text-amber-700' : 'text-slate-400'
              }`}>
                {countCorrecaoProfessor === 1 ? 'Projeto' : 'Projetos'}
              </span>
            </div>
            <p className={`text-xs font-bold truncate mt-0.5 ${
              statusFilter === 'correcao_solicitada' ? 'text-amber-950' : 'text-slate-800'
            }`}>
              {textoCorrecaoProfessor}
            </p>
            <p className="text-[10px] text-amber-600/95 font-medium">Ação do docente · Admin acompanha</p>
          </div>
        </button>

        {/* Card 3: Reenviados para nova análise */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'reenviado' ? 'todos' : 'reenviado')}
          className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center gap-3.5 ${
            statusFilter === 'reenviado'
              ? 'bg-purple-50/90 border-purple-500 ring-2 ring-purple-500/20 shadow-sm'
              : countReenviados > 0
              ? 'bg-white border-purple-200/80 hover:border-purple-300 hover:bg-purple-50/30 shadow-xs'
              : 'bg-white/60 border-slate-200/70 hover:bg-white hover:border-slate-300 opacity-75 shadow-xs'
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
            statusFilter === 'reenviado' || countReenviados > 0
              ? 'bg-purple-100 text-purple-700'
              : 'bg-slate-100 text-slate-400'
          }`}>
            <RotateCcw className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-900 leading-none">{countReenviados}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                statusFilter === 'reenviado' ? 'text-purple-700' : 'text-slate-400'
              }`}>
                {countReenviados === 1 ? 'Projeto' : 'Projetos'}
              </span>
            </div>
            <p className={`text-xs font-bold truncate mt-0.5 ${
              statusFilter === 'reenviado' ? 'text-purple-950' : 'text-slate-800'
            }`}>
              {textoReenviados}
            </p>
            <p className="text-[10px] text-purple-600/90 font-medium">Voltou para decisão administrativa</p>
          </div>
        </button>
      </div>

      {/* Barra de Filtro Ativo com Botão de Limpar */}
      {statusFilter !== 'todos' && (
        <div className="flex items-center justify-between bg-slate-100/70 border border-slate-200/80 px-3.5 py-2 rounded-xl text-xs animate-fade-in">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <span>
              Filtrando por: <strong className="text-slate-900">{getStatusFilterLabel(statusFilter)}</strong> ({filteredProjetos.length} encontrado{filteredProjetos.length === 1 ? '' : 's'})
            </span>
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter('todos')}
            className="text-xs font-bold text-slate-700 hover:text-slate-950 hover:underline cursor-pointer flex items-center gap-1 transition"
          >
            <X className="h-3.5 w-3.5" />
            Limpar filtro (Exibir todos)
          </button>
        </div>
      )}

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
              <option value="todos">Todos os status</option>
              <option value="enviado">Aguardando 1ª análise ({countPrimeiraAnalise})</option>
              <option value="reenviado">Reenviados para nova análise ({countReenviados})</option>
              <option value="correcao_solicitada">Aguardando correção do professor ({countCorrecaoProfessor})</option>
              <option value="aprovado">Aprovados ({baseProjetos.filter(p => p.status === 'aprovado').length})</option>
              <option value="rejeitado">Rejeitados ({baseProjetos.filter(p => p.status === 'rejeitado').length})</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Campus:</span>
            <select
              value={campusFilter}
              onChange={e => setCampusFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:border-cyan-500"
            >
              <option value="todos">Todos os campi</option>
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

            {/* Alunos participantes */}
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

            {/* Documentos comprobatórios (PDF do projeto preservado) */}
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

            {/* Sub-formulário de justificativa (Solicitar Correção ou Rejeitar) */}
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
    </div>
  );
};
