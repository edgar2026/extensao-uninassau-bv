/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { projetosService } from '../../../services/projetos.service';
import { certificadosService } from '../../../services/certificados.service';
import { Projeto, Certificado } from '../../../types';
import { Award, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { Loading } from '../../../components/ui/Loading';
import { Card } from '../../../components/ui/Card';
import { StatusBadge } from '../../../components/ui/StatusBadge';

export const AlunoDashboard: React.FC = () => {
  const { user } = useAuth();
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'extensao' | 'ic'>('extensao');

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [p, c] = await Promise.all([
          projetosService.getProjetosByAluno(user.id),
          certificadosService.getCertificadosByAluno(user.id).catch(() => [] as Certificado[]),
        ]);
        if (!cancelled) {
          setProjetos(p);
          setCertificados(c);
        }
      } catch {
        if (!cancelled) setError('Não foi possível carregar o painel do aluno. Tente novamente.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [user?.id]);

  if (isLoading) {
    return <Loading message="Carregando painel do aluno..." />;
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

  // Helper function to check if a certificate belongs to Extensao
  const isCertExtensao = (cert: Certificado) => {
    const proj = projetos.find(p => p.nome === cert.projetoNome);
    if (!proj) return true; // default
    return proj.areaTematica === 'Extensão';
  };

  // Filter projects by active tab
  const filteredProjetos = projetos.filter(p => {
    if (activeTab === 'extensao') {
      return p.areaTematica === 'Extensão';
    } else {
      return p.areaTematica === 'IC';
    }
  });

  // Filter certificates by active tab
  const filteredCertificados = certificados.filter(c => {
    const isExt = isCertExtensao(c);
    return activeTab === 'extensao' ? isExt : !isExt;
  });

  const certificadosProntos = filteredCertificados.filter(c => c.situacao === 'Válido').length;
  const certificadosPendentes = filteredProjetos.length - certificadosProntos; // Simplified pending calculation or count based on report status

  // Or let's count certificates with status disponsivel / emitido vs pending
  // Since certificates are already generated, a pending certificate can also be derived from relatorios or simply:
  // certificates that are not yet generated for active projects.
  // Let's count actual certificates in db as ready, and projects without certificates as pending.
  const readyCount = filteredCertificados.length;
  // For pending, let's see how many projects in this tab don't have a certificate yet.
  const pendingCount = filteredProjetos.filter(p => !filteredCertificados.some(c => c.projetoNome === p.nome)).length;

  return (
    <div className="space-y-8 animate-fade-in text-left">
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

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Certificados Prontos</span>
            <span className="text-2xl font-black text-slate-800">{readyCount}</span>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Projetos/Certificados Pendentes</span>
            <span className="text-2xl font-black text-slate-800">{pendingCount}</span>
          </div>
        </Card>
      </div>

      {/* PROJECTS TABLE */}
      <Card padded={false} className="overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-sm">
            {activeTab === 'extensao' ? 'Meus Projetos de Extensão Atuais' : 'Meus Projetos de Iniciação Científica Atuais'}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-3.5">Nome do Projeto</th>
                <th className="px-6 py-3.5">Área Temática</th>
                <th className="px-6 py-3.5">Professor Responsável</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Carga Horária</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
              {filteredProjetos.map(proj => (
                <tr key={proj.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-semibold text-slate-800">{proj.nome}</td>
                  <td className="px-6 py-4">
                    <StatusBadge value={proj.areaTematica} />
                  </td>
                  <td className="px-6 py-4">{proj.professorResponsavel}</td>
                  <td className="px-6 py-4">
                    <StatusBadge value={proj.status === 'Ativo' ? 'Ativo' : 'Pendente'} />
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-bold">{proj.cargaHoraria}h</td>
                </tr>
              ))}
              {filteredProjetos.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400">
                    Você ainda não foi vinculado a nenhum projeto nesta categoria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  );
};
