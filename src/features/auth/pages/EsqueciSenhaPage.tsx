/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, ArrowLeft, CheckCircle, KeyRound } from 'lucide-react';
import { Input } from '../../../components/ui/Input';
import { Alert } from '../../../components/ui/Alert';
import { forgotPasswordSchema, ForgotPasswordInputs } from '../schemas/loginSchema';
import { AuthLogo } from '../components/AuthLogo';

const labelStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: '600',
  color: '#334155',
  marginBottom: '2px',
};

export const EsqueciSenhaPage: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordInputs>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInputs) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/request-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email.toLowerCase().trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Não foi possível processar sua solicitação.');
      }

      setSuccess(true);
    } catch {
      setError('Não foi possível processar sua solicitação. Tente novamente.');
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
        .auth-field input {
          height: 52px !important;
          border-radius: 10px !important;
          font-size: 14px !important;
          background: #eef4fb !important;
          border: 1.5px solid #d0dce8 !important;
          color: #001224 !important;
          padding: 0 14px !important;
          transition: border-color 0.2s, box-shadow 0.2s !important;
        }
        .auth-field input:focus {
          border-color: #0057B8 !important;
          box-shadow: 0 0 0 3px rgba(0,87,184,0.10) !important;
          outline: none !important;
        }
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
                Esqueci Minha Senha
              </h1>
              <p className="login-montserrat text-center" style={{ fontSize: '13px', fontWeight: '500', color: '#64748b', marginTop: '-4px' }}>
                Informe seu e-mail institucional para solicitar a redefinição.
              </p>
            </div>

            {error && (
              <div className="mt-5">
                <Alert type="error" onClose={() => setError(null)}>{error}</Alert>
              </div>
            )}

            {success ? (
              <div className="flex flex-col gap-4 mt-6">
                <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-cyan-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-cyan-800 text-sm font-semibold">Solicitação registrada.</p>
                      <p className="text-cyan-600 text-xs mt-1">
                        Entre em contato com a administração para receber o novo código de acesso.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 mt-2">
                  <Link
                    to="/codigo-senha?purpose=password_reset"
                    className="login-montserrat w-full flex items-center justify-center gap-2 rounded-[10px] transition-all hover:brightness-110"
                    style={{ height: '48px', fontSize: '13px', fontWeight: '700', background: '#001224', color: '#fff', border: 'none', textDecoration: 'none' }}
                  >
                    <KeyRound className="h-4 w-4" />
                    Já tenho um código
                  </Link>
                  <Link to="/" className="login-montserrat text-center hover:underline transition" style={{ fontSize: '13px', fontWeight: '600', color: '#0057B8' }}>
                    <ArrowLeft className="h-3 w-3 inline mr-1" />
                    Voltar ao login
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-6">
                <div className="auth-field">
                  <label className="login-montserrat" style={labelStyle}>E-mail institucional</label>
                  <Input
                    placeholder="seu.email@instituicao.br"
                    type="email"
                    icon={Mail}
                    error={errors.email?.message}
                    className="border-0 !bg-transparent !text-[#001224] !p-0"
                    {...register('email')}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="login-montserrat w-full flex items-center justify-center gap-2 rounded-[10px] transition-all cursor-pointer hover:brightness-110 active:scale-[0.99]"
                  style={{ height: '54px', fontSize: '14px', fontWeight: '700', background: isSubmitting ? '#94a3b8' : '#001224', color: '#fff', border: 'none' }}
                >
                  {isSubmitting ? 'Enviando...' : 'Solicitar redefinição'}
                </button>

                <Link to="/" className="login-montserrat text-center hover:underline transition" style={{ fontSize: '13px', fontWeight: '600', color: '#0057B8' }}>
                  <ArrowLeft className="h-3 w-3 inline mr-1" />
                  Voltar ao login
                </Link>
              </form>
            )}
          </div>
        </div>
      </main>

      <footer className="text-center py-4" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10.5px', fontWeight: '500' }}>
        <p>Gestão Integrada de Extensão Acadêmica · Autenticidade Digital Garantida</p>
      </footer>
    </div>
  );
};
