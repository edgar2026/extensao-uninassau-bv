/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen w-screen overflow-x-hidden bg-slate-50 font-sans text-slate-800">
      {children}
    </div>
  );
};
