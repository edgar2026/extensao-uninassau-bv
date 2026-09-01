/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { Projeto } from '../../../types';

/**
 * Colunas da exportação de dados
 */
const EXPORT_COLUMNS = [
  'nome_projeto',
  'categoria',
  'campus',
  'descricao',
  'carga_horaria',
  'data_inicio',
  'data_termino',
  'status',
  'nome_professor',
  'email_professor',
  'nome_completo_aluno',
  'email_aluno',
  'data_criacao',
  'data_envio',
  'data_aprovacao',
];

function formatStatusLabel(status?: string): string {
  switch (status) {
    case 'enviado':
      return 'Aguardando 1ª análise';
    case 'reenviado':
      return 'Reenviado para nova análise';
    case 'correcao_solicitada':
      return 'Aguardando correção do professor';
    case 'aprovado':
      return 'Aprovado';
    case 'rejeitado':
      return 'Rejeitado';
    case 'rascunho':
      return 'Rascunho';
    default:
      return status || '—';
  }
}

/**
 * Exporta projetos existentes para XLSX (Excel)
 * Gera uma linha por participante
 */
export function exportProjectsToXlsx(
  projetos: Projeto[],
  filename?: string
): void {
  const rows: (string | number)[][] = [EXPORT_COLUMNS];

  for (const proj of projetos) {
    const participants = proj.alunosParticipantes || [];

    if (participants.length === 0) {
      rows.push([
        proj.nome || '',
        proj.areaTematica || '',
        proj.campus || '',
        proj.descricao || '',
        proj.cargaHoraria || 0,
        proj.dataInicio || '',
        proj.dataTermino || '',
        formatStatusLabel(proj.status),
        proj.professorResponsavel || '',
        proj.professorEmail || '',
        '',
        '',
        proj.dataCriacao || '',
        proj.dataAtualizacao || '',
        proj.reviewedAt || '',
      ]);
    } else {
      for (const aluno of participants) {
        rows.push([
          proj.nome || '',
          proj.areaTematica || '',
          proj.campus || '',
          proj.descricao || '',
          proj.cargaHoraria || 0,
          proj.dataInicio || '',
          proj.dataTermino || '',
          formatStatusLabel(proj.status),
          proj.professorResponsavel || '',
          proj.professorEmail || '',
          aluno.nome || '',
          aluno.email || '',
          proj.dataCriacao || '',
          proj.dataAtualizacao || '',
          proj.reviewedAt || '',
        ]);
      }
    }
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 35 },
    { wch: 12 },
    { wch: 14 },
    { wch: 50 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 26 },
    { wch: 25 },
    { wch: 35 },
    { wch: 30 },
    { wch: 35 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Projetos e Participantes');

  const defaultFilename = `exportacao_projetos_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename || defaultFilename);
}

/**
 * Exporta projetos existentes para CSV
 * Compatível com acentuação e Excel em português
 */
export function exportProjectsToCsv(
  projetos: Projeto[],
  filename?: string
): void {
  const headers = [
    'Nome do Projeto',
    'Categoria',
    'Campus',
    'Descrição',
    'Carga Horária (h)',
    'Data Início',
    'Data Término',
    'Status',
    'Professor Responsável',
    'Email Professor',
    'Aluno Participante',
    'Email Aluno',
    'Data Criação/Envio'
  ];

  const rows: string[][] = [headers];

  for (const proj of projetos) {
    const participants = proj.alunosParticipantes || [];
    if (participants.length === 0) {
      rows.push([
        proj.nome || '',
        proj.areaTematica || '',
        proj.campus || '',
        proj.descricao || '',
        String(proj.cargaHoraria || 0),
        proj.dataInicio || '',
        proj.dataTermino || '',
        formatStatusLabel(proj.status),
        proj.professorResponsavel || '',
        proj.professorEmail || '',
        '',
        '',
        proj.dataCriacao || ''
      ]);
    } else {
      for (const aluno of participants) {
        rows.push([
          proj.nome || '',
          proj.areaTematica || '',
          proj.campus || '',
          proj.descricao || '',
          String(proj.cargaHoraria || 0),
          proj.dataInicio || '',
          proj.dataTermino || '',
          formatStatusLabel(proj.status),
          proj.professorResponsavel || '',
          proj.professorEmail || '',
          aluno.nome || '',
          aluno.email || '',
          proj.dataCriacao || ''
        ]);
      }
    }
  }

  const csvContent = rows
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    .join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename || `exportacao_projetos_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exporta projetos filtrados para PDF
 * Gera relatório visual paginado em formato A4 Paisagem
 */
export function exportProjectsToPdf(
  projetos: Projeto[],
  filename?: string
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Cabeçalho institucional
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('UNINASSAU - Relatório de Projetos de Extensão & Iniciação Científica', 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // slate-300
  const dateStr = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Gerado em: ${dateStr} | Total de projetos exportados: ${projetos.length}`, 14, 18);

  let y = 32;

  const drawTableHeader = () => {
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(14, y, pageWidth - 28, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85); // slate-700
    doc.text('NOME DO PROJETO', 16, y + 5.5);
    doc.text('CATEGORIA', 85, y + 5.5);
    doc.text('CAMPUS', 115, y + 5.5);
    doc.text('ORIENTADOR', 142, y + 5.5);
    doc.text('CH', 198, y + 5.5);
    doc.text('DISCENTES', 212, y + 5.5);
    doc.text('STATUS', 242, y + 5.5);
    y += 9;
  };

  drawTableHeader();

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  projetos.forEach((p, index) => {
    if (y > pageHeight - 16) {
      doc.addPage();
      y = 15;
      drawTableHeader();
    }

    // Linhas alternadas
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 1, pageWidth - 28, 7, 'F');
    }

    doc.setTextColor(30, 41, 59);
    const nomeProj = doc.splitTextToSize(p.nome || '—', 66)[0];
    const cat = p.areaTematica || '—';
    const campus = p.campus || '—';
    const orientador = doc.splitTextToSize(p.professorResponsavel || '—', 52)[0];
    const ch = `${p.cargaHoraria || 0}h`;
    const discentes = `${(p.alunosParticipantes || []).length} aluno(s)`;
    const status = formatStatusLabel(p.status);

    doc.text(nomeProj, 16, y + 3.5);
    doc.text(cat, 85, y + 3.5);
    doc.text(campus, 115, y + 3.5);
    doc.text(orientador, 142, y + 3.5);
    doc.text(ch, 198, y + 3.5);
    doc.text(discentes, 212, y + 3.5);
    doc.text(status, 242, y + 3.5);

    y += 7;
  });

  const defaultFilename = `relatorio_projetos_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename || defaultFilename);
}
