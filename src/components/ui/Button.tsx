/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyle = 'font-bold uppercase tracking-wider transition-all rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none';
  
  const variants = {
    primary: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/10 hover:shadow-cyan-400/20',
    secondary: 'bg-slate-800 text-slate-100 hover:bg-slate-750 border border-slate-700/60',
    danger: 'bg-rose-500 hover:bg-rose-400 text-white shadow-lg shadow-rose-500/10',
    ghost: 'bg-transparent text-slate-400 hover:text-white hover:bg-slate-900/40 border border-transparent'
  };

  const sizes = {
    sm: 'text-[10px] py-2 px-3',
    md: 'text-xs py-3 px-5',
    lg: 'text-sm py-3.5 px-6'
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0"></span>
      ) : null}
      {children}
    </button>
  );
};
