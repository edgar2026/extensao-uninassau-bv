/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

interface AlertProps {
  type?: 'error' | 'success' | 'info';
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  children,
  onClose,
  className = ''
}) => {
  const styles = {
    error: 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400',
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    info: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-600 dark:text-cyan-400'
  };

  const icons = {
    error: AlertCircle,
    success: CheckCircle,
    info: Info
  };

  const Icon = icons[type];

  return (
    <div className={`border p-3.5 rounded-xl flex items-start gap-2.5 text-xs font-medium ${styles[type]} ${className}`}>
      <Icon className="h-4 w-4 shrink-0 mt-0.5" />
      <div className="flex-1">{children}</div>
      {onClose && (
        <button onClick={onClose} className="p-0.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-md shrink-0">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
