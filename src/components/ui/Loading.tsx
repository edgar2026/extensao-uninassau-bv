/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export const Loading: React.FC<LoadingProps> = ({
  message = 'Carregando...',
  fullScreen = false
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
      <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-xs font-semibold animate-pulse">{message}</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-400">
        {content}
      </div>
    );
  }

  return (
    <div className="py-12 text-center flex items-center justify-center w-full">
      {content}
    </div>
  );
};
