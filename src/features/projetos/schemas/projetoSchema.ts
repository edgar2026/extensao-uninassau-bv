/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';

export const projetoSchema = z.object({
  nome: z.string().min(1, 'Título do projeto é obrigatório'),
  areaTematica: z.enum(['Extensão', 'IC']),
  campus: z.enum(['GRAÇAS', 'CAXANGÁ', 'BOA_VIAGEM'], 'Campus é obrigatório'),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  dataInicio: z.string().min(1, 'Data de início é obrigatória'),
  dataTermino: z.string().min(1, 'Data de término é obrigatória'),
  cargaHoraria: z.preprocess((val) => Number(val), z.number().min(1, 'Carga horária deve ser maior que 0')),
});

export type ProjetoInputs = z.infer<typeof projetoSchema>;
