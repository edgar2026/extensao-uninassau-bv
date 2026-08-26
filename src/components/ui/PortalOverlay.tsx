/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { createPortal } from 'react-dom';

interface PortalOverlayProps {
  onClose?: () => void;
  children: React.ReactNode;
  /** z-index padrão 9999 */
  zIndex?: number;
}

/**
 * Renderiza filhos diretamente no document.body via Portal,
 * escapando de qualquer overflow-hidden ou transform do layout pai.
 * Ideal para modais inline que não usam o componente <Modal>.
 */
export const PortalOverlay: React.FC<PortalOverlayProps> = ({
  onClose,
  children,
  zIndex = 9999,
}) => {
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
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      {children}
    </div>
  );

  return createPortal(overlay, document.body);
};
