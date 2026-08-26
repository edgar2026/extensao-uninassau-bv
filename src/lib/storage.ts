/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ─── Storage Keys (Visual Preferences Only) ──────────────────────────────────
export const STORAGE_KEYS = {
  THEME: 'ge_theme',
  SIDEBAR_COLLAPSED: 'ge_sidebar_collapsed',
  STORAGE_VERSION: 'ge_storage_version',
};

const CURRENT_VERSION = '3.0.0';

// ─── Visual Preferences ───────────────────────────────────────────────────────
export const getTheme = (): string => {
  return localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
};

export const setTheme = (theme: string): void => {
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
};

export const getSidebarCollapsed = (): boolean => {
  return localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED) === 'true';
};

export const setSidebarCollapsed = (collapsed: boolean): void => {
  localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, String(collapsed));
};

// ─── Legacy exports (kept for compatibility, no longer used for operational data) ──
export const getFromStorage = <T>(key: string): T[] => {
  return [];
};

export const saveToStorage = <T>(_key: string, _data: T[]): void => {
  // No-op: operational data is now exclusively in Supabase
};

// ─── Storage Initialization ───────────────────────────────────────────────────
export const initializeStorage = () => {
  const storedVersion = localStorage.getItem(STORAGE_KEYS.STORAGE_VERSION);
  if (storedVersion !== CURRENT_VERSION) {
    // Clear any legacy operational data keys
    const legacyKeys = [
      'ge_projetos', 'ge_relatorios', 'ge_certificados',
      'ge_unidades', 'ge_cursos', 'ge_assinaturas',
      'ge_auditoria', 'ge_current_user', 'ge_alunos_vinculados',
      'ge_frequencias',
    ];
    legacyKeys.forEach(key => localStorage.removeItem(key));
    localStorage.setItem(STORAGE_KEYS.STORAGE_VERSION, CURRENT_VERSION);
  }
};

initializeStorage();
