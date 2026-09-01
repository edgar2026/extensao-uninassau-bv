import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

import {
  LoginPage,
  EsqueciSenhaPage,
  CriarSenhaPage,
  CodigoSenhaPage,
} from '../features/auth';
import { ValidationPage } from '../features/validacao';

import { AlunoDashboard } from '../features/dashboard/pages/AlunoDashboard';
import { AlunoProjetos } from '../features/projetos/pages/AlunoProjetos';
import { AlunoCertificados } from '../features/certificados/pages/AlunoCertificados';

import { ProfessorDashboard } from '../features/dashboard/pages/ProfessorDashboard';
import { ProfessorProjetos } from '../features/projetos/pages/ProfessorProjetos';
import { ProfessorCertificados } from '../features/certificados/pages/ProfessorCertificados';

import { AdminDashboard } from '../features/dashboard/pages/AdminDashboard';
import { AdminProjetos } from '../features/projetos/pages/AdminProjetos';
import { AdminCertificados } from '../features/certificados/pages/AdminCertificados';
import { AdminUsuarios } from '../features/usuarios/pages/AdminUsuarios';
import { AdminAssinaturas } from '../features/certificados/pages/AdminAssinaturas';
import { AdminCursos } from '../features/cursos/pages/AdminCursos';

import { AdminLayout } from '../app/layouts/AdminLayout';
import { ProfessorLayout } from '../app/layouts/ProfessorLayout';
import { AlunoLayout } from '../app/layouts/AlunoLayout';
import { PublicLayout } from '../app/layouts/PublicLayout';

function FullScreenLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#0B1727]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
    </div>
  );
}

function PrivateRoute({ children, allowedRole }: { children: React.ReactNode; allowedRole: string }) {
  const { user, role, isLoading } = useAuth();

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (!user || !role) {
    return <Navigate to="/" replace />;
  }

  if (allowedRole && role !== allowedRole) {
    return <Navigate to={`/${role}/dashboard`} replace />;
  }

  return <>{children}</>;
}

function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { user, role, isLoading } = useAuth();

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (user && role) {
    return <Navigate to={`/${role}/dashboard`} replace />;
  }

  return <>{children}</>;
}

export default function AppRouter() {
  return (
    <Routes>
        {/* Public Routes */}
        <Route
          path="/"
          element={
            <PublicLayout>
              <AuthRedirect>
                <LoginPage />
              </AuthRedirect>
            </PublicLayout>
          }
        />
        <Route
          path="/codigo-senha"
          element={
            <PublicLayout>
              <CodigoSenhaPage />
            </PublicLayout>
          }
        />
        <Route
          path="/esqueci-senha"
          element={
            <PublicLayout>
              <EsqueciSenhaPage />
            </PublicLayout>
          }
        />
        <Route
          path="/criar-senha"
          element={
            <PublicLayout>
              <CriarSenhaPage />
            </PublicLayout>
          }
        />
        <Route
          path="/validar"
          element={
            <PublicLayout>
              <ValidationPage />
            </PublicLayout>
          }
        />
        <Route path="/extensao/validar" element={<Navigate to="/validar" replace />} />

        {/* Aluno Routes */}
        <Route
          path="/aluno/dashboard"
          element={
            <PrivateRoute allowedRole="aluno">
              <AlunoLayout>
                <AlunoDashboard />
              </AlunoLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/aluno/projetos"
          element={
            <PrivateRoute allowedRole="aluno">
              <AlunoLayout>
                <AlunoProjetos />
              </AlunoLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/aluno/certificados"
          element={
            <PrivateRoute allowedRole="aluno">
              <AlunoLayout>
                <AlunoCertificados />
              </AlunoLayout>
            </PrivateRoute>
          }
        />

        {/* Professor Routes */}
        <Route
          path="/professor/dashboard"
          element={
            <PrivateRoute allowedRole="professor">
              <ProfessorLayout>
                <ProfessorDashboard />
              </ProfessorLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/professor/projetos"
          element={
            <PrivateRoute allowedRole="professor">
              <ProfessorLayout>
                <ProfessorProjetos />
              </ProfessorLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/professor/certificados"
          element={
            <PrivateRoute allowedRole="professor">
              <ProfessorLayout>
                <ProfessorCertificados />
              </ProfessorLayout>
            </PrivateRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin/dashboard"
          element={
            <PrivateRoute allowedRole="admin">
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/projetos"
          element={
            <PrivateRoute allowedRole="admin">
              <AdminLayout>
                <AdminProjetos />
              </AdminLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/certificados"
          element={
            <PrivateRoute allowedRole="admin">
              <AdminLayout>
                <AdminCertificados />
              </AdminLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/usuarios"
          element={
            <PrivateRoute allowedRole="admin">
              <AdminLayout>
                <AdminUsuarios />
              </AdminLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/cursos"
          element={
            <PrivateRoute allowedRole="admin">
              <AdminLayout>
                <AdminCursos />
              </AdminLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/assinaturas"
          element={
            <PrivateRoute allowedRole="admin">
              <AdminLayout>
                <AdminAssinaturas />
              </AdminLayout>
            </PrivateRoute>
          }
        />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  );
}
