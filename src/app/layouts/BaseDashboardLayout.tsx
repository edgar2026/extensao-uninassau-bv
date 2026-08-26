/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LogOut, Menu, Bell, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Breadcrumb } from '../../components/ui/Breadcrumb';

interface SidebarItem {
  icon: React.ComponentType<any>;
  label: string;
  path: string;
  badge?: string;
}

interface BaseDashboardLayoutProps {
  children: React.ReactNode;
  menuItems: SidebarItem[];
}

export const BaseDashboardLayout: React.FC<BaseDashboardLayoutProps> = ({ children, menuItems }) => {
  const { user, role, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  if (!user || !role) return <>{children}</>;

  const getRoleLabel = () => {
    switch (role) {
      case 'admin':       return 'Administrador';
      case 'professor':   return 'Professor';
      case 'aluno':       return 'Aluno';
      default:            return 'Usuário';
    }
  };

  const getRoleBadgeClass = () => {
    switch (role) {
      case 'admin':       return 'badge-admin';
      case 'professor':   return 'badge-professor';
      case 'aluno':       return 'badge-aluno';
      default:            return '';
    }
  };

  const getRoleAccentColor = () => {
    switch (role) {
      case 'admin':       return '#ef4444';
      case 'professor':   return '#0057B8';
      case 'aluno':       return '#059669';
      default:            return '#0057B8';
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const SidebarContent = ({ isMobile = false }) => (
    <>
      {/* BRAND HEADER — Alto Padrão */}
      <div className="flex h-20 items-center gap-3 px-4 shrink-0 border-b border-white/10">
        {/* Ícone 3D / App Badge */}
        <div className="relative group cursor-pointer shrink-0">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-400 opacity-30 blur transition group-hover:opacity-75" />
          <div 
            className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-white shadow-[0_8px_20px_rgba(0,0,0,0.35)] border border-white/20 p-1.5 overflow-hidden transition-transform duration-300 group-hover:scale-105"
          >
            <img
              src="/logo.png"
              alt="UNINASSAU"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Nome da Instituição & Portal (Exibido quando expandido) */}
        {(!collapsed || isMobile) && (
          <div className="flex flex-col min-w-0 flex-1 animate-fade-in">
            <div className="flex items-center justify-between gap-1">
              <span className="font-extrabold text-sm text-white tracking-wider truncate">
                UNINASSAU
              </span>
              <span className={`text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0 ${getRoleBadgeClass()}`}>
                {getRoleLabel()}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-cyan-400/90 tracking-widest uppercase truncate">
              Portal de Projetos
            </span>
          </div>
        )}
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 overflow-y-auto sidebar-scroll py-2 px-2 space-y-0.5">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              className={`sidebar-item${isActive ? ' active' : ''}`}
              title={collapsed && !isMobile ? item.label : undefined}
            >
              <Icon className="s-icon" />
              {(!collapsed || isMobile) && (
                <>
                  <span className="truncate flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={
                        isActive
                          ? { background: 'rgba(59,130,246,0.3)', color: '#93c5fd' }
                          : { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }
                      }
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* COLLAPSE TOGGLE (desktop only) */}
      {!isMobile && (
        <div className="p-2 shrink-0" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center rounded-xl p-2 transition duration-150 cursor-pointer"
            style={{ color: 'rgba(255,255,255,0.35)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {collapsed
              ? <ChevronRight className="h-4 w-4" />
              : <ChevronLeft  className="h-4 w-4" />
            }
          </button>
        </div>
      )}

      {/* USER FOOTER */}
      <div
        className="flex items-center gap-3 p-3 shrink-0"
        style={{ borderTop: '1px solid var(--sidebar-border)', background: 'rgba(0,0,0,0.15)' }}
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full font-bold text-xs shrink-0 select-none"
          style={{ background: getRoleAccentColor(), color: '#fff', boxShadow: `0 0 0 2px rgba(255,255,255,0.1)` }}
        >
          {user.nome.charAt(0)}
        </div>
        {(!collapsed || isMobile) && (
          <div className="flex flex-col overflow-hidden flex-1 text-left">
            <span className="text-xs font-semibold truncate leading-none mb-0.5" style={{ color: 'rgba(255,255,255,0.9)' }}>
              {user.nome}
            </span>
            <span className="text-[9px] truncate leading-none" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {user.email}
            </span>
          </div>
        )}
        <button
          onClick={() => { signOut(); navigate('/'); }}
          title="Sair do Sistema"
          className="shrink-0 p-1.5 rounded-lg transition cursor-pointer"
          style={{ color: 'rgba(255,255,255,0.35)' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen w-screen font-sans" style={{ background: '#f0f4f8' }}>

      {/* ── SIDEBAR DESKTOP ─────────────────────────────── */}
      <aside
        className={`hidden lg:flex relative flex-col z-30 transition-all duration-300 ease-in-out ${
          collapsed ? 'w-[72px]' : 'w-72'
        }`}
        style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}
      >
        <SidebarContent />
      </aside>

      {/* ── MOBILE DRAWER ───────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0"
            style={{ background: 'rgba(3,18,43,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside
            className="relative flex flex-col w-72 max-w-xs z-50"
            style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}
          >
            <SidebarContent isMobile />
          </aside>
        </div>
      )}

      {/* ── MAIN AREA ────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* HEADER */}
        <header
          className="flex h-16 items-center justify-between px-5 lg:px-8 shrink-0"
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #e8edf3',
            boxShadow: '0 1px 0 rgba(0,0,0,0.04)'
          }}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-lg transition cursor-pointer text-slate-500 hover:bg-slate-100"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex flex-col text-left">
              <h1 className="text-sm lg:text-base font-bold text-slate-900 leading-tight">
                {location.pathname === '/validar'
                  ? 'Validação Pública de Certificados'
                  : 'Gestão de Extensão Universitária'}
              </h1>
              <Breadcrumb />
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="flex items-center gap-3 lg:gap-4">
            {/* Notificações */}
            <button
              className="relative p-2 rounded-full transition cursor-pointer"
              style={{ color: '#64748b' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Bell className="h-5 w-5" />
              <span
                className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full border-2 border-white"
                style={{ background: '#ef4444' }}
              />
            </button>

            <div className="h-6 w-px bg-slate-200" />

            {/* Avatar + nome */}
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full text-white font-bold text-xs select-none shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${getRoleAccentColor()} 0%, ${getRoleAccentColor()}cc 100%)`,
                  boxShadow: `0 2px 8px ${getRoleAccentColor()}55`
                }}
              >
                {user.nome.substring(0, 2).toUpperCase()}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-800 leading-tight">{user.nome}</span>
                <span className={`text-[10px] font-bold ${getRoleBadgeClass()} px-1.5 py-0 rounded-md leading-5 w-fit`}>
                  {getRoleLabel()}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-5 lg:p-8" style={{ background: '#f0f4f8' }}>
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
