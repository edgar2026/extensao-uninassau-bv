/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Se true, mostra confirmação antes de fechar (alterações não salvas) */
  isDirty?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  isDirty = false,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes: Record<string, string> = {
    sm:   'max-w-md',
    md:   'max-w-lg',
    lg:   'max-w-2xl',
    xl:   'max-w-4xl',
    full: 'max-w-5xl',
  };

  const handleClose = () => {
    if (isDirty) {
      setShowConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    setShowConfirm(false);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const modal = (
    <div
      className="animate-fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(3, 18, 43, 0.65)',
        backdropFilter: 'blur(4px)',
      }}
      onMouseDown={handleOverlayClick}
      onClick={handleOverlayClick}
    >
      <div
        className={`w-full ${sizes[size]} animate-slide-up`}
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          border: '1px solid rgba(226,232,240,0.8)',
          boxShadow: '0 25px 60px -10px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 32px)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 24px 16px',
            borderBottom: '1px solid #f1f5f9',
            flexShrink: 0,
          }}
        >
          <h3 style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px', margin: 0 }}>
            {title}
          </h3>
          <button
            onClick={handleClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              color: '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = '#f1f5f9';
              (e.currentTarget as HTMLButtonElement).style.color = '#475569';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
            }}
          >
            <X style={{ width: '15px', height: '15px' }} />
          </button>
        </div>

        {/* Body — scrollável */}
        <div
          style={{
            padding: '20px 24px 24px',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {children}
        </div>
      </div>

      {showConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: 'rgba(3, 18, 43, 0.85)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-amber-100 rounded-full p-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Descartar alterações?</h3>
            </div>
            <p className="text-slate-500 text-xs mb-6">
              Existem alterações não salvas. Se fechar, as modificações serão perdidas.
            </p>
            <div className="flex gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); setShowConfirm(false); }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl uppercase tracking-wider transition"
              >
                Continuar editando
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleConfirmDiscard(); }}
                className="flex-1 bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs py-3 rounded-xl uppercase tracking-wider transition"
              >
                Descartar e fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(modal, document.body);
};
