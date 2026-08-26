/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FileQuestion } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  message: string;
  icon?: React.ComponentType<any>;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Nenhum registro encontrado',
  message,
  icon: Icon = FileQuestion
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center w-full select-none">
      <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3 border border-slate-200">
        <Icon className="h-6 w-6" />
      </div>
      {title && <h4 className="font-bold text-slate-800 text-sm mb-1">{title}</h4>}
      <p className="text-slate-400 text-xs max-w-sm leading-relaxed">{message}</p>
    </div>
  );
};
