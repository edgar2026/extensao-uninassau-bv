import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { certificadosService } from '../../../services/certificados.service';
import { Certificado } from '../../../types';
import { 
  ShieldCheck, ShieldAlert, Award, Calendar, Clock, 
  Search, ArrowLeft, QrCode 
} from 'lucide-react';
import { Loading } from '../../../components/ui/Loading';
import { Alert } from '../../../components/ui/Alert';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Html5Qrcode } from 'html5-qrcode';

export const ValidationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryCode = searchParams.get('codigo') || '';
  
  const [code, setCode] = useState(queryCode);
  const [certificate, setCertificate] = useState<Certificado | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Auto search if query parameter exists
  useEffect(() => {
    if (queryCode) {
      handleValidate(queryCode);
    }
  }, [queryCode]);

  const handleValidate = async (searchCode: string) => {
    if (!searchCode.trim()) return;
    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    
    try {
      const result = await certificadosService.validarCertificado(searchCode);
      setCertificate(result);
      if (!result) {
        setError('Certificado não encontrado. Por favor, verifique o código informado.');
      }
    } catch (err) {
      setError('Erro ao validar certificado. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  // Camera scanner hook
  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;

    if (isScanning) {
      html5QrCode = new Html5Qrcode('qr-reader');
      
      html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: (width: number, height: number) => {
            const min = Math.min(width, height);
            return { width: Math.round(min * 0.7), height: Math.round(min * 0.7) };
          }
        },
        (decodedText: string) => {
          let scannedCode = decodedText;
          if (decodedText.includes('codigo=')) {
            try {
              const url = new URL(decodedText);
              const codeParam = url.searchParams.get('codigo');
              if (codeParam) scannedCode = codeParam;
            } catch (e) {}
          }
          
          setCode(scannedCode);
          setIsScanning(false);
          handleValidate(scannedCode);
        },
        () => {
          // Silent scan failure callback
        }
      ).catch((err) => {
        console.error('Error starting html5-qrcode:', err);
        setError('Não foi possível acessar a câmera. Certifique-se de dar permissão.');
        setIsScanning(false);
      });
    }

    return () => {
      if (html5QrCode) {
        if (html5QrCode.isScanning) {
          html5QrCode.stop().then(() => {
            html5QrCode.clear();
          }).catch((err) => console.error('Error stopping html5-qrcode:', err));
        }
      }
    };
  }, [isScanning]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleValidate(code);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans">
      
      {/* HEADER NAVBAR */}
      <header className="bg-white border-b border-slate-200 py-5 px-8 flex justify-between items-center shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="UNINASSAU" className="h-10 w-auto object-contain select-none" />
          <div className="h-5 w-[1px] bg-slate-200 mx-1" />
          <div className="text-left">
            <h1 className="text-slate-950 font-bold text-xs leading-none">Validador Público</h1>
            <p className="text-slate-400 text-[9px] mt-0.5">Portal de Autenticidade e Certificação</p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition px-3 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer border border-slate-200 shadow-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Voltar ao Login</span>
        </button>
      </header>

      {/* CORE CONTENT */}
      <main className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="max-w-2xl w-full flex flex-col gap-8">
          
          {/* SEARCH BOX */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-100/50 text-left">
            <div className="text-center max-w-md mx-auto mb-6">
              <h2 className="text-xl font-extrabold text-slate-900 mb-1.5">Verificação de Autenticidade</h2>
              <p className="text-slate-400 text-xs">
                Insira o código permanente, código de autenticação ou UUID do certificado impresso para validar publicamente sua situação.
              </p>
            </div>

            <form onSubmit={onSubmit} className="flex gap-2 items-end">
              <div className="flex-1">
                <Input
                  placeholder="Ex: CERT-2026-001 ou 8F7A9B3C"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  icon={Search}
                />
              </div>
              <Button type="submit" isLoading={isLoading} className="h-[42px] px-6 py-0 rounded-2xl cursor-pointer">
                Validar
              </Button>
            </form>

            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={() => setIsScanning(!isScanning)}
                className="flex items-center gap-2 text-xs font-bold text-cyan-600 hover:text-cyan-500 transition px-4 py-2.5 rounded-xl bg-cyan-50 hover:bg-cyan-100/60 cursor-pointer shadow-xs border border-cyan-100"
              >
                <QrCode className="h-4 w-4" />
                <span>{isScanning ? 'Fechar Câmera' : 'Escanear QR Code com a Câmera'}</span>
              </button>

              {isScanning && (
                <div className="w-full p-4 border border-slate-200 bg-slate-50/50 rounded-2xl animate-fade-in text-center relative overflow-hidden">
                  <div id="qr-reader" className="mx-auto overflow-hidden rounded-xl bg-black max-w-sm border border-slate-300 shadow-inner" />
                  <p className="text-[10px] text-slate-400 mt-2">
                    Aproxime o QR Code do verso do certificado da câmera para validação instantânea.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* SEARCH RESULT SCREEN */}
          {hasSearched && (
            <div className="animate-fade-in text-left">
              {isLoading ? (
                <Loading message="Consultando registro público..." />
              ) : certificate ? (
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden shadow-slate-100/50">
                  {/* BANNER DE AUTENTICIDADE OU REVOGAÇÃO (REGRA 12) */}
                  {certificate.situacao === 'Revogado' ? (
                    <div className="bg-rose-50 px-8 py-5 border-b border-rose-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600">
                          <ShieldAlert className="h-6 w-6" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-rose-700 leading-none">Certificado Revogado</span>
                          <h3 className="text-rose-950 font-extrabold text-sm leading-tight mt-0.5">Sem Validade Jurídica ou Acadêmica</h3>
                        </div>
                      </div>
                      <span className="bg-rose-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                        REVOGADO
                      </span>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 px-8 py-5 border-b border-emerald-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
                          <ShieldCheck className="h-6 w-6" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 leading-none">Autenticidade Confirmada</span>
                          <h3 className="text-emerald-900 font-extrabold text-sm leading-tight mt-0.5">Certificado Oficial Autenticado</h3>
                        </div>
                      </div>
                      <span className="bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                        {certificate.situacao}
                      </span>
                    </div>
                  )}

                  {/* DETAILS BODY */}
                  <div className="p-8 space-y-6">
                    {certificate.tipo === 'professor_orientador' ? (
                      /* PROFESSOR ORIENTATION CERTIFICATE DETAILS */
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo de Documento</span>
                          <span className="text-cyan-800 font-bold text-sm mt-1">Certificado de Orientação de Projeto de Extensão</span>
                          <span className="text-xs text-slate-400 mt-0.5">Orientação Docente Homologada</span>
                        </div>

                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Professor Orientador</span>
                          <span className="text-slate-800 font-bold text-sm mt-1">
                            {certificate.titulacaoProfessor ? `${certificate.titulacaoProfessor} ` : ''}{certificate.professorResponsavel}
                          </span>
                          <span className="text-xs text-slate-400 mt-0.5">Titulação: {certificate.titulacaoProfessor || 'Não informada'}</span>
                        </div>

                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Projeto Orientado</span>
                          <span className="text-slate-800 font-bold text-sm mt-1">{certificate.projetoNome}</span>
                          <span className="text-xs text-slate-400 mt-0.5">Unidade: {certificate.unidade || 'UNINASSAU'}</span>
                        </div>

                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Período de Realização</span>
                          <div className="flex items-center gap-2 mt-1 text-slate-700 text-xs font-semibold">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            <span>
                              {certificate.dataInicio && certificate.dataTermino
                                ? `${certificate.dataInicio} a ${certificate.dataTermino}`
                                : 'Período regular'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* STUDENT PARTICIPANT CERTIFICATE DETAILS */
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aluno Diplomado</span>
                          <span className="text-slate-800 font-bold text-sm mt-1">{certificate.alunoNome}</span>
                          <span className="text-xs text-slate-400 mt-0.5">Matrícula: {certificate.alunoMatricula || 'N/A'}</span>
                        </div>

                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Projeto / Atividade</span>
                          <span className="text-slate-800 font-bold text-sm mt-1">{certificate.projetoNome}</span>
                          <span className="text-xs text-slate-400 mt-0.5">Unidade: {certificate.unidade || 'UNINASSAU'}</span>
                        </div>

                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Professor Responsável</span>
                          <span className="text-slate-800 font-bold text-sm mt-1">{certificate.professorResponsavel}</span>
                          <span className="text-xs text-slate-400 mt-0.5">Titulação: {certificate.titulacaoProfessor || 'Prof.'}</span>
                        </div>

                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Metadados de Carga Horária</span>
                          <div className="flex items-center gap-4 mt-1">
                            <div className="flex items-center gap-1.5 text-slate-700 text-xs font-semibold">
                              <Clock className="h-4 w-4 text-slate-400" />
                              <span>{certificate.cargaHoraria} horas totais</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-700 text-xs font-semibold">
                              <Calendar className="h-4 w-4 text-slate-400" />
                              <span>{certificate.dataInicio ? certificate.dataInicio.substring(0, 4) : ''}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="h-[1px] bg-slate-100" />

                    {/* METADATA BLOCK */}
                    <div className="bg-slate-50 p-4 rounded-2xl flex flex-col md:flex-row justify-between gap-4">
                      <div className="space-y-1.5 text-xs text-slate-505">
                        {certificate.codigoCertificado && (
                          <div>
                            <span className="font-semibold text-slate-700">Código de Registro:</span>{' '}
                            <code className="bg-slate-200/60 px-1.5 py-0.5 rounded font-mono text-xs">{certificate.codigoCertificado}</code>
                          </div>
                        )}
                        <div>
                          <span className="font-semibold text-slate-700">Código de Autenticação:</span>{' '}
                          <code className="bg-slate-200/60 px-1.5 py-0.5 rounded font-mono text-xs">{certificate.codigoAutenticacao}</code>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700">UUID de Validação:</span>{' '}
                          <span className="font-mono text-[10px]">{certificate.uuid}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-6 self-center shrink-0">
                        <div className="flex flex-col items-center">
                          <QrCode className="h-12 w-12 text-slate-700" />
                          <span className="text-[8px] text-slate-400 uppercase tracking-wider font-semibold mt-1">Autenticação QR</span>
                        </div>
                        <div className="text-slate-400 text-[10px] max-w-[120px] leading-tight">
                          Certificado gerado e assinado eletronicamente em {certificate.dataEmissao ? new Date(certificate.dataEmissao.includes('T') ? certificate.dataEmissao : certificate.dataEmissao + 'T12:00:00').toLocaleDateString('pt-BR') : ''}.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-rose-50 border border-rose-100 p-8 rounded-3xl text-center flex flex-col items-center">
                  <div className="h-12 w-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 mb-4">
                    <ShieldAlert className="h-6 w-6" />
                  </div>
                  <h3 className="text-rose-900 font-extrabold text-sm mb-1">Verificação Inválida</h3>
                  <p className="text-rose-700 text-xs max-w-md">{error}</p>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-500 text-[10px] text-center py-6 px-8 shrink-0">
        <p className="font-medium text-slate-400 mb-1">Plataforma Digital de Extensão & Credenciamento Curricular</p>
        <p>© 2026 Instituição de Ensino Superior. Assinaturas eletrônicas homologadas sob as normas ICP-Brasil.</p>
      </footer>

    </div>
  );
};
