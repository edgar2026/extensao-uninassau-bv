/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { projetosService } from '../../../services/projetos.service';
import { Projeto } from '../../../types';
import { Loading } from '../../../components/ui/Loading';
import { Card } from '../../../components/ui/Card';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Clock, Users, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

export const AlunoProjetos: React.FC = () => {
  const { user } = useAuth();
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'extensao' | 'ic'>('extensao');

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const p = await projetosService.getProjetosByAluno(user.id);
        if (!cancelled) setProjetos(p);
      } catch {
        if (!cancelled) setError('Não foi possível carregar seus projetos. Tente novamente.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [user?.id]);

  if (isLoading) {
    return <Loading message="Buscando seus projetos..." />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <AlertTriangle className="h-10 w-10 text-amber-500 mb-4" />
        <p className="text-sm text-slate-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-500 text-white hover:bg-cyan-600 transition-colors cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Tentar novamente
        </button>
      </div>
    );
  }

  const filteredProjetos = projetos.filter(p => {
    if (activeTab === 'extensao') return p.areaTematica === 'Extensão';
    return p.areaTematica === 'IC';
  });

  const getStatusIcon = (status: string) => {
    if (status === 'aprovado') return <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />;
    if (status === 'enviado') return <Clock className="h-3.5 w-3.5 shrink-0" />;
    if (status === 'correcao_solicitada') return <AlertTriangle className="h-3.5 w-3.5 shrink-0" />;
    return null;
  };

  const getStatusStyle = (status: string) => {
    if (status === 'aprovado') return 'bg-emerald-50 border-emerald-200 text-emerald-700';
    if (status === 'enviado') return 'bg-cyan-50 border-cyan-200 text-cyan-700';
    if (status === 'correcao_solicitada') return 'bg-amber-50 border-amber-200 text-amber-700';
    if (status === 'rejeitado') return 'bg-rose-50 border-rose-200 text-rose-700';
    return 'bg-slate-50 border-slate-200 text-slate-600';
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Projetos Acadêmicos Vinculados</h2>
        <p className="text-slate-400 text-xs">
          Visualize todos os projetos ativos ou históricos que foram vinculados à sua matrícula.
        </p>
      </div>

      {/* Segment Tab Bar */}
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
          IC - Iniciação Científica
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredProjetos.map(proj => (
          <Card key={proj.id} className="hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start gap-4 mb-3">
                <StatusBadge value={proj.areaTematica} />
                <StatusBadge value={proj.status} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">{proj.nome}</h3>
              <p className="text-xs text-slate-500 line-clamp-3 mb-4">{proj.descricao}</p>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Orientador:</span>
                <span className="font-semibold text-slate-800">{proj.professorResponsavel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Campus:</span>
                <span className="font-semibold text-slate-800">{proj.campus || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Período Letivo:</span>
                <span className="font-semibold text-slate-800">
                  {new Date(proj.dataInicio).toLocaleDateString('pt-BR')} até {new Date(proj.dataTermino).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1 text-slate-400">
                  <Users className="h-3 w-3" /> Grupo:
                </span>
                <span className="font-semibold text-slate-700">{proj.participantesCount} aluno{proj.participantesCount !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-400">Carga Horária:</span>
                <span className="font-mono font-bold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded">{proj.cargaHoraria} horas</span>
              </div>

              <div className={`mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-semibold border ${getStatusStyle(proj.status)}`}>
                {getStatusIcon(proj.status)}
                <span>
                  {proj.status === 'Ativo' && 'Projeto ativo — aguarde a conclusão para certificado.'}
                  {proj.status === 'Em análise' && 'Projeto em análise pelo administrador.'}
                  {proj.status === 'Correção solicitada' && 'Correção solicitada ao professor responsável.'}
                  {proj.status !== 'Ativo' && proj.status !== 'Em análise' && proj.status !== 'Correção solicitada' && `Status: ${proj.status}`}
                </span>
              </div>
            </div>
          </Card>
        ))}

        {filteredProjetos.length === 0 && (
          <div className="col-span-2">
            <EmptyState message="Nenhum projeto vinculado a esta categoria no momento. Entre em contato com seu professor responsável." />
          </div>
        )}
      </div>
    </div>
  );
};
