-- Create Tables

CREATE TABLE IF NOT EXISTS public.unidades (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  codigo TEXT NOT NULL,
  "projetosCount" INTEGER DEFAULT 0,
  responsavel TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.cursos (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  sigla TEXT NOT NULL,
  unidade TEXT NOT NULL,
  "alunosCount" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.projetos (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT NOT NULL,
  objetivos TEXT NOT NULL,
  justificativa TEXT,
  "professorResponsavel" TEXT NOT NULL,
  "titulacaoProfessor" TEXT NOT NULL,
  unidade TEXT NOT NULL,
  curso TEXT NOT NULL,
  "areaTematica" TEXT NOT NULL,
  "dataInicio" TEXT NOT NULL,
  "dataTermino" TEXT NOT NULL,
  "cargaHoraria" INTEGER NOT NULL,
  vagas INTEGER NOT NULL,
  status TEXT NOT NULL,
  "participantesCount" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.alunos_vinculados (
  matricula TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  curso TEXT NOT NULL,
  "cpfLast6" TEXT NOT NULL,
  projetos_ids TEXT[] DEFAULT '{}'::TEXT[]
);

CREATE TABLE IF NOT EXISTS public.relatorios (
  id TEXT PRIMARY KEY,
  "projetoId" TEXT NOT NULL,
  "projetoNome" TEXT NOT NULL,
  "alunoId" TEXT NOT NULL,
  "alunoNome" TEXT NOT NULL,
  "alunoMatricula" TEXT NOT NULL,
  "arquivoNome" TEXT NOT NULL,
  "arquivoTamanho" TEXT,
  "dataEnvio" TEXT NOT NULL,
  status TEXT NOT NULL,
  observacoes TEXT,
  "feedbackProfessor" TEXT,
  "horasHomologadas" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.certificados (
  id TEXT PRIMARY KEY,
  "codigoAutenticacao" TEXT NOT NULL,
  "codigoCertificado" TEXT NOT NULL,
  "alunoNome" TEXT NOT NULL,
  "alunoMatricula" TEXT NOT NULL,
  "alunoCpfLast6" TEXT NOT NULL,
  "projetoNome" TEXT NOT NULL,
  "professorResponsavel" TEXT NOT NULL,
  "titulacaoProfessor" TEXT NOT NULL,
  "cargaHoraria" INTEGER NOT NULL,
  "dataInicio" TEXT NOT NULL,
  "dataTermino" TEXT NOT NULL,
  "dataEmissao" TEXT NOT NULL,
  unidade TEXT NOT NULL,
  situacao TEXT NOT NULL,
  uuid TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.assinaturas (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  cargo TEXT NOT NULL,
  "arquivoNome" TEXT NOT NULL,
  "dataCadastro" TEXT NOT NULL,
  ativo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.auditoria (
  id TEXT PRIMARY KEY,
  "usuarioNome" TEXT NOT NULL,
  "usuarioRole" TEXT NOT NULL,
  acao TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  ip TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.usuarios (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  matricula TEXT,
  cpf TEXT,
  unidade TEXT,
  curso TEXT,
  "avatarUrl" TEXT
);

-- SEED DATA

INSERT INTO public.unidades (id, nome, codigo, "projetosCount", responsavel) VALUES
('1', 'Centro Universitário - Campus Centro', 'CTR', 18, 'Prof. Dr. Ricardo Albuquerque'),
('2', 'Campus Zona Norte', 'NTE', 12, 'Profª. Dra. Ana Paula Santos'),
('3', 'Campus Zona Leste', 'LST', 10, 'Prof. Dr. Carlos Mendes'),
('4', 'Campus Zona Oeste', 'OES', 7, 'Profª. Msc. Mariana Silva')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.cursos (id, nome, sigla, unidade, "alunosCount") VALUES
('1', 'Engenharia de Software', 'ES', 'Campus Centro', 84),
('2', 'Ciência da Computação', 'CC', 'Campus Zona Norte', 62),
('3', 'Sistemas de Informação', 'SI', 'Campus Zona Leste', 48),
('4', 'Análise e Desenvolvimento de Sistemas', 'ADS', 'Campus Zona Oeste', 55)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.projetos (id, nome, descricao, objetivos, justificativa, "professorResponsavel", "titulacaoProfessor", unidade, curso, "areaTematica", "dataInicio", "dataTermino", "cargaHoraria", vagas, status, "participantesCount") VALUES
('proj-1', 'Inclusão Digital para a Terceira Idade', 'Capacitação em ferramentas digitais e internet para idosos da comunidade do entorno da instituição, facilitando o acesso a serviços online e redes sociais.', 'Capacitar pelo menos 100 idosos ao longo do semestre nas ferramentas básicas de informática e navegação móvel.', 'Redução do isolamento social e facilitação do acesso a serviços essenciais como bancos e canais governamentais.', 'Profª. Dra. Ana Paula Santos', 'Doutora em Educação Tecnológica', 'Campus Centro', 'Engenharia de Software', 'Extensão', '2026-02-01', '2026-07-30', 40, 20, 'Ativo', 12),
('proj-2', 'Oficinas de Robótica Educacional em Escolas Públicas', 'Introdução ao pensamento computacional e robótica básica utilizando kits open-source para alunos do ensino fundamental II da rede pública municipal.', 'Despertar o interesse por carreiras STEM (Ciência, Tecnologia, Engenharia e Matemática) em escolas vulneráveis.', 'Oportunizar contato com tecnologia de ponta para alunos que não possuem essa infraestrutura na grade curricular.', 'Prof. Dr. Carlos Mendes', 'Doutor em Robótica e Automação', 'Campus Zona Norte', 'Ciência da Computação', 'Pesquisa', '2026-03-10', '2026-11-20', 60, 15, 'Pendente', 8),
('proj-3', 'Pesquisa Aplicada em Modelos de Linguagem para Educação (PIC)', 'Programa de Iniciação Científica focado na adaptação de modelos de linguagem (LLMs) para apoiar professores na elaboração de planos de aula personalizados.', 'Desenvolver um protótipo local integrado e produzir um artigo científico de qualidade internacional.', 'Apoiar o corpo docente na redução do tempo de planejamento, melhorando a diversidade das atividades didáticas.', 'Profª. Msc. Mariana Silva', 'Mestre em Inteligência Artificial', 'Campus Zona Leste', 'Sistemas de Informação', 'PIC', '2026-01-15', '2026-12-15', 120, 6, 'Concluído', 6),
('proj-4', 'Horta Comunitária Urbana e Sustentabilidade', 'Implementação de hortas verticais e cultivo orgânico em unidades de acolhimento social, ensinando conceitos de compostagem, biologia de solos e sustentabilidade.', 'Criar 4 hortas urbanas produtivas e capacitar 40 famílias em técnicas básicas de permacultura urbana.', 'Fomentar a segurança alimentar e integrar a comunidade acadêmica com ações diretas de impacto ambientais e de saúde.', 'Prof. João Pedro Oliveira', 'Especialista em Gestão Ambiental', 'Campus Zona Oeste', 'Análise e Desenvolvimento de Sistemas', 'Extensão', '2026-03-15', '2026-07-15', 30, 25, 'Ativo', 15)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.alunos_vinculados (matricula, nome, curso, "cpfLast6", projetos_ids) VALUES
('2024001', 'João Pedro da Silva', 'Engenharia de Software', '456789', ARRAY['proj-1', 'proj-2']),
('2024002', 'Maria Clara Oliveira', 'Ciência da Computação', '123456', ARRAY['proj-2']),
('2024003', 'Pedro Henrique Santos', 'Sistemas de Informação', '987654', ARRAY['proj-3', 'proj-1']),
('2024004', 'Ana Júlia Costa', 'Análise e Des. Sistemas', '321654', ARRAY['proj-4']),
('2024005', 'Lucas de Souza Lima', 'Engenharia de Software', '159753', ARRAY['proj-1'])
ON CONFLICT (matricula) DO NOTHING;

INSERT INTO public.relatorios (id, "projetoId", "projetoNome", "alunoId", "alunoNome", "alunoMatricula", "arquivoNome", "arquivoTamanho", "dataEnvio", status, observacoes, "feedbackProfessor", "horasHomologadas") VALUES
('rel-1', 'proj-1', 'Inclusão Digital para a Terceira Idade', '2024001', 'João Pedro da Silva', '2024001', 'relatorio_primeiro_bimestre_joao.pdf', '1.4 MB', '2026-05-10', 'Aprovado', 'Atividades executadas com extrema dedicação. O aluno realizou 4 oficinas de digitação e acesso a apps bancários.', 'Excelente trabalho, João! Relatório bem detalhado e fotos bem documentadas.', 20),
('rel-2', 'proj-2', 'Oficinas de Robótica Educacional em Escolas Públicas', '2024002', 'Maria Clara Oliveira', '2024002', 'relatorio_atividades_mensal_maria.pdf', '2.1 MB', '2026-06-15', 'Em análise', 'Entrega do relatório referente ao planejamento das aulas de Arduino.', '', 0),
('rel-3', 'proj-1', 'Inclusão Digital para a Terceira Idade', '2024003', 'Pedro Henrique Santos', '2024003', 'atividades_extensao_pedro.pdf', '950 KB', '2026-06-20', 'Correção solicitada', 'Envio inicial das horas de monitoria.', 'Por favor, anexe a folha de presença assinada pela supervisora do Campus.', 0),
('rel-4', 'proj-4', 'Horta Comunitária Urbana e Sustentabilidade', '2024004', 'Ana Júlia Costa', '2024004', 'relatorio_parcial_hortas_sustentaveis.pdf', '3.5 MB', '2026-06-22', 'Aguardando envio', '', '', 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.certificados (id, "codigoAutenticacao", "codigoCertificado", "alunoNome", "alunoMatricula", "alunoCpfLast6", "projetoNome", "professorResponsavel", "titulacaoProfessor", "cargaHoraria", "dataInicio", "dataTermino", "dataEmissao", unidade, situacao, uuid) VALUES
('cert-1', '8F7A9B3C', 'CERT-2026-001', 'João Pedro da Silva', '2024001', '456789', 'Inclusão Digital para a Terceira Idade', 'Profª. Dra. Ana Paula Santos', 'Doutora em Educação Tecnológica', 40, '2026-02-01', '2026-07-30', '2026-06-10', 'Campus Centro', 'Válido', '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'),
('cert-2', '2E4F6D8C', 'CERT-2026-002', 'Pedro Henrique Santos', '2024003', '987654', 'Pesquisa Aplicada em Modelos de Linguagem para Educação (PIC)', 'Profª. Msc. Mariana Silva', 'Mestre em Inteligência Artificial', 120, '2026-01-15', '2026-06-15', '2026-06-18', 'Campus Zona Leste', 'Válido', '71a1796d-3172-4cfc-a496-e2a445d4a9cc')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.assinaturas (id, nome, cargo, "arquivoNome", "dataCadastro", ativo) VALUES
('1', 'Prof. Dr. Ricardo Albuquerque', 'Diretor Acadêmico Geral', 'assinatura_diretor.png', '2026-01-10', TRUE),
('2', 'Profª. Dra. Ana Paula Santos', 'Coordenadora Geral de Extensão', 'assinatura_coord_ext.png', '2026-02-15', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.auditoria (id, "usuarioNome", "usuarioRole", acao, timestamp, ip) VALUES
('1', 'Suporte de TI', 'admin', 'Aprovou novos modelos de certificados digitais', '2026-06-25 10:15:24', '192.168.1.12'),
('2', 'Profª. Dra. Ana Paula Santos', 'professor', 'Homologou o relatório final do aluno João Pedro da Silva', '2026-06-24 14:32:10', '10.0.0.45'),
('3', 'Coordenação de Curso', 'coordenacao', 'Vinculou 5 novos alunos ao projeto Inclusão Digital via carga em massa', '2026-06-23 09:12:45', '172.16.5.110')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.usuarios (id, nome, email, role, matricula, cpf, unidade, curso, "avatarUrl") VALUES
('1', 'Profª. Dra. Ana Paula Santos', 'ana.santos@instituicao.br', 'professor', NULL, NULL, 'Campus Centro', NULL, NULL),
('2', 'Prof. Dr. Carlos Mendes', 'carlos.mendes@instituicao.br', 'coordenacao', NULL, NULL, 'Campus Zona Norte', NULL, NULL),
('3', 'Diretor Ricardo Albuquerque', 'admin@instituicao.br', 'admin', NULL, NULL, 'Campus Centro', NULL, NULL),
('4', 'João Pedro da Silva', 'joao.silva@instituicao.br', 'aluno', '2024001', '***.***.***-456789', 'Campus Centro', 'Engenharia de Software', NULL)
ON CONFLICT (id) DO NOTHING;
