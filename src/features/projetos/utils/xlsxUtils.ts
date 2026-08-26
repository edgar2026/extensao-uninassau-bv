/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { Projeto, normalizeCampus } from '../../../types';

/**
 * Categorias válidas para projetos
 */
const CATEGORIAS_VALIDAS = ['Extensão', 'IC'];

/**
 * Colunas do modelo de importação
 */
const IMPORT_COLUMNS = [
  'nome_projeto',
  'categoria',
  'campus',
  'descricao',
  'carga_horaria',
  'data_inicio',
  'data_termino',
  'nome_professor',
  'email_professor',
  'nome_completo_aluno',
  'email_aluno',
];

/**
 * Colunas da exportação de dados existentes
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

/**
 * Dados fictícios para o modelo de importação
 */
const SAMPLE_DATA = [
  // Projeto 1 - 3 alunos
  ['Ação Comunitária de Saúde', 'Extensão', 'GRAÇAS', 'Projeto de atendimento comunitário com ações de prevenção e promoção da saúde', 60, '2026-03-01', '2026-06-30', 'Maria Silva', 'maria.silva@uninassau.br', 'João Pedro da Silva', 'joao@estudante.uninassau.br'],
  ['Ação Comunitária de Saúde', 'Extensão', 'GRAÇAS', 'Projeto de atendimento comunitário com ações de prevenção e promoção da saúde', 60, '2026-03-01', '2026-06-30', 'Maria Silva', 'maria.silva@uninassau.br', 'Ana Beatriz Santos', 'ana@estudante.uninassau.br'],
  ['Ação Comunitária de Saúde', 'Extensão', 'GRAÇAS', 'Projeto de atendimento comunitário com ações de prevenção e promoção da saúde', 60, '2026-03-01', '2026-06-30', 'Maria Silva', 'maria.silva@uninassau.br', 'Carlos Eduardo Lima', 'carlos@estudante.uninassau.br'],
  // Projeto 2 - 2 alunos
  ['Monitoria de Programação Python', 'IC', 'CAXANGÁ', 'Programa de monitoria para alunos de Ciência da Computação em linguagem Python', 40, '2026-04-01', '2026-07-31', 'José Santos', 'jose.santos@uninassau.br', 'Fernanda Oliveira', 'fernanda@estudante.uninassau.br'],
  ['Monitoria de Programação Python', 'IC', 'CAXANGÁ', 'Programa de monitoria para alunos de Ciência da Computação em linguagem Python', 40, '2026-04-01', '2026-07-31', 'José Santos', 'jose.santos@uninassau.br', 'Pedro Henrique Souza', 'pedro@estudante.uninassau.br'],
  // Projeto 3 - 1 aluno
  ['Oficina de Arte Urbana', 'Extensão', 'BOA_VIAGEM', 'Oficina de arte urbana voltada para jovens da comunidade', 30, '2026-05-01', '2026-08-15', 'Ana Costa', 'ana.costa@uninassau.br', 'Lucas Ferreira', 'lucas@estudante.uninassau.br'],
];

/**
 * Instruções para preenchimento da planilha
 */
const INSTRUCTIONS = [
  ['INSTRUÇÕES DE PREENCHIMENTO DA PLANILHA DE IMPORTAÇÃO'],
  [''],
  ['1. COLUNAS OBRIGATÓRIAS'],
  ['nome_projeto', 'Nome completo do projeto (texto)'],
  ['categoria', 'Extensão ou IC (case-insensitive, será normalizado)'],
  ['campus', 'GRAÇAS, CAXANGÁ ou BOA_VIAGEM (acentos serão normalizados)'],
  ['descricao', 'Descrição detalhada do projeto'],
  ['carga_horaria', 'Número inteiro maior que 0'],
  ['data_inicio', 'Data de início (formato: AAAA-MM-DD ou DD/MM/AAAA)'],
  ['data_termino', 'Data de término (formato: AAAA-MM-DD ou DD/MM/AAAA)'],
  ['nome_professor', 'Nome completo do professor responsável'],
  ['email_professor', 'Email institucional do professor'],
  ['nome_completo_aluno', 'Nome completo do aluno participante'],
  ['email_aluno', 'Email do aluno participante'],
  [''],
  ['2. REGRAS DE AGRUPAMENTO'],
  ['Projetos são agrupados por: nome_projeto + email_professor'],
  ['Linhas com mesmo nome_projeto e email_professor = MESMO PROJETO'],
  ['Cada linha deve ter um aluno diferente'],
  [''],
  ['3. REGRAS DE VALIDAÇÃO'],
  ['O professor deve existir no sistema'],
  ['O email do professor deve ser válido'],
  ['O email do aluno deve ser válido'],
  ['A carga horária deve ser um número maior que 0'],
  ['A data de término deve ser igual ou posterior à data de início'],
  ['O campus deve ser: GRAÇAS, CAXANGÁ ou BOA_VIAGEM'],
  [''],
  ['4. EXEMPLOS DE CATEGORIAS VÁLIDAS'],
  ['Extensão', 'Extensão Universitária'],
  ['IC', 'Iniciação Científica'],
  [''],
  ['5. VALORES VÁLIDOS PARA CAMPUS'],
  ['GRAÇAS', 'UNINASSAU Graças'],
  ['CAXANGÁ', 'UNINASSAU Caxangá'],
  ['BOA_VIAGEM', 'UNINASSAU Boa Viagem'],
  ['(GRACAS, CAXANGA, BOAVIAGEM também são aceitos - acentos são normalizados)'],
  [''],
  ['6. OBSERVAÇÕES IMPORTANTES'],
  ['O código interno do projeto será gerado automaticamente pelo sistema'],
  ['NÃO inclua: código_projeto, matrícula, CPF, senha'],
  ['O professor precisa estar cadastrado no sistema'],
  ['O aluno será criado automaticamente se não existir'],
  ['Projetos serão criados como rascunho (precisam aprovação posterior)'],
  [''],
  ['7. FORMATO DE DATAS'],
  ['Aceitos: AAAA-MM-DD (2026-03-01) ou DD/MM/AAAA (01/03/2026)'],
  [''],
  ['8. LIMITE'],
  ['Máximo de 500 linhas por importação (admin)'],
  ['Máximo de 200 linhas por importação (professor)'],
];

