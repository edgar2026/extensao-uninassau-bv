/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';

export const usuarioSchema = z.object({
  nome: z.string().min(1, 'Nome completo é obrigatório'),
  email: z.string().min(1, 'E-mail é obrigatório').email('E-mail inválido'),
  role: z.enum(['admin', 'professor', 'aluno']),
  unidade: z.string().min(1, 'Unidade é obrigatória')
});

export type UsuarioInputs = z.infer<typeof usuarioSchema>;
