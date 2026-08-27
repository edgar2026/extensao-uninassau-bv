/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

interface PortalOverlayProps {
  onClose?: () => void;
  children: React.ReactNode;
  /** z-index padrão 9999 */
  zIndex?: number;
  /** Se true, mostra confirmação antes de fechar (alterações não salvas) */
  isDirty?: boolean;
}

/**
 * Renderiza filhos diretamente no document.body via Portal,
 * escapando de qualquer overflow-hidden ou transform do layout pai.
 * Ideal para modais inline que não usam o componente <Modal>.
 *
 * Comportamento:
 * - Não fecha por clique no fundo (overlay)
 * - Não fecha por tecla Esc
 * - Cliques internos não propagam ao fundo
 * - Se isDirty=true, mostra confirmação antes de fechar
 */
export const PortalOverlay: React.FC<PortalOverlayProps> = ({
  onClose,
  children,
  zIndex = 9999,
  isDirty = false,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  const handleOverlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleClose = () => {
    if (isDirty) {
      setShowConfirm(true);
    } else {
      onClose?.();
    }
  };

  const handleConfirmDiscard = () => {
    setShowConfirm(false);
    onClose?.();
  };

  const overlay = (
    <div
      className="animate-fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex,
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
      <div ref={cardRef} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>

      {showConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: zIndex + 1,
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

  return createPortal(overlay, document.body);
};
