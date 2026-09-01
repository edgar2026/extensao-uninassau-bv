/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AssinaturaDigital, CertificadoProfessor, TITULACAO_OPTIONS } from '../../../types';

const formatFullDatePT = (dateStr: string) => {
  if (!dateStr) return '';
  const normalized = dateStr.includes('T') ? dateStr : dateStr + 'T12:00:00';
  const date = new Date(normalized);
  if (isNaN(date.getTime())) return '';
  const months = [
    'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
    'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
  ];
  return `${date.getDate()} DE ${months[date.getMonth()]} DE ${date.getFullYear()}`;
};

const formatPeriodPT = (startStr: string, endStr: string) => {
  if (!startStr || !endStr) return '';
  const start = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T00:00:00');
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return `${months[start.getMonth()]} de ${start.getFullYear()} a ${months[end.getMonth()]} de ${end.getFullYear()}`;
};

export const CertificadoProfessorTemplate: React.FC<{
  cert: CertificadoProfessor;
  assinatura: AssinaturaDigital | null;
  className?: string;
}> = ({ cert, assinatura, className = '' }) => {
  const reitoria = assinatura;

  const titulacaoAbreviada =
    TITULACAO_OPTIONS.find(o => o.value === cert.professorTitulacao)?.abreviacao || 'Prof.';

  const validationUrl = `https://extensao-uninassau.vercel.app/validar?codigo=${cert.codigoPublico}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=002D54&bgcolor=FAF6F0&data=${encodeURIComponent(validationUrl)}`;

  const goldGradientSubtle = 'linear-gradient(135deg, #B8972D 0%, #E8C04A 40%, #F5DC7C 60%, #C9A84C 100%)';
  const parchmentBg = 'radial-gradient(ellipse at 50% 40%, #FEFCF6 0%, #FAF6F0 55%, #F4EDDF 100%)';
  const deepNavy = '#001F3F';
  const midNavy = '#002D54';
  const goldColor = '#C9A84C';

  return (
    <div className={`certificado-double-page flex flex-col gap-10 w-full max-w-[900px] mx-auto select-none ${className}`}>
      {/* ── Google Fonts Injection ─────────────────────────────────────────── */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Montserrat:wght@300;400;500;600;700;800&display=swap');

        .cert-prof-cinzel { font-family: 'Cinzel', 'Georgia', serif; }
        .cert-prof-playfair { font-family: 'Playfair Display', 'Georgia', serif; }
        .cert-prof-montserrat { font-family: 'Montserrat', 'Arial', sans-serif; }

        .cert-prof-guilloche {
          background-image:
            repeating-linear-gradient(0deg, transparent, transparent 18px, rgba(0,45,84,0.04) 18px, rgba(0,45,84,0.04) 19px),
            repeating-linear-gradient(90deg, transparent, transparent 18px, rgba(0,45,84,0.04) 18px, rgba(0,45,84,0.04) 19px);
        }

        .certificate-prof-title-band {
          width: 100%;
          margin: 22px auto 0;
          padding: 0 20px;
          text-align: center;
          position: relative;
          z-index: 10;
        }

        .certificate-prof-title-band .title-text {
          display: block;
          font-family: 'Cinzel', Georgia, serif;
          font-size: 64px;
          font-weight: 900;
          letter-spacing: 8px;
          text-align: center;
          white-space: nowrap;
          line-height: 1.1;
          color: #001F3F;
          text-transform: uppercase;
        }

        @media print {
          @page { size: A4 landscape; margin: 0 !important; }
          html, body { margin: 0 !important; padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important; }
          body * { visibility: hidden !important; }
          .certificado-double-page, .certificado-double-page * { visibility: visible !important; }
          .certificado-double-page {
            position: fixed !important; top: 0 !important; left: 0 !important;
            width: 297mm !important; min-height: 210mm !important; max-width: none !important;
            padding: 0 !important; margin: 0 !important; gap: 0 !important;
            display: block !important;
          }
          .certificado-frente {
            width: 297mm !important; height: 210mm !important; page-break-after: always !important;
            box-shadow: none !important; border-radius: 0 !important;
            box-sizing: border-box !important; display: flex !important;
            flex-direction: column !important; justify-content: space-between !important;
            overflow: visible !important;
          }
        }
      `}} />

      {/* ═══════════════════════════════════════════════════════════════════════
          FRENTE — Página 1
      ═══════════════════════════════════════════════════════════════════════ */}
      <div
        className="certificado-frente relative flex flex-col w-full overflow-hidden p-10 md:p-14 text-center"
        style={{
          background: parchmentBg,
          aspectRatio: '1.414',
          boxShadow: '0 4px 24px rgba(0,31,63,0.10), 0 1px 4px rgba(0,0,0,0.06)',
          borderRadius: '20px',
        }}
      >
        {/* Outer Thin Navy Border */}
        <div className="absolute inset-0 rounded-[20px] pointer-events-none z-[1]" style={{ border: `2px solid ${midNavy}`, borderRadius: '20px' }} />

        {/* Inner Gold Thin Border */}
        <div className="absolute pointer-events-none z-[2]" style={{ inset: '22px', border: `2px solid ${goldColor}`, borderRadius: '10px' }} />

        {/* Micro Security Guilloche Watermark */}
        <div className="cert-prof-guilloche absolute inset-0 pointer-events-none z-[0]" style={{ borderRadius: '20px' }} />

        {/* Gold Corner Ornaments */}
        {[
          { top: 32, left: 32, rotate: '0deg' },
          { top: 32, right: 32, rotate: '90deg' },
          { bottom: 32, left: 32, rotate: '-90deg' },
          { bottom: 32, right: 32, rotate: '180deg' },
        ].map((pos, i) => (
          <div key={i} className="absolute z-[3] pointer-events-none" style={{ ...pos }}>
            <svg width="28" height="28" viewBox="0 0 28 28">
              <path d="M2 26 L2 2 L26 2" fill="none" stroke={goldColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        ))}

        {/* ── CABEÇALHO ─────────────────────────────────────────────────────── */}
        <div className="relative z-10 flex flex-col items-center gap-1.5 pt-2">
          <div className="flex items-center justify-center gap-4">
            <img
              src="/logo-cert.png"
              alt="UNINASSAU RECIFE"
              style={{ height: '96px', width: 'auto', objectFit: 'contain' }}
            />
            <img
              src="/assets/certificado/logo-extensao.png"
              alt="Logo Pesquisa e Extensão"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              style={{ height: '96px', width: 'auto', objectFit: 'contain', display: 'block', background: 'transparent' }}
            />
          </div>
          <span className="cert-prof-cinzel tracking-[0.28em]" style={{ fontSize: '11px', fontWeight: '700', color: deepNavy, textTransform: 'uppercase' }}>
            UNINASSAU RECIFE
          </span>
          <div style={{ width: '160px', height: '1.5px', background: goldGradientSubtle, margin: '4px 0' }} />
        </div>

        {/* ── TÍTULO CERTIFICADO ─────────────────────────────────────────── */}
        <div className="certificate-prof-title-band">
          <span className="title-text">CERTIFICADO</span>
        </div>

        {/* ── CORPO DO TEXTO DO PROFESSOR ───────────────────────────────────── */}
        <div
          className="relative z-10 px-8 md:px-14"
          style={{ marginTop: '28px', flex: '0 0 auto' }}
        >
          <p className="cert-prof-playfair leading-relaxed" style={{ fontSize: '14.5px', color: '#1e293b', fontWeight: '400' }}>
            Certificamos, para os devidos fins, que{' '}
            <strong className="cert-prof-cinzel" style={{ fontSize: '17px', fontWeight: '700', color: deepNavy }}>
              {titulacaoAbreviada} {cert.professorNome.toUpperCase()}
            </strong>{' '}
            atuou como professor orientador do projeto de extensão intitulado{' '}
            <strong className="cert-prof-playfair" style={{ fontStyle: 'italic', fontWeight: '600', color: '#002D54' }}>
              "{cert.projetoNome}"
            </strong>
            , realizado no período de{' '}
            <span className="cert-prof-montserrat" style={{ fontWeight: '600', fontSize: '13px' }}>
              {formatPeriodPT(cert.dataInicio, cert.dataTermino)}
            </span>
            , contribuindo para o desenvolvimento e acompanhamento das atividades acadêmicas.
          </p>
        </div>

        {/* ── TIPO DO CERTIFICADO (label discreto) ─────────────────────────── */}
        <div className="relative z-10 mt-3">
          <span className="cert-prof-cinzel" style={{ fontSize: '8.5px', letterSpacing: '0.22em', color: goldColor, textTransform: 'uppercase', opacity: 0.85 }}>
            Certificado de Orientação de Projeto de Extensão
          </span>
        </div>

        {/* ── ASSINATURAS E DATA ───────────────────────────────────────────── */}
        <div className="relative z-10 flex flex-col items-center gap-2 px-6 pt-2 pb-2" style={{ marginTop: 'auto' }}>
          <span className="cert-prof-cinzel" style={{ fontSize: '9.5px', fontWeight: '600', letterSpacing: '0.18em', color: deepNavy }}>
            Recife, {formatFullDatePT(cert.dataEmissao)}
          </span>

          <div className="flex flex-col items-center" style={{ width: '260px' }}>
            {reitoria?.imagemUrl ? (
              <img
                src={reitoria.imagemUrl}
                alt="Assinatura do Reitor"
                style={{
                  height: '52px', width: 'auto', objectFit: 'contain',
                  marginBottom: '-4px', position: 'relative', zIndex: 0,
                  mixBlendMode: 'multiply',
                }}
              />
            ) : (
              <div style={{ height: '36px' }} />
            )}
            <div style={{ width: '200px', height: '1.5px', background: goldGradientSubtle }} />
            <span className="cert-prof-cinzel" style={{ fontSize: '9.5px', fontWeight: '700', letterSpacing: '0.18em', color: deepNavy, marginTop: '4px' }}>
              {reitoria?.nome?.toUpperCase() || 'UNINASSAU RECIFE'}
            </span>
            <span className="cert-prof-montserrat" style={{ fontSize: '8px', fontWeight: '500', letterSpacing: '0.15em', color: '#475569', textTransform: 'uppercase' }}>
              {reitoria?.cargo || 'REITOR'}
            </span>
          </div>
        </div>

        {/* Micro metadata footer */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-between px-12 pointer-events-none z-10" style={{ opacity: 0.45 }}>
          <span className="cert-prof-montserrat" style={{ fontSize: '7px', letterSpacing: '0.12em', color: deepNavy }}>
            CÓD: {cert.codigoPublico}
          </span>
          <span className="cert-prof-montserrat" style={{ fontSize: '7px', letterSpacing: '0.12em', color: deepNavy }}>
            FRENTE
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          VERSO — Página 2
      ═══════════════════════════════════════════════════════════════════════ */}
      <div
        className="certificado-verso relative flex flex-col justify-between w-full overflow-hidden"
        style={{
          background: parchmentBg,
          aspectRatio: '1.414',
          fontFamily: "'Montserrat', sans-serif",
          boxShadow: '0 4px 24px rgba(0,31,63,0.10), 0 1px 4px rgba(0,0,0,0.06)',
          borderRadius: '20px',
        }}
      >
        {/* Borders */}
        <div className="absolute inset-0 rounded-[20px] pointer-events-none z-[1]" style={{ border: `2px solid ${midNavy}`, borderRadius: '20px' }} />
        <div className="absolute pointer-events-none z-[2]" style={{ inset: '22px', border: `2px solid ${goldColor}`, borderRadius: '10px' }} />
        <div className="absolute pointer-events-none z-[2]" style={{ inset: '26px', border: '0.5px solid rgba(0,45,84,0.15)', borderRadius: '7px' }} />
        <div className="cert-prof-guilloche absolute inset-0 pointer-events-none z-[0]" style={{ borderRadius: '20px' }} />

        {/* Gold corner ornaments */}
        {[
          { top: 32, left: 32, rotate: '0deg' },
          { top: 32, right: 32, rotate: '90deg' },
          { bottom: 32, left: 32, rotate: '-90deg' },
          { bottom: 32, right: 32, rotate: '180deg' },
        ].map((pos, i) => (
          <div key={i} className="absolute z-[3] pointer-events-none" style={{ ...pos }}>
            <svg width="28" height="28" viewBox="0 0 28 28">
              <path d="M2 26 L2 2 L26 2" fill="none" stroke={goldColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        ))}

        {/* ── VERSO HEADER ────────────────────────────────────────────────── */}
        <div className="relative z-10 flex justify-between items-center px-16 pt-10 pb-4" style={{ borderBottom: `1px solid rgba(0,45,84,0.12)` }}>
          <img src="/logo-cert.png" alt="UNINASSAU" style={{ height: '40px', width: 'auto', objectFit: 'contain' }} />
          <div className="text-center">
            <span className="cert-prof-cinzel" style={{ fontSize: '10px', fontWeight: '600', letterSpacing: '0.25em', color: deepNavy, textTransform: 'uppercase' }}>
              VALIDAÇÃO E AUTENTICIDADE
            </span>
            <div style={{ height: '1px', width: '180px', background: goldGradientSubtle, margin: '4px auto 0' }} />
          </div>
          <div style={{ width: '60px' }} />
        </div>

        {/* ── VERSO CONTENT GRID ──────────────────────────────────────────── */}
        <div className="relative z-10 flex-1 grid px-16 gap-10 items-center" style={{ gridTemplateColumns: '1fr 200px', paddingTop: '16px', paddingBottom: '16px' }}>
          {/* Left: Instructions */}
          <div className="flex flex-col gap-3">
            <h3 className="cert-prof-cinzel" style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.2em', color: deepNavy, textTransform: 'uppercase' }}>
              Instruções de Validação Oficial
            </h3>
            <p className="cert-prof-playfair" style={{ fontSize: '11.5px', color: '#475569', lineHeight: '1.75', fontWeight: '400' }}>
              Este documento comprova oficialmente a orientação docente em projeto de extensão universitária, devidamente registrado nos sistemas institucionais da UNINASSAU.
            </p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                `Acesse https://extensao-uninassau.vercel.app/validar e informe o código de autenticação impresso ao lado.`,
                'Escaneie o QR Code ao lado com seu smartphone para validação instantânea.',
              ].map((item, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <svg viewBox="0 0 14 14" width="14" height="14" style={{ flexShrink: 0, marginTop: '3px' }}>
                    <path d="M7 2 L8.5 5.5 L12 5.5 L9.5 7.5 L10.5 11 L7 9 L3.5 11 L4.5 7.5 L2 5.5 L5.5 5.5 Z" fill={goldColor} />
                  </svg>
                  <p className="cert-prof-playfair" style={{ fontSize: '11px', color: '#475569', lineHeight: '1.6', margin: 0 }}>{item}</p>
                </li>
              ))}
            </ul>
            <div style={{ background: 'rgba(0,45,84,0.04)', border: '1px solid rgba(0,45,84,0.08)', borderRadius: '8px', padding: '10px 12px', marginTop: '4px' }}>
              <p className="cert-prof-montserrat" style={{ fontSize: '8.5px', color: '#64748b', lineHeight: '1.6', fontWeight: '400' }}>
                <strong style={{ color: deepNavy }}>Orientação de Extensão:</strong> Atividade docente de acompanhamento, supervisão e avaliação pedagógica dos discentes participantes do projeto.
              </p>
            </div>
          </div>

          {/* Right: QR Code panel */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
            background: 'rgba(0,45,84,0.03)', borderRadius: '14px', padding: '16px',
            border: '1px solid rgba(201,168,76,0.35)',
          }}>
            <div style={{
              padding: '8px', background: '#FAF6F0', borderRadius: '10px',
              border: `2px solid ${goldColor}`,
              boxShadow: '0 4px 16px rgba(201,168,76,0.2), 0 2px 8px rgba(0,0,0,0.1)',
            }}>
              <img src={qrCodeUrl} alt="QR Code de Validação" style={{ width: '120px', height: '120px', display: 'block' }} />
            </div>

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {[
                { label: 'Autenticação', value: cert.codigoPublico },
                { label: 'Situação', value: cert.situacao },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px', borderBottom: '1px solid rgba(0,45,84,0.08)' }}>
                  <span className="cert-prof-montserrat" style={{ fontSize: '8px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}:</span>
                  <span className="cert-prof-montserrat" style={{ fontSize: '8px', fontWeight: '700', color: deepNavy, fontFamily: 'monospace' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Micro footer */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-between px-12 pointer-events-none z-10" style={{ opacity: 0.45 }}>
          <span className="cert-prof-montserrat" style={{ fontSize: '7px', letterSpacing: '0.12em', color: deepNavy }}>
            SITUAÇÃO: {cert.situacao.toUpperCase()}
          </span>
          <span className="cert-prof-montserrat" style={{ fontSize: '7px', letterSpacing: '0.12em', color: deepNavy }}>
            VERSO
          </span>
        </div>
      </div>
    </div>
  );
};
