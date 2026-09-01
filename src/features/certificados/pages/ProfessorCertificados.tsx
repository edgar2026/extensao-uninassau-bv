/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { certificadosService } from '../../../services/certificados.service';
import { usuariosService } from '../../../services/usuarios.service';
import { CertificadoProfessor, AssinaturaDigital } from '../../../types';
import { ShieldCheck, Download, AlertTriangle, LogOut, Eye, Award, CheckCircle2, XCircle } from 'lucide-react';
import { Loading } from '../../../components/ui/Loading';
import { Card } from '../../../components/ui/Card';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { CertificadoProfessorTemplate } from '../components/CertificadoProfessorTemplate';
import { generateCertificadoPdf } from '../utils/generatePdf';

export const ProfessorCertificados: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [certificados, setCertificados] = useState<CertificadoProfessor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedCert, setSelectedCert] = useState<CertificadoProfessor | null>(null);
  const [certAssinatura, setCertAssinatura] = useState<AssinaturaDigital | null>(null);
  const [assinaturaLoading, setAssinaturaLoading] = useState(false);

  const [certParaDownload, setCertParaDownload] = useState<CertificadoProfessor | null>(null);
  const [downloadAssinatura, setDownloadAssinatura] = useState<AssinaturaDigital | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [assinaturaAlerta, setAssinaturaAlerta] = useState<{ cert: CertificadoProfessor; assinatura: AssinaturaDigital | null } | null>(null);

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
        const certs = await certificadosService.getCertificadosByProfessor(user.id);
        setCertificados(certs);
      } catch (err: any) {
        console.error('Erro ao buscar certificados do professor:', err);
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

  const handleViewCert = async (cert: CertificadoProfessor) => {
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

  const handleDownloadPdf = async (cert: CertificadoProfessor) => {
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

      await generateCertificadoPdf(cert, 'professor-pdf-capture-area');
    } catch (err) {
      console.error('Erro ao gerar PDF do professor:', err);
    } finally {
      setCertParaDownload(null);
      setDownloadAssinatura(null);
      setIsDownloading(false);
    }
  };

  if (authLoading || isLoading) {
    return <Loading message="Carregando certificados de orientação..." />;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Award className="h-5 w-5 text-cyan-600" />
            Meus Certificados de Orientação
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Certificados oficiais emitidos para cada projeto de extensão universitária orientado e aprovado institucionalmente.
          </p>
        </div>
      </div>

      {/* CERTIFICATES TABLE CARD */}
      <Card padded={false} className="overflow-hidden w-full h-fit shadow-sm border-slate-200/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-3.5">Código Público</th>
                <th className="px-6 py-3.5">Título do Projeto</th>
                <th className="px-6 py-3.5">Categoria</th>
                <th className="px-6 py-3.5">Período</th>
                <th className="px-6 py-3.5">Data de Emissão</th>
                <th className="px-6 py-3.5">Situação</th>
                <th className="px-6 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {certificados.map(cert => (
                <tr key={cert.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-6 py-4 font-mono font-bold text-slate-900">{cert.codigoPublico}</td>
                  <td className="px-6 py-4 font-semibold text-slate-800 max-w-xs truncate" title={cert.projetoNome}>
                    {cert.projetoNome}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-50 text-cyan-700 border border-cyan-100">
                      {cert.projetoCategoria || 'Extensão'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                    {cert.dataInicio ? `${new Date(cert.dataInicio + 'T00:00:00').toLocaleDateString('pt-BR')} a ${new Date(cert.dataTermino + 'T00:00:00').toLocaleDateString('pt-BR')}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {cert.dataEmissao ? new Date(cert.dataEmissao + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="px-6 py-4">
                    {cert.situacao === 'Válido' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" /> Válido
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle className="h-3 w-3" /> Revogado
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2 whitespace-nowrap">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleViewCert(cert)}
                      className="inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Visualizar</span>
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleDownloadPdf(cert)}
                      disabled={isDownloading}
                      className="inline-flex items-center gap-1 bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer"
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
              {certificados.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    Nenhum certificado de orientação homologado no momento. Os certificados são gerados automaticamente quando seus projetos são aprovados pela comissão institucional.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* PREVIEW MODAL */}
      <Modal
        isOpen={Boolean(selectedCert)}
        onClose={() => setSelectedCert(null)}
        title="Visualização Oficial do Certificado de Orientação"
        size="lg"
      >
        {selectedCert && (
          <div className="flex flex-col gap-6 text-left select-none">
            {assinaturaLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="scale-[0.85] sm:scale-100 origin-top flex justify-center py-2 overflow-x-auto">
                <CertificadoProfessorTemplate
                  cert={selectedCert}
                  assinatura={certAssinatura}
                />
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setSelectedCert(null)}>
                Fechar
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const cert = selectedCert;
                  setSelectedCert(null);
                  handleDownloadPdf(cert);
                }}
                disabled={isDownloading}
                className="inline-flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                <Download className="h-4 w-4" /> Baixar em PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* HIDDEN OFF-SCREEN CONTAINER FOR PDF GENERATION */}
      {certParaDownload && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0, width: '900px' }}>
          <div id="professor-pdf-capture-area">
            <CertificadoProfessorTemplate
              cert={certParaDownload}
              assinatura={downloadAssinatura}
            />
          </div>
        </div>
      )}

      {/* SIGNATURE MISSING ALERT */}
      {assinaturaAlerta && (
        <Modal
          isOpen={true}
          onClose={() => setAssinaturaAlerta(null)}
          title="Aviso de Emissão"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Não há assinatura digital da Reitoria configurada para a unidade deste projeto. O certificado será gerado sem a chancela eletrônica.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setAssinaturaAlerta(null)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={async () => {
                  const cert = assinaturaAlerta.cert;
                  setAssinaturaAlerta(null);
                  setIsDownloading(true);
                  setCertParaDownload(cert);
                  try {
                    await generateCertificadoPdf(cert, 'professor-pdf-capture-area');
                  } finally {
                    setCertParaDownload(null);
                    setIsDownloading(false);
                  }
                }}
              >
                Continuar Download
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
