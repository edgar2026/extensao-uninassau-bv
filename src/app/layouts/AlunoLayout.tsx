/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BaseDashboardLayout } from './BaseDashboardLayout';
import { LayoutDashboard, FolderOpen, Award } from 'lucide-react';

export const AlunoLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const menuItems = [
    { icon: LayoutDashboard, label: 'Meu Dashboard', path: '/aluno/dashboard' },
    { icon: FolderOpen, label: 'Projetos Vinculados', path: '/aluno/projetos' },
    { icon: Award, label: 'Meus Certificados', path: '/aluno/certificados' }
  ];

  return <BaseDashboardLayout menuItems={menuItems}>{children}</BaseDashboardLayout>;
};
