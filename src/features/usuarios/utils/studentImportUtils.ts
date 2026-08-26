/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { StudentImportRow } from '../../../types';

const IMPORT_COLUMNS = ['matricula', 'nome_completo', 'curso', 'email', 'campus'];

const SAMPLE_DATA = [
  ['2024001001', 'João Pedro da Silva', 'Engenharia de Software', 'joao.silva@estudante.uninassau.br', 'GRAÇAS'],
  ['2024001002', 'Ana Beatriz Santos', 'Ciência da Computação', 'ana.santos@estudante.uninassau.br', 'CAXANGÁ'],
  ['2024001003', 'Carlos Eduardo Lima', 'Sistemas de Informação', 'carlos.lima@estudante.uninassau.br', 'BOA_VIAGEM'],
  ['2024001004', 'Maria Fernanda Oliveira', 'Engenharia de Software', 'maria.oliveira@estudante.uninassau.br', 'GRAÇAS'],
  ['2024001005', 'Pedro Henrique Souza', 'Ciência da Computação', 'pedro.souza@estudante.uninassau.br', 'CAXANGÁ'],
];

const INSTRUCTIONS = [
  ['INSTRUÇÕES DE PREENCHIMENTO DA PLANILHA DE IMPORTAÇÃO DE ALUNOS'],
  [''],
  ['1. COLUNAS OBRIGATÓRIAS (exatamente estas 5 colunas)'],
  ['matricula', 'Matrícula do aluno (única, obrigatória)'],
  ['nome_completo', 'Nome completo do aluno (texto, obrigatório)'],
  ['curso', 'Curso do aluno (obrigatório)'],
  ['email', 'E-mail institucional do aluno (obrigatório)'],
  ['campus', 'GRAÇAS, CAXANGÁ ou BOA_VIAGEM (obrigatório)'],
  [''],
  ['2. REGRAS DE VALIDAÇÃO'],
  ['A matrícula é obrigatória e deve ser única no sistema'],
  ['O nome completo é obrigatório'],
  ['O curso é obrigatório'],
  ['O e-mail deve ser válido e único'],
  ['O campus deve ser: GRAÇAS, CAXANGÁ ou BOA_VIAGEM'],
  ['Matrículas duplicadas no arquivo serão rejeitadas'],
  ['E-mails duplicados no arquivo serão rejeitados'],
  ['Alunos já cadastrados serão reutilizados (não duplicados)'],
  [''],
  ['3. VALORES VÁLIDOS PARA CAMPUS'],
  ['GRAÇAS', 'UNINASSAU Graças'],
  ['CAXANGÁ', 'UNINASSAU Caxangá'],
  ['BOA_VIAGEM', 'UNINASSAU Boa Viagem'],
  ['(GRACAS, CAXANGA, BOAVIAGEM também são aceitos - acentos são normalizados)'],
  [''],
  ['4. OBSERVAÇÕES IMPORTANTES'],
  ['Login é feito somente por e-mail e senha'],
  ['A matrícula serve para identificação acadêmica, não para login'],
  ['Todos os registros serão criados como Aluno'],
  ['Alunos já cadastrados não serão duplicados'],
  ['Alunos com e-mail de professor/admin serão bloqueados'],
  [''],
  ['5. AVISO'],
  ['NÃO altere os cabeçalhos da primeira linha'],
  ['NÃO adicione colunas extras'],
  ['Uma linha por aluno'],
  ['Máximo de 500 linhas por importação'],
  ['Nenhum dado será gravado antes da confirmação'],
];