/**
 * Baixa o modelo XLSX de importação de projetos
 */
export function downloadImportTemplate(): void {
  const wb = XLSX.utils.book_new();

  // Aba IMPORTACAO com dados de exemplo
  const wsImport = XLSX.utils.aoa_to_sheet([IMPORT_COLUMNS, ...SAMPLE_DATA]);
  // Definir larguras das colunas
  wsImport['!cols'] = [
    { wch: 35 }, // nome_projeto
    { wch: 12 }, // categoria
    { wch: 14 }, // campus
    { wch: 50 }, // descricao
    { wch: 14 }, // carga_horaria
    { wch: 14 }, // data_inicio
    { wch: 14 }, // data_termino
    { wch: 25 }, // nome_professor
    { wch: 35 }, // email_professor
    { wch: 30 }, // nome_completo_aluno
    { wch: 35 }, // email_aluno
  ];
  XLSX.utils.book_append_sheet(wb, wsImport, 'IMPORTACAO');

  // Aba INSTRUCOES
  const wsInstr = XLSX.utils.aoa_to_sheet(INSTRUCTIONS);
  wsInstr['!cols'] = [
    { wch: 40 },
    { wch: 50 },
  ];
  XLSX.utils.book_append_sheet(wb, wsInstr, 'INSTRUCOES');

  XLSX.writeFile(wb, 'modelo_importacao_projetos.xlsx');
}

/**
 * Exporta projetos existentes para XLSX
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
      // Projeto sem participantes - exporta uma linha vazia para o aluno
      rows.push([
        proj.nome || '',
        proj.areaTematica || '',
        proj.campus || '',
        proj.descricao || '',
        proj.cargaHoraria || 0,
        proj.dataInicio || '',
        proj.dataTermino || '',
        proj.status || '',
        proj.professorResponsavel || '',
        proj.professorEmail || '',
        '',
        '',
        proj.dataCriacao || '',
        '',
        '',
      ]);
    } else {
      // Uma linha por participante
      for (const aluno of participants) {
        rows.push([
          proj.nome || '',
          proj.areaTematica || '',
          proj.campus || '',
          proj.descricao || '',
          proj.cargaHoraria || 0,
          proj.dataInicio || '',
          proj.dataTermino || '',
          proj.status || '',
          proj.professorResponsavel || '',
          proj.professorEmail || '',
          aluno.nome || '',
          aluno.email || '',
          proj.dataCriacao || '',
          '',
          '',
        ]);
      }
    }
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 35 }, // nome_projeto
    { wch: 12 }, // categoria
    { wch: 14 }, // campus
    { wch: 50 }, // descricao
    { wch: 14 }, // carga_horaria
    { wch: 14 }, // data_inicio
    { wch: 14 }, // data_termino
    { wch: 18 }, // status
    { wch: 25 }, // nome_professor
    { wch: 35 }, // email_professor
    { wch: 30 }, // nome_completo_aluno
    { wch: 35 }, // email_aluno
    { wch: 20 }, // data_criacao
    { wch: 20 }, // data_envio
    { wch: 20 }, // data_aprovacao
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Projetos e Participantes');

  const defaultFilename = `exportacao_projetos_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename || defaultFilename);
}
