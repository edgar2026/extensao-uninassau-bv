/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BaseDashboardLayout } from './BaseDashboardLayout';
import { LayoutDashboard, FolderOpen, Award, PenTool, Users, GraduationCap } from 'lucide-react';

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard Geral', path: '/admin/dashboard' },
    { icon: FolderOpen, label: 'Fila de Análise', path: '/admin/projetos' },
    { icon: Users, label: 'Usuários do Sistema', path: '/admin/usuarios' },
    { icon: GraduationCap, label: 'Cursos', path: '/admin/cursos' },
    { icon: Award, label: 'Certificados Emitidos', path: '/admin/certificados' },
    { icon: PenTool, label: 'Assinaturas Digitais', path: '/admin/assinaturas' },
  ];

  return <BaseDashboardLayout menuItems={menuItems}>{children}</BaseDashboardLayout>;
};
