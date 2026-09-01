/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BaseDashboardLayout } from './BaseDashboardLayout';
import { LayoutDashboard, FolderOpen, Award } from 'lucide-react';

export const ProfessorLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard Docente', path: '/professor/dashboard' },
    { icon: FolderOpen,      label: 'Meus Projetos',     path: '/professor/projetos' },
    { icon: Award,           label: 'Meus Certificados', path: '/professor/certificados' },
  ];

  return <BaseDashboardLayout menuItems={menuItems}>{children}</BaseDashboardLayout>;
};

