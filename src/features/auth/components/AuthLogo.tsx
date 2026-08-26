import React from 'react';

interface AuthLogoProps {
  className?: string;
}

export const AuthLogo: React.FC<AuthLogoProps> = ({ className = '' }) => {
  return (
    <img
      src="/logo.png"
      alt="UNINASSAU"
      className={`select-none object-contain ${className}`}
      style={{ width: '80px', height: 'auto' }}
    />
  );
};
