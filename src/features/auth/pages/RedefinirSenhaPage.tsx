/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, ArrowLeft, KeyRound } from 'lucide-react';
import { Input } from '../../../components/ui/Input';
import { Alert } from '../../../components/ui/Alert';
import { codeAndPasswordSchema, CodeAndPasswordInputs } from '../schemas/loginSchema';
import { AuthLogo } from '../components/AuthLogo';

const labelStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: '600',
  color: '#334155',
  marginBottom: '2px',
};

export const RedefinirSenhaPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<CodeAndPasswordInputs>({
    resolver: zodResolver(codeAndPasswordSchema),
  });

  const onSubmit = async (data: CodeAndPasswordInputs) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/set-password-with-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email.toLowerCase().trim(),
          code: data.code.trim(),
          password: data.password,
          purpose: 'password_reset',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Não foi possível validar os dados informados.');
      }

      navigate('/', { state: { message: 'Senha redefinida com sucesso. Faça login para acessar.' } });
    } catch {
      setError('Não foi possível validar os dados informados.');
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
        <div className="w-full flex flex-col items-center" style={{ maxWidth: '500px' }}>
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
              <h1 className="login-montserrat text-center" style={{ fontSize: '20px', fontWeight: '800', color: '#001224', marginTop: '8px' }}>
                Redefinir Senha
              </h1>
              <p className="login-montserrat text-center" style={{ fontSize: '13px', fontWeight: '500', color: '#64748b', marginTop: '-4px' }}>
                Informe seu e-mail, o código temporário recebido e defina uma nova senha.
              </p>
            </div>

            {error && (
              <div className="mt-5">
                <Alert type="error" onClose={() => setError(null)}>{error}</Alert>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-6">
              <div className="auth-field">
                <label className="login-montserrat" style={labelStyle}>E-mail institucional</label>
                <Input
                  placeholder="seu.email@instituicao.br"
                  type="email"
                  icon={Mail}
                  error={errors.email?.message}
                  {...register('email')}
                />
              </div>

              <div className="auth-field">
                <label className="login-montserrat" style={labelStyle}>Código de redefinição</label>
                <Input
                  placeholder="Ex: K7M2N9PQ4R"
                  type="text"
                  icon={KeyRound}
                  error={errors.code?.message}
                  autoComplete="off"
                  {...register('code')}
                />
              </div>

              <div className="auth-field">
                <label className="login-montserrat" style={labelStyle}>Nova senha</label>
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

              <div className="auth-field">
                <label className="login-montserrat" style={labelStyle}>Confirmar nova senha</label>
                <Input
                  placeholder="••••••••"
                  type="password"
                  icon={Lock}
                  error={errors.confirmPassword?.message}
                  showPasswordToggle
                  passwordVisible={showConfirmPassword}
                  onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
                  {...register('confirmPassword')}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="login-montserrat w-full flex items-center justify-center gap-2 rounded-[10px] transition-all cursor-pointer hover:brightness-110 active:scale-[0.99]"
                style={{ height: '54px', fontSize: '14px', fontWeight: '700', background: isSubmitting ? '#94a3b8' : '#001224', color: '#fff', border: 'none' }}
              >
                {isSubmitting ? 'Redefinindo...' : 'Redefinir senha'}
              </button>

              <Link to="/" className="login-montserrat text-center hover:underline transition" style={{ fontSize: '13px', fontWeight: '600', color: '#0057B8' }}>
                <ArrowLeft className="h-3 w-3 inline mr-1" />
                Voltar ao login
              </Link>
            </form>
          </div>
        </div>
      </main>

      <footer className="text-center py-4" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10.5px', fontWeight: '500' }}>
        <p>Gestão Integrada de Extensão Acadêmica · Autenticidade Digital Garantida</p>
      </footer>
    </div>
  );
};
