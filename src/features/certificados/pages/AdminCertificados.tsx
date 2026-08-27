/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { certificadosService } from '../../../services/certificados.service';
import { usuariosService } from '../../../services/usuarios.service';
import { AssinaturaDigital, Certificado } from '../../../types';
import {
  CheckCircle, Plus, X, GraduationCap, Download, ShieldOff, ShieldCheck,
  Building2, AlertTriangle
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { CertificadoTemplate } from '../components/CertificadoTemplate';
import { PortalOverlay } from '../../../components/ui/PortalOverlay';

const UNIDADES = [
  'Graças',
  'Boa Viagem',
  'Caxangá',
];

const formatFullDatePT = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
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
  const formatMonth = (d: Date) => {
    return months[d.getMonth()];
  };
  return `${formatMonth(start)} de ${start.getFullYear()} a ${formatMonth(end)} de ${end.getFullYear()}`;
};

export const AdminCertificados: React.FC = () => {
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCert, setSelectedCert] = useState<Certificado | null>(null);
  const [certAssinatura, setCertAssinatura] = useState<AssinaturaDigital | null>(null);
  const [assinaturaLoading, setAssinaturaLoading] = useState(false);

  const [certParaDownload, setCertParaDownload] = useState<Certificado | null>(null);
  const [downloadAssinatura, setDownloadAssinatura] = useState<AssinaturaDigital | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [assinaturaAlerta, setAssinaturaAlerta] = useState<{ cert: Certificado; assinatura: AssinaturaDigital | null } | null>(null);

  const [revokingCert, setRevokingCert] = useState<Certificado | null>(null);
  const [revocationReason, setRevocationReason] = useState('');
  const [isRevoking, setIsRevoking] = useState(false);
  const [revocationError, setRevocationError] = useState<string | null>(null);

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      alunoNome: '',
      alunoMatricula: '',
      alunoCpfLast6: '000000',
      projetoNome: '',
      professorResponsavel: '',
      titulacaoProfessor: '',
      cargaHoraria: 40,
      dataInicio: new Date().toISOString().split('T')[0],
      dataTermino: new Date().toISOString().split('T')[0],
      unidade: 'Campus Centro',
    }
  });

  const fetchCertificados = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await certificadosService.getCertificados();
      setCertificados(data);
    } catch (err) {
      setError('Erro ao carregar certificados. Verifique sua sessão e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCertificados(); }, []);

  const handleViewCert = async (cert: Certificado) => {
    setSelectedCert(cert);
    setAssinaturaLoading(true);
    setCertAssinatura(null);
    try {
      const ass = await usuariosService.getAssinaturaByUnidade(cert.unidade);
      setCertAssinatura(ass);
    } finally {
      setAssinaturaLoading(false);
    }
  };

  const handleDownloadPdf = async (cert: Certificado) => {
    setIsDownloading(true);
    setCertParaDownload(cert);
    setDownloadAssinatura(null);
    try {
      const ass = await usuariosService.getAssinaturaByUnidade(cert.unidade);
      setDownloadAssinatura(ass);

      if (!ass) {
        setAssinaturaAlerta({ cert, assinatura: ass });
        setIsDownloading(false);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      const container = document.getElementById('pdf-download-capture-area');
      if (!container) return;

      const frenteEl = container.querySelector('.certificado-frente') as HTMLElement;
      const versoEl = container.querySelector('.certificado-verso') as HTMLElement;

      if (frenteEl && versoEl) {
        const canvasFrente = await html2canvas(frenteEl, {
          scale: 2, useCORS: true, allowTaint: true, backgroundColor: null
        });
        const canvasVerso = await html2canvas(versoEl, {
          scale: 2, useCORS: true, allowTaint: true, backgroundColor: null
        });

        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        pdf.addImage(canvasFrente.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 297, 210);
        pdf.addPage();
        pdf.addImage(canvasVerso.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 297, 210);
        pdf.save(`certificado_${cert.codigoCertificado}.pdf`);
      }
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
    } finally {
      setCertParaDownload(null);
      setDownloadAssinatura(null);
      setIsDownloading(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokingCert || !revocationReason.trim()) return;
    setIsRevoking(true);
    setRevocationError(null);
    try {
      await certificadosService.revogarCertificado(revokingCert.id, revocationReason.trim());
      setRevokingCert(null);
      setRevocationReason('');
      fetchCertificados();
    } catch (err) {
      setRevocationError('Erro ao revogar certificado. Tente novamente.');
    } finally {
      setIsRevoking(false);
    }
  };

  const handleUnrevoke = async (cert: Certificado) => {
    try {
      await certificadosService.restaurarCertificado(cert.id);
      fetchCertificados();
    } catch (err) {
      setError('Erro ao restaurar certificado.');
    }
  };

  const onManualEmit = async (data: any) => {
    setIsSaving(true);
    try {
      await certificadosService.createCertificadoAvulso({
        alunoNome: data.alunoNome,
        alunoMatricula: data.alunoMatricula,
        alunoCpfLast6: data.alunoCpfLast6 || '000000',
        projetoNome: data.projetoNome,
        professorResponsavel: data.professorResponsavel,
        titulacaoProfessor: data.titulacaoProfessor,
        cargaHoraria: Number(data.cargaHoraria),
        dataInicio: data.dataInicio,
        dataTermino: data.dataTermino,
        unidade: data.unidade,
      });
      setShowModal(false);
      reset();
      fetchCertificados();
    } finally {
      setIsSaving(false);
    }
  };

  const inputCls = "bg-slate-50 p-2.5 rounded-xl border border-slate-200 w-full text-xs focus:outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Certificados Digitais Emitidos</h2>
          <p className="text-slate-400 text-xs mt-0.5">Monitore registros digitais ou emita certificados avulsos.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-cyan-500/10 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Emitir Certificado Avulso
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-3.5">Código Único</th>
                  <th className="px-6 py-3.5">Nome do Aluno</th>
                  <th className="px-6 py-3.5">Projeto Vinculado</th>
                  <th className="px-6 py-3.5">Unidade</th>
                  <th className="px-6 py-3.5">Data</th>
                  <th className="px-6 py-3.5">Situação</th>
                  <th className="px-6 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {certificados.map(cert => (
                  <tr key={cert.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">{cert.codigoCertificado}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{cert.alunoNome}</td>
                    <td className="px-6 py-4 font-semibold text-slate-700 max-w-[200px] truncate">{cert.projetoNome}</td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                        {cert.unidade}
                      </span>
                    </td>
                    <td className="px-6 py-4">{new Date(cert.dataEmissao).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4">
                      {cert.situacao === 'Válido' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          <ShieldCheck className="h-3 w-3" /> Válido
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full text-[10px] font-bold" title={cert.motivoRevogacao}>
                          <ShieldOff className="h-3 w-3" /> Revogado
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-1.5 whitespace-nowrap">
                      <button
                        onClick={() => handleViewCert(cert)}
                        className="bg-slate-50 hover:bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded-lg font-semibold border border-slate-200 text-[10px] transition cursor-pointer"
                      >
                        Visualizar
                      </button>
                      <button
                        onClick={() => handleDownloadPdf(cert)}
                        disabled={isDownloading}
                        className="bg-cyan-50 hover:bg-cyan-100 disabled:opacity-50 text-cyan-700 px-2.5 py-1.5 rounded-lg font-semibold border border-cyan-200 text-[10px] transition cursor-pointer flex items-center gap-1"
                      >
                        {isDownloading && certParaDownload?.id === cert.id ? (
                          <span className="w-3 h-3 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                          <Download className="h-3 w-3" />
                        )}
                        <span>{isDownloading && certParaDownload?.id === cert.id ? 'Baixando...' : 'Baixar PDF'}</span>
                      </button>
                      {cert.situacao === 'Válido' ? (
                        <button
                          onClick={() => { setRevokingCert(cert); setRevocationReason(''); setRevocationError(null); }}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 px-2.5 py-1.5 rounded-lg font-semibold border border-rose-200 text-[10px] transition cursor-pointer flex items-center gap-1"
                        >
                          <ShieldOff className="h-3 w-3" />
                          Revogar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnrevoke(cert)}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1.5 rounded-lg font-semibold border border-emerald-200 text-[10px] transition cursor-pointer flex items-center gap-1"
                        >
                          <ShieldCheck className="h-3 w-3" />
                          Restaurar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {certificados.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-slate-400">
                      Nenhum certificado emitido ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL — Revogação com Motivo */}
      {revokingCert && (
        <PortalOverlay onClose={() => { setRevokingCert(null); setRevocationReason(''); setRevocationError(null); }}>
          <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-200 shadow-2xl flex flex-col gap-5 animate-slide-up">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Revogar Certificado</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Esta ação é irreversível.</p>
                </div>
              </div>
              <button onClick={() => { setRevokingCert(null); setRevocationReason(''); setRevocationError(null); }} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 text-xs">
              <p className="text-slate-600 font-semibold">{revokingCert.alunoNome}</p>
              <p className="text-slate-400 mt-0.5">{revokingCert.codigoCertificado} — {revokingCert.projetoNome}</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-600 text-xs">Motivo da Revogação *</label>
              <textarea
                value={revocationReason}
                onChange={(e) => setRevocationReason(e.target.value)}
                placeholder="Descreva o motivo da revogação..."
                rows={3}
                className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 w-full text-xs focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 resize-none"
              />
            </div>

            {revocationError && (
              <p className="text-rose-600 text-[10px] font-semibold">{revocationError}</p>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setRevokingCert(null); setRevocationReason(''); setRevocationError(null); }}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleRevoke}
                disabled={isRevoking || !revocationReason.trim()}
                className="text-xs bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white px-4 py-2 rounded-xl font-bold cursor-pointer transition"
              >
                {isRevoking ? 'Revogando...' : 'Revogar Certificado'}
              </button>
            </div>
          </div>
        </PortalOverlay>
      )}

      {/* MODAL — Alerta de Assinatura Ausente */}
      {assinaturaAlerta && (
        <PortalOverlay onClose={() => setAssinaturaAlerta(null)}>
          <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-200 shadow-2xl flex flex-col gap-5 animate-slide-up">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Assinatura Não Configurada</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">O certificado será gerado sem assinatura institucional.</p>
                </div>
              </div>
              <button onClick={() => setAssinaturaAlerta(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-amber-50 rounded-xl p-4 text-xs border border-amber-100">
              <p className="text-amber-800 font-semibold mb-1">Atenção</p>
              <p className="text-amber-700">
                Não existe assinatura institucional ativa para o campus <strong>{assinaturaAlerta.cert.unidade}</strong>.
                O PDF será gerado com aviso de assinatura não configurada.
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setAssinaturaAlerta(null)}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const cert = assinaturaAlerta.cert;
                  setAssinaturaAlerta(null);
                  setIsDownloading(true);
                  setCertParaDownload(cert);
                  setDownloadAssinatura(null);
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  const container = document.getElementById('pdf-download-capture-area');
                  if (!container) { setIsDownloading(false); return; }
                  const frenteEl = container.querySelector('.certificado-frente') as HTMLElement;
                  const versoEl = container.querySelector('.certificado-verso') as HTMLElement;
                  if (frenteEl && versoEl) {
                    const canvasFrente = await html2canvas(frenteEl, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: null });
                    const canvasVerso = await html2canvas(versoEl, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: null });
                    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
                    pdf.addImage(canvasFrente.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 297, 210);
                    pdf.addPage();
                    pdf.addImage(canvasVerso.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 297, 210);
                    pdf.save(`certificado_${cert.codigoCertificado}.pdf`);
                  }
                  setCertParaDownload(null);
                  setDownloadAssinatura(null);
                  setIsDownloading(false);
                }}
                className="text-xs bg-amber-500 hover:bg-amber-400 text-white px-4 py-2 rounded-xl font-bold cursor-pointer transition"
              >
                Gerar PDF Mesmo Assim
              </button>
            </div>
          </div>
        </PortalOverlay>
      )}

      {/* MODAL — Emissão Avulsa */}
      {showModal && (
        <PortalOverlay onClose={() => { setShowModal(false); reset(); }}>
          <div className="bg-white rounded-3xl p-8 max-w-xl w-full border border-slate-200 shadow-2xl flex flex-col gap-5 animate-slide-up" style={{ maxHeight: 'calc(100vh - 32px)', overflowY: 'auto' }}>
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Emitir Certificado Avulso</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Preencha todos os dados. A assinatura do diretor é inserida automaticamente pela unidade.</p>
              </div>
              <button onClick={() => { setShowModal(false); reset(); }} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onManualEmit)} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="font-semibold text-slate-600">Nome do Aluno</label>
                  <input type="text" placeholder="Nome completo" {...register('alunoNome', { required: true })} className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-600">Matrícula</label>
                  <input type="text" placeholder="2024001" {...register('alunoMatricula', { required: true })} className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-600">CPF (últimos 6)</label>
                  <input type="text" placeholder="123456" {...register('alunoCpfLast6')} className={inputCls} />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-600">Título da Atividade / Projeto</label>
                <input type="text" placeholder="Ex: Inclusão Digital para a Terceira Idade" {...register('projetoNome', { required: true })} className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-600">Orientador Responsável</label>
                  <input type="text" placeholder="Nome do professor" {...register('professorResponsavel', { required: true })} className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-600">Titulação Docente</label>
                  <input type="text" placeholder="Doutor, Mestre..." {...register('titulacaoProfessor', { required: true })} className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-600">CH (horas)</label>
                  <input type="number" {...register('cargaHoraria', { required: true })} className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-600">Início</label>
                  <input type="date" {...register('dataInicio', { required: true })} className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-600">Término</label>
                  <input type="date" {...register('dataTermino', { required: true })} className={inputCls} />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-600 flex items-center gap-1.5">
                  <Building2 className="h-3 w-3" /> Unidade / Campus
                </label>
                <select {...register('unidade', { required: true })} className={inputCls}>
                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-white font-bold text-xs py-3 rounded-xl uppercase tracking-wider transition cursor-pointer"
              >
                {isSaving ? 'Emitindo...' : 'Emitir Certificado'}
              </button>
            </form>
          </div>
        </PortalOverlay>
      )}

      {/* MODAL — Visualização com assinatura dinâmica */}
      {selectedCert && (
        <PortalOverlay onClose={() => setSelectedCert(null)}>
          <div className="bg-white rounded-3xl p-8 max-w-3xl w-full border border-slate-200 shadow-2xl flex flex-col gap-6 animate-slide-up" style={{ maxHeight: 'calc(100vh - 32px)', overflowY: 'auto' }}>
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Visualização do Certificado</h3>
              <button onClick={() => setSelectedCert(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            {assinaturaLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <CertificadoTemplate cert={selectedCert} assinatura={certAssinatura} />
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedCert(null)}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </PortalOverlay>
      )}
      {/* Container Oculto para Renderização e Captura do PDF */}
      {certParaDownload && (
        <div
          id="pdf-download-capture-area"
          style={{
            position: 'absolute',
            left: '-9999px',
            top: '-9999px',
            width: '1122px',
            zIndex: -1000
          }}
        >
          <CertificadoTemplate cert={certParaDownload} assinatura={downloadAssinatura} />
        </div>
      )}
    </div>
  );
};
