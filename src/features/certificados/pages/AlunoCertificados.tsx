/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { certificadosService } from '../../../services/certificados.service';
import { projetosService } from '../../../services/projetos.service';
import { usuariosService } from '../../../services/usuarios.service';
import { Certificado, AssinaturaDigital, Projeto } from '../../../types';
import { ShieldCheck, Download, AlertTriangle, LogOut } from 'lucide-react';
import { Loading } from '../../../components/ui/Loading';
import { Card } from '../../../components/ui/Card';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { CertificadoTemplate } from '../components/CertificadoTemplate';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const AlunoCertificados: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCert, setSelectedCert] = useState<Certificado | null>(null);
  const [certAssinatura, setCertAssinatura] = useState<AssinaturaDigital | null>(null);
  const [assinaturaLoading, setAssinaturaLoading] = useState(false);
  const [certParaDownload, setCertParaDownload] = useState<Certificado | null>(null);
  const [downloadAssinatura, setDownloadAssinatura] = useState<AssinaturaDigital | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [assinaturaAlerta, setAssinaturaAlerta] = useState<{ cert: Certificado; assinatura: AssinaturaDigital | null } | null>(null);
  const [activeTab, setActiveTab] = useState<'extensao' | 'ic'>('extensao');

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [certs, projs] = await Promise.all([
          certificadosService.getCertificadosByAluno(user.id),
          projetosService.getProjetosByAluno(user.id)
        ]);
        setCertificados(certs);
        setProjetos(projs);
      } catch (err: any) {
        if (err?.message?.includes('JWT') || err?.statusCode === 401) {
          setError('Sessão expirada. Faça login novamente.');
        } else {
          setError('Erro ao carregar certificados. Tente novamente.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, authLoading]);

  const filteredCertificados = certificados.filter(cert => {
    const proj = projetos.find(p => p.nome === cert.projetoNome);
    if (!proj) return activeTab === 'extensao';
    const isExt = proj.areaTematica === 'Extensão';
    return activeTab === 'extensao' ? isExt : !isExt;
  });

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

      const container = document.getElementById('aluno-pdf-capture-area');
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

  if (authLoading || isLoading) {
    return <Loading message="Carregando certificados digitais..." />;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <p className="text-slate-600 text-sm font-semibold">Sessão não encontrada.</p>
        <Button onClick={() => window.location.href = '/'} variant="primary" size="sm">
          <LogOut className="h-3.5 w-3.5 mr-1" /> Voltar ao Login
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <AlertTriangle className="h-12 w-12 text-rose-500" />
        <p className="text-slate-600 text-sm font-semibold">{error}</p>
        <Button onClick={() => window.location.reload()} variant="primary" size="sm">
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Meus Certificados Digitais Homologados</h2>
        <p className="text-slate-400 text-xs">
          Após aprovação final de seus relatórios, seus certificados são gerados e assinados eletronicamente sob a cadeia ICP-Brasil. Baixe ou consulte a autenticidade a qualquer momento.
        </p>
      </div>

      {/* Segment Tab Bar */}
      <div className="flex border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('extensao')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'extensao'
              ? 'border-cyan-500 text-cyan-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Extensão Universitária
        </button>
        <button
          onClick={() => setActiveTab('ic')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'ic'
              ? 'border-cyan-500 text-cyan-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          IC - Iniciação Científica
        </button>
      </div>

      {/* CERTIFICATE GRID */}
      <Card padded={false} className="overflow-hidden w-full h-fit">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-3.5">Código Único</th>
                <th className="px-6 py-3.5">Projeto Realizado</th>
                <th className="px-6 py-3.5">Carga Horária</th>
                <th className="px-6 py-3.5">Data Emissão</th>
                <th className="px-6 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {filteredCertificados.map(cert => (
                <tr key={cert.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-mono font-bold text-slate-900">{cert.codigoCertificado}</td>
                  <td className="px-6 py-4 font-semibold text-slate-800">{cert.projetoNome}</td>
                  <td className="px-6 py-4 text-slate-600">{cert.cargaHoraria}h</td>
                  <td className="px-6 py-4">{new Date(cert.dataEmissao).toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4 text-right flex justify-end gap-1.5 whitespace-nowrap">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleViewCert(cert)}
                    >
                      Visualizar
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleDownloadPdf(cert)}
                      disabled={isDownloading}
                      className="inline-flex items-center gap-1 bg-cyan-600 hover:bg-cyan-500 text-white"
                    >
                      {isDownloading && certParaDownload?.id === cert.id ? (
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                      <span>{isDownloading && certParaDownload?.id === cert.id ? 'Baixando...' : 'Baixar PDF'}</span>
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredCertificados.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    Nenhum certificado homologado nesta categoria no momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* DYNAMIC VISUAL CERTIFICATE PREVIEW MODAL */}
      <Modal
        isOpen={Boolean(selectedCert)}
        onClose={() => setSelectedCert(null)}
        title="Visualização Oficial do Certificado"
        size="lg"
      >
        {selectedCert && (
          <div className="flex flex-col gap-6 text-left select-none">
            {assinaturaLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <CertificadoTemplate cert={selectedCert} assinatura={certAssinatura} />
            )}
             <div className="flex justify-end">
               <Button variant="ghost" size="sm" onClick={() => setSelectedCert(null)}>Voltar</Button>
             </div>
          </div>
        )}
      </Modal>

      {/* MODAL — Alerta de Assinatura Ausente */}
      {assinaturaAlerta && (
        <Modal
          isOpen={true}
          onClose={() => setAssinaturaAlerta(null)}
          title="Assinatura Não Configurada"
          size="sm"
        >
          <div className="flex flex-col gap-4 text-left">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-slate-800">Assinatura institucional não encontrada</p>
                <p className="text-xs text-slate-500 mt-1">
                  Não existe assinatura ativa para o campus <strong>{assinaturaAlerta.cert.unidade}</strong>.
                  O certificado será gerado com aviso de assinatura não configurada.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setAssinaturaAlerta(null)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={async () => {
                  const cert = assinaturaAlerta.cert;
                  setAssinaturaAlerta(null);
                  setIsDownloading(true);
                  setCertParaDownload(cert);
                  setDownloadAssinatura(null);
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  const container = document.getElementById('aluno-pdf-capture-area');
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
                className="bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                Gerar PDF Mesmo Assim
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Container oculto para geração do PDF sem dialog de impressão */}
      {certParaDownload && (
        <div
          id="aluno-pdf-capture-area"
          style={{
            position: 'absolute',
            left: '-9999px',
            top: '-9999px',
            width: '1122px',
            zIndex: -1000,
          }}
        >
          <CertificadoTemplate cert={certParaDownload} assinatura={downloadAssinatura} />
        </div>
      )}
    </div>
  );
};
