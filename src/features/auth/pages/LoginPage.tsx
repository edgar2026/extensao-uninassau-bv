/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Mail } from 'lucide-react';
import { Input } from '../../../components/ui/Input';
import { Alert } from '../../../components/ui/Alert';
import { useAuth } from '../../../contexts/AuthContext';
import { loginSchema, LoginInputs } from '../schemas/loginSchema';
import { AuthLogo } from '../components/AuthLogo';

const labelStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: '600',
  color: '#334155',
  marginBottom: '2px',
};

export const LoginPage: React.FC = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInputs>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInputs) => {
    setIsSubmitting(true);
    setLoginError(null);
    try {
      await signIn(data.email, data.password);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('Invalid login credentials')) {
        setLoginError('Credenciais inválidas. Verifique seu e-mail e senha.');
      } else if (msg.includes('Email not confirmed')) {
        setLoginError('E-mail não confirmado. Verifique sua caixa de entrada.');
      } else {
        setLoginError(msg || 'Erro ao fazer login. Tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen w-screen flex flex-col font-sans overflow-x-hidden"
      style={{ background: 'linear-gradient(135deg, #001224 0%, #001F3F 50%, #002D54 100%)' }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;800&family=Montserrat:wght@400;500;600;700&display=swap');
        .login-montserrat { font-family: 'Montserrat', sans-serif; }
        .auth-field input::placeholder {
          color: #94a3b8 !important;
        }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #eef4fb inset !important;
          box-shadow: 0 0 0 30px #eef4fb inset !important;
          -webkit-text-fill-color: #001224 !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}} />

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div
          className="w-full flex flex-col items-center"
          style={{ maxWidth: '500px' }}
        >
          <div
            className="w-full rounded-[20px] overflow-hidden"
            style={{
              background: '#ffffff',
              boxShadow: '0 8px 40px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.15)',
              padding: '48px 44px',
            }}
          >
            <div className="flex flex-col items-center gap-3">
              <AuthLogo className="w-[80px] sm:w-[88px]" />

              <h1
                className="login-montserrat text-center"
                style={{ fontSize: '20px', fontWeight: '800', color: '#001224', marginTop: '8px' }}
              >
                Portal de Extensão Acadêmica
              </h1>
              <p
                className="login-montserrat text-center"
                style={{ fontSize: '13px', fontWeight: '500', color: '#64748b', marginTop: '-4px' }}
              >
                Gestão de projetos e certificados acadêmicos
              </p>
            </div>

            {loginError && (
              <div className="mt-5">
                <Alert type="error" onClose={() => setLoginError(null)}>
                  {loginError}
                </Alert>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-6">
              <div className="auth-field">
                <label className="login-montserrat" style={labelStyle}>E-mail institucional</label>
                <Input
                  placeholder="seu.email@exemplo.com"
                  type="email"
                  icon={Mail}
                  error={errors.email?.message}
                  {...register('email')}
                />
              </div>

              <div className="auth-field">
                <label className="login-montserrat" style={labelStyle}>Senha de acesso</label>
                <Input
                  placeholder="••••••••"
                  type="password"
                  icon={Lock}
                  error={errors.password?.message}
                  showPasswordToggle
                  passwordVisible={showPassword}
                  onTogglePassword={() => setShowPassword(!showPassword)}
                  {...register('password')}
                />
              </div>

              <div className="text-left">
                <Link
                  to="/esqueci-senha"
                  className="login-montserrat hover:underline transition"
                  style={{ fontSize: '12.5px', fontWeight: '600', color: '#0057B8' }}
                >
                  Esqueci minha senha?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="login-montserrat w-full flex items-center justify-center gap-2 rounded-[10px] transition-all cursor-pointer hover:brightness-110 active:scale-[0.99]"
                style={{
                  height: '54px',
                  fontSize: '14px',
                  fontWeight: '700',
                  background: isSubmitting ? '#94a3b8' : '#001224',
                  color: '#ffffff',
                  border: 'none',
                  letterSpacing: '0.02em',
                }}
              >
                {isSubmitting ? 'Entrando...' : 'Entrar no sistema'}
              </button>
            </form>

            <div className="text-center mt-5">
              <p className="login-montserrat" style={{ fontSize: '13px', color: '#475569' }}>
                Primeiro acesso?{' '}
                <Link
                  to="/codigo-senha?purpose=first_access"
                  className="hover:underline"
                  style={{ fontWeight: '700', color: '#0057B8' }}
                >
                  Criar minha senha
                </Link>
              </p>
            </div>
          </div>

          <div className="text-center mt-5">
            <Link
              to="/validar"
              className="login-montserrat hover:underline transition"
              style={{ fontSize: '12px', fontWeight: '500', color: 'rgba(255,255,255,0.45)' }}
            >
              Validar certificado
            </Link>
          </div>
        </div>
      </main>

      <footer className="text-center py-4" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10.5px', fontWeight: '500' }}>
        <p>Gestão Integrada de Extensão Acadêmica · Autenticidade Digital Garantida</p>
      </footer>
    </div>
  );
};
