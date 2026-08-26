/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'white' | 'dark' | 'glass';
  padded?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'white',
  padded = true,
  className = '',
  ...props
}) => {
  const baseStyle = 'rounded-2xl border transition-all duration-200';
  const variants = {
    white: 'bg-white border-slate-200/80 shadow-sm',
    dark: 'bg-slate-900 border-slate-800 shadow-md',
    glass: 'bg-slate-900/60 backdrop-blur-xl border-slate-800/80 shadow-2xl'
  };
  const padding = padded ? 'p-6' : '';

  return (
    <div className={`${baseStyle} ${variants[variant]} ${padding} ${className}`} {...props}>
      {children}
    </div>
  );
};