export function downloadStudentImportTemplate(): void {
  const wb = XLSX.utils.book_new();

  const wsImport = XLSX.utils.aoa_to_sheet([IMPORT_COLUMNS, ...SAMPLE_DATA]);
  wsImport['!cols'] = [
    { wch: 18 },
    { wch: 35 },
    { wch: 30 },
    { wch: 40 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsImport, 'ALUNOS');

  const wsInstr = XLSX.utils.aoa_to_sheet(INSTRUCTIONS);
  wsInstr['!cols'] = [
    { wch: 45 },
    { wch: 55 },
  ];
  XLSX.utils.book_append_sheet(wb, wsInstr, 'INSTRUCOES');

  XLSX.writeFile(wb, 'modelo_importacao_alunos.xlsx');
}

export function parseStudentImportFile(file: File): Promise<{ matricula: string; nome_completo: string; curso: string; email: string; campus: string }[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (jsonData.length < 2) {
          reject(new Error('A planilha está vazia ou não contém dados.'));
          return;
        }

        const headers = (jsonData[0] as string[]).map(h => String(h).toLowerCase().trim());
        const requiredCols = ['matricula', 'nome_completo', 'curso', 'email', 'campus'];
        const missingCols = requiredCols.filter(col => !headers.includes(col));

        if (missingCols.length > 0) {
          reject(new Error(`Colunas obrigatórias não encontradas: ${missingCols.join(', ')}`));
          return;
        }

        const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== null && cell !== ''));
        const result = rows.map(row => {
          const obj: any = {};
          headers.forEach((h, i) => { obj[h] = row[i]; });
          return {
            matricula: String(obj.matricula || '').trim(),
            nome_completo: String(obj.nome_completo || '').trim(),
            curso: String(obj.curso || '').trim(),
            email: String(obj.email || '').trim().toLowerCase(),
            campus: String(obj.campus || '').trim(),
          };
        });

        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'));
    reader.readAsArrayBuffer(file);
  });
}

export function exportStudentImportResult(students: StudentImportRow[], filename?: string): void {
  const rows: (string | number)[][] = [
    ['matricula', 'nome_completo', 'curso', 'email', 'campus', 'resultado', 'motivo', 'codigo_primeiro_acesso'],
  ];

  for (const s of students) {
    rows.push([
      s.matricula,
      s.nome_completo,
      s.curso,
      s.email,
      s.campus,
      s.resultado,
      s.motivo || '',
      s.codigo_primeiro_acesso || '',
    ]);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 18 },
    { wch: 35 },
    { wch: 30 },
    { wch: 40 },
    { wch: 14 },
    { wch: 14 },
    { wch: 40 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Resultado');

  const defaultFilename = `resultado_importacao_alunos_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename || defaultFilename);
}

export interface StudentExportRow {
  matricula: string;
  nome_completo: string;
  curso: string;
  email: string;
  campus: string;
  situacao: string;
  primeiro_acesso: string;
  data_cadastro: string;
}

export function exportStudentsXlsx(students: StudentExportRow[], filename?: string): void {
  const rows: (string | number)[][] = [
    ['matricula', 'nome_completo', 'curso', 'email', 'campus', 'situacao', 'primeiro_acesso', 'data_cadastro'],
  ];

  for (const s of students) {
    rows.push([
      s.matricula,
      s.nome_completo,
      s.curso,
      s.email,
      s.campus,
      s.situacao,
      s.primeiro_acesso,
      s.data_cadastro,
    ]);
  }

  if (students.length === 0) {
    rows.push(['Nenhum aluno cadastrado no sistema.', '', '', '', '', '', '', '']);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 18 },
    { wch: 35 },
    { wch: 30 },
    { wch: 40 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Alunos');

  const defaultFilename = `alunos_uninassau_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename || defaultFilename);
}

export interface ImportHistoryRow {
  id: number;
  data: string;
  acao: string;
  detalhes: string;
}

export function exportImportHistory(history: ImportHistoryRow[], filename?: string): void {
  const rows: (string | number)[][] = [
    ['data', 'acao', 'detalhes'],
  ];

  for (const h of history) {
    rows.push([
      h.data,
      h.acao,
      h.detalhes,
    ]);
  }

  if (history.length === 0) {
    rows.push(['Nenhum histórico de importação encontrado.', '', '']);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 22 },
    { wch: 25 },
    { wch: 60 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Histórico');

  const defaultFilename = `historico_importacoes_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename || defaultFilename);
}
