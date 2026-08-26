/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useLocation, Link } from 'react-router-dom';

// Mapa de rótulos em pt-BR para cada segmento de rota
const ROUTE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  professor: 'Professor',
  aluno: 'Aluno',
  dashboard: 'Painel',
  usuarios: 'Usuários',
  projetos: 'Projetos',
  certificados: 'Certificados',
  assinaturas: 'Assinaturas Digitais',
  validar: 'Validação',
};

const toLabel = (segment: string) =>
  ROUTE_LABELS[segment] ?? segment.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export const Breadcrumb: React.FC = () => {
  const location = useLocation();
  const paths = location.pathname.split('/').filter(Boolean);

  if (paths.length === 0) return null;

  return (
    <div className="flex items-center gap-1 text-[11px] text-slate-400 select-none">
      <Link to="/" className="hover:text-cyan-500 transition">Portal</Link>
      {paths.map((p, idx) => {
        const url = `/${paths.slice(0, idx + 1).join('/')}`;
        const isLast = idx === paths.length - 1;
        const name = toLabel(p);

        return (
          <React.Fragment key={url}>
            <span>/</span>
            {isLast ? (
              <span className="text-slate-600 font-medium">{name}</span>
            ) : (
              <Link to={url} className="hover:text-cyan-500 transition">{name}</Link>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
