/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { projetosService } from '../../../services/projetos.service';
import { Projeto } from '../../../types';
import { FolderOpen, Users, Clock, CheckCircle2 } from 'lucide-react';
import { Loading } from '../../../components/ui/Loading';
import { Card } from '../../../components/ui/Card';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { EmptyState } from '../../../components/ui/EmptyState';

export const ProfessorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.nome) {
      projetosService.getProjetos().then(allP => {
        const p = allP.filter(proj =>
          proj.professorResponsavel.toLowerCase().includes(user.nome.toLowerCase())
        );
        setProjetos(p);
        setIsLoading(false);
      });
    }
  }, [user]);

  if (isLoading) {
    return <Loading message="Carregando painel docente..." />;
  }

  const totalAlunos = projetos.reduce((acc, curr) => acc + (curr.alunosParticipantes?.length || curr.participantesCount || 0), 0);
  const projetosEmAnalise = projetos.filter(p => p.status === 'enviado').length;
  const projetosAprovados = projetos.filter(p => p.status === 'aprovado').length;

  return (
    <div className="space-y-8 animate-fade-in text-left">

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-500">
            <FolderOpen className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Meus Projetos</span>
            <span className="text-2xl font-black text-slate-800">{projetos.length}</span>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Alunos Vinculados</span>
            <span className="text-2xl font-black text-slate-800">{totalAlunos}</span>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Em Análise</span>
            <span className="text-2xl font-black text-slate-800">{projetosEmAnalise}</span>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Aprovados/Ativos</span>
            <span className="text-2xl font-black text-slate-800">{projetosAprovados}</span>
          </div>
        </Card>
      </div>

      {/* PROJETOS TABLE */}
      <Card padded={false} className="overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-sm">Meus Projetos de Extensão</h3>
          <p className="text-xs text-slate-400 mt-0.5">Projetos registrados em seu nome no sistema</p>
        </div>
        <div className="overflow-x-auto">
          {projetos.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-3.5">Nome do Projeto</th>
                  <th className="px-6 py-3.5">Área</th>
                  <th className="px-6 py-3.5">Alunos</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Carga Horária</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                {projetos.map(proj => (
                  <tr key={proj.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-semibold text-slate-800">{proj.nome}</td>
                    <td className="px-6 py-4">
                      <StatusBadge value={proj.areaTematica} />
                    </td>
                    <td className="px-6 py-4">{proj.participantesCount} aluno{proj.participantesCount !== 1 ? 's' : ''}</td>
                    <td className="px-6 py-4">
                      <StatusBadge value={proj.status} />
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold">{proj.cargaHoraria}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-6">
              <EmptyState message="Você ainda não possui projetos cadastrados. Acesse 'Meus Projetos' para registrar o primeiro." />
            </div>
          )}
        </div>
      </Card>

    </div>
  );
};
