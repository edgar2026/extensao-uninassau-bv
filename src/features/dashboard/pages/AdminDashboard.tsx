/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { projetosService } from '../../../services/projetos.service';
import { certificadosService } from '../../../services/certificados.service';
import { alunosService } from '../../../services/alunos.service';
import { Projeto, Certificado, campusDisplay, CAMPUS_OPTIONS } from '../../../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { 
  Plus, Users, FolderOpen, Award 
} from 'lucide-react';
import { Loading } from '../../../components/ui/Loading';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';

export const AdminDashboard: React.FC = () => {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [totalAlunos, setTotalAlunos] = useState(0);
  const [cursosMap, setCursosMap] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      projetosService.getProjetos(),
      certificadosService.getCertificados(),
      alunosService.getAlunosStats()
    ]).then(([p, c, stats]) => {
      setProjetos(p);
      setCertificados(c);
      setTotalAlunos(stats.totalCount);
      setCursosMap(stats.cursosMap);
      setIsLoading(false);
    }).catch((err) => {
      console.error('Erro ao carregar dados do painel:', err);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return <Loading message="Carregando painel geral..." />;
  }

  const totalProjetos = projetos.length;
  const aprovados = projetos.filter(p => p.status === 'aprovado').length;
  const pendentesAnalise = projetos.filter(p => p.status === 'enviado' || p.status === 'reenviado').length;
  const totalCertificados = certificados.length;

  // Projetos por campus — usando o campo correto p.campus
  const projetosPorUnidade = CAMPUS_OPTIONS.map(opt => ({
    name: opt.label.replace('UNINASSAU ', ''),
    Projetos: projetos.filter(p => p.campus === opt.value).length,
  })).filter(item => item.Projetos > 0);

  const participantesPorCurso = Object.entries(cursosMap)
    .map(([name, val]) => ({ name: name.substring(0, 14), Alunos: Number(val) }))
    .sort((a, b) => b.Alunos - a.Alunos)
    .slice(0, 6);

  // Evolução de certificados por mês — calculado dos dados reais
  const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const certPorMes: Record<string, number> = {};
  certificados.forEach((c) => {
    if (c.dataEmissao) {
      const d = new Date(c.dataEmissao);
      const label = MESES[d.getMonth()];
      certPorMes[label] = (certPorMes[label] || 0) + 1;
    }
  });
  const evolucaoCertificados = Object.entries(certPorMes).map(([name, Emitidos]) => ({ name, Emitidos }));

  const distribuicaoArea = [
    { name: 'Extensão', value: projetos.filter(p => p.areaTematica === 'Extensão').length },
    { name: 'IC', value: projetos.filter(p => p.areaTematica === 'IC').length }
  ].filter(i => i.value > 0);

  const COLORS = ['#0891b2', '#6366f1', '#f59e0b', '#10b981'];

  return (
    <div className="space-y-8 animate-fade-in text-left">
      
      {/* STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-500">
            <FolderOpen className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Aguardando Análise</span>
            <span className="text-2xl font-black text-cyan-600">{pendentesAnalise}</span>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
            <Plus className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Projetos Aprovados</span>
            <span className="text-2xl font-black text-emerald-600">{aprovados}</span>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Alunos Cadastrados</span>
            <span className="text-2xl font-black text-slate-800">{totalAlunos}</span>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Certificados Emitidos</span>
            <span className="text-2xl font-black text-slate-800">{totalCertificados}</span>
          </div>
        </Card>
      </div>

      {/* CHARTS GRAPHICS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-bold text-slate-800 text-sm mb-4">Volume de Projetos por Unidade Acadêmica</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projetosPorUnidade}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="Projetos" fill="#0891b2" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="font-bold text-slate-800 text-sm mb-4">Alunos Cadastrados por Curso</h3>
          <div className="h-60">
            {participantesPorCurso.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={participantesPorCurso}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="Alunos" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="Importe a base de alunos para visualizar a distribuição por curso." />
            )}
          </div>
        </Card>

        <Card>
          <h3 className="font-bold text-slate-800 text-sm mb-4">Evolução Mensal de Certificados Emitidos</h3>
          <div className="h-60">
            {evolucaoCertificados.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolucaoCertificados}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="Emitidos" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="Nenhum certificado emitido ainda. Os dados aparecerão aqui após a primeira emissão." />
            )}
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm mb-1">Distribuição de Projetos por Grade</h3>
            <p className="text-slate-400 text-[11px] mb-4">Divisão proporcional entre Extensão e IC</p>
          </div>
          <div className="h-44 flex items-center justify-center">
            {distribuicaoArea.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distribuicaoArea}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {distribuicaoArea.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400 text-center">Nenhum projeto cadastrado no sistema.</div>
            )}
          </div>
          <div className="flex justify-center gap-4 text-[10px] font-bold text-slate-500 mt-4 flex-wrap">
            <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#0891b2]" /><span>Extensão</span></div>
            <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#6366f1]" /><span>IC (Iniciação Científica)</span></div>
          </div>
        </Card>
      </div>

    </div>
  );
};
