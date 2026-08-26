/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface StatusBadgeProps {
  value: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ value, className = '' }) => {
  const norm = value.trim().toLowerCase();

  let colors = 'bg-slate-100 text-slate-600 border-slate-200';

  if (norm === 'admin') {
    colors = 'bg-rose-50 text-rose-600 border-rose-100';
  } else if (norm === 'coordenacao' || norm === 'coordenador' || norm === 'pendente' || norm === 'correcao_solicitada' || norm === 'correção solicitada') {
    colors = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (norm === 'professor' || norm === 'docente' || norm === 'pesquisa') {
    colors = 'bg-indigo-50 text-indigo-600 border-indigo-100';
  } else if (norm === 'aluno' || norm === 'discente' || norm === 'ativo' || norm === 'aprovado' || norm === 'válido') {
    colors = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (norm === 'enviado' || norm === 'concluído' || norm === 'em análise' || norm === 'pic' || norm === 'ic') {
    colors = 'bg-cyan-50 text-cyan-700 border-cyan-200';
  } else if (norm === 'rejeitado' || norm === 'reprovado' || norm === 'cancelado' || norm === 'revogado') {
    colors = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (norm === 'extensão' || norm === 'rascunho' || norm === 'aguardando envio') {
    colors = 'bg-slate-100 text-slate-700 border-slate-200';
  }

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border select-none inline-block whitespace-nowrap ${colors} ${className}`}>
      {value}
    </span>
  );
};
