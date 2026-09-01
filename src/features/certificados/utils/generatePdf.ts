import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Certificado, CertificadoProfessor } from '../../../types';

const PDF_CAPTURE_DELAY_MS = 1500;

export async function generateCertificadoPdf(
  cert: Certificado | CertificadoProfessor,
  containerId: string,
): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, PDF_CAPTURE_DELAY_MS));

  const container = document.getElementById(containerId);
  if (!container) throw new Error(`Container #${containerId} not found`);

  const frenteEl = container.querySelector('.certificado-frente') as HTMLElement | null;
  const versoEl = container.querySelector('.certificado-verso') as HTMLElement | null;

  if (!frenteEl || !versoEl) throw new Error('Certificate elements not found');

  const canvasFrente = await html2canvas(frenteEl, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: null,
  });

  const canvasVerso = await html2canvas(versoEl, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: null,
  });

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  pdf.addImage(canvasFrente.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 297, 210);
  pdf.addPage();
  pdf.addImage(canvasVerso.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 297, 210);
  
  const fileCode = 'codigoCertificado' in cert && cert.codigoCertificado 
    ? cert.codigoCertificado 
    : 'codigoPublico' in cert 
      ? (cert as CertificadoProfessor).codigoPublico 
      : (cert as Certificado).codigoAutenticacao;
      
  pdf.save(`certificado_${fileCode}.pdf`);
}

