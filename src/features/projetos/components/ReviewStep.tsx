/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlunoParticipante, DocumentoComprobatorio, ProjetoArea, CampusCode, campusDisplay, UserAccessStatus } from '../../../types';
import { FileText, Users, CheckCircle, AlertTriangle, Calendar, Clock, MapPin, Eye } from 'lucide-react';
import { projetosService } from '../../../services/projetos.service';

interface ReviewStepProps {
  nome: string;
  areaTematica: ProjetoArea;
  campus: CampusCode | '';
  descricao: string;
  dataInicio: string;
  dataTermino: string;
  cargaHoraria: number;
  professorNome: string;
  alunos: AlunoParticipante[];
  documentos: DocumentoComprobatorio[];
  canSubmit: boolean;
  missingFields: string[];
}

function computeAccessStatus(p: { first_access_completed: boolean }): UserAccessStatus {
  return p.first_access_completed ? 'access_completed' : 'first_access_pending';
}

function accessStatusBadge(status: UserAccessStatus): { label: string; color: string } {
  switch (status) {
    case 'first_access_pending':
      return { label: 'Pendente', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'access_completed':
      return { label: 'Ativo', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    default:
      return { label: status, color: 'bg-slate-50 text-slate-600 border-slate-200' };
  }
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  nome, areaTematica, campus, descricao,
  dataInicio, dataTermino, cargaHoraria, professorNome,
  alunos, documentos, canSubmit, missingFields,
}) => {
  const activeDoc = documentos.find(d => d.active);

  const handleViewPdf = async () => {
    if (!activeDoc?.storagePath) return;
    try {
      const url = await projetosService.getDocumentSignedUrl(activeDoc.storagePath);
      window.open(url, '_blank');
    } catch {
      // Error handled silently
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <CheckCircle className="h-4 w-4 text-cyan-600" />
        <span className="font-bold text-slate-800 text-xs">Revisão Final</span>
      </div>

      {!canSubmit && missingFields.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-rose-800 mb-1">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            Campos obrigatórios faltando:
          </div>
          <ul className="text-rose-700 list-disc list-inside space-y-0.5 pl-4">
            {missingFields.map(f => <li key={f}>{f}</li>)}
          </ul>
        </div>
      )}

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-50 text-indigo-600">
            {areaTematica}
          </span>
        </div>

        <h3 className="text-sm font-bold text-slate-900">{nome}</h3>
        <p className="text-xs text-slate-600 leading-relaxed">{descricao}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
          <div className="bg-white p-2 rounded-lg border border-slate-100 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Campus</span>
              <span className="font-bold text-slate-700">{campusDisplay(campus) || '—'}</span>
            </div>
          </div>
          <div className="bg-white p-2 rounded-lg border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Professor</span>
            <span className="font-bold text-slate-700 text-[11px] truncate block">{professorNome || '—'}</span>
          </div>
          <div className="bg-white p-2 rounded-lg border border-slate-100 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-indigo-500" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">CH</span>
              <span className="font-bold font-mono text-indigo-600">{cargaHoraria}h</span>
            </div>
          </div>
          <div className="bg-white p-2 rounded-lg border border-slate-100 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-cyan-500" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Período</span>
              <span className="font-semibold text-[10px] text-slate-700">{dataInicio} à {dataTermino}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Users className="h-4 w-4 text-cyan-600" />
          <span className="font-bold text-slate-800 text-xs">
            Participantes ({alunos.length} aluno{alunos.length !== 1 ? 's' : ''})
          </span>
        </div>
        {alunos.length > 0 ? (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[10px] uppercase font-bold text-slate-500">
                  <th className="p-2">Nome</th>
                  <th className="p-2">E-mail</th>
                  <th className="p-2">Campus</th>
                  <th className="p-2">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {alunos.map(a => {
                  const status = computeAccessStatus({ first_access_completed: a.firstAccessCompleted ?? false });
                  const badge = accessStatusBadge(status);
                  return (
                    <tr key={a.profileId}>
                      <td className="p-2 font-bold">{a.nome}</td>
                      <td className="p-2 text-slate-500">{a.email}</td>
                      <td className="p-2 text-slate-500">{campusDisplay(a.campus) || '—'}</td>
                      <td className="p-2">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[11px] text-rose-500 italic">Nenhum participante adicionado.</p>
        )}
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-4 w-4 text-cyan-600" />
          <span className="font-bold text-slate-800 text-xs">
            Documento Comprobatório
          </span>
        </div>
        {activeDoc ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span className="font-bold text-slate-800">{activeDoc.nome}</span>
                <span className="text-slate-400 text-[10px]">({activeDoc.tamanho})</span>
              </div>
              <button
                type="button"
                onClick={handleViewPdf}
                className="text-cyan-600 hover:text-cyan-800 p-1 cursor-pointer flex items-center gap-1 text-[10px] font-semibold"
              >
                <Eye className="h-3.5 w-3.5" /> Visualizar
              </button>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-slate-400">
              <span>Tipo: PDF</span>
              <span>Tamanho: {activeDoc.tamanho}</span>
              {activeDoc.version && activeDoc.version > 1 && (
                <span className="font-bold text-cyan-600">v{activeDoc.version}</span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs">
            <AlertTriangle className="h-4 w-4 text-rose-500" />
            <span className="text-rose-600 font-semibold">Nenhum PDF anexado.</span>
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs">
        <p className="text-amber-800 font-medium">
          Ao enviar para análise, o projeto será bloqueado para edição até a decisão do administrador.
        </p>
      </div>
    </div>
  );
};
