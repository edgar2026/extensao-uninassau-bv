/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { forwardRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ComponentType<any>;
  showPasswordToggle?: boolean;
  passwordVisible?: boolean;
  onTogglePassword?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  icon: Icon,
  className = '',
  type = 'text',
  showPasswordToggle = false,
  passwordVisible = false,
  onTogglePassword,
  ...props
}, ref) => {
  const hasIcon = !!Icon;
  const isPasswordType = type === 'password' || type === 'text';
  const shouldShowToggle = showPasswordToggle && isPasswordType;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          {label}
        </label>
      )}
      <div className="relative" style={{ position: 'relative' }}>
        {hasIcon && (
          <div
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
              width: '16px',
              height: '16px',
              color: '#94a3b8',
            }}
          >
            <Icon style={{ width: '16px', height: '16px' }} />
          </div>
        )}
        <input
          ref={ref}
          type={shouldShowToggle ? (passwordVisible ? 'text' : 'password') : type}
          className={className}
          style={{
            width: '100%',
            height: '54px',
            borderRadius: '10px',
            fontSize: '14px',
            background: '#eef4fb',
            border: error ? '1.5px solid #f43f5e' : '1.5px solid #d0dce8',
            color: '#001224',
            outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            boxSizing: 'border-box',
            paddingLeft: hasIcon ? '48px' : '16px',
            paddingRight: shouldShowToggle ? '48px' : '16px',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#0057B8';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,87,184,0.10)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? '#f43f5e' : '#d0dce8';
            e.currentTarget.style.boxShadow = 'none';
          }}
          {...props}
        />
        {shouldShowToggle && (
          <button
            type="button"
            aria-label={passwordVisible ? 'Ocultar senha' : 'Mostrar senha'}
            onClick={onTogglePassword}
            style={{
              position: 'absolute',
              right: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              padding: 0,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#94a3b8',
              pointerEvents: 'auto',
            }}
          >
            {passwordVisible
              ? <EyeOff style={{ width: '16px', height: '16px' }} />
              : <Eye style={{ width: '16px', height: '16px' }} />
            }
          </button>
        )}
      </div>
      {error && (
        <span className="text-rose-500 text-[10px] font-medium">{error}</span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
