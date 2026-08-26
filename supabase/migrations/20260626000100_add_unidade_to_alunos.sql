ALTER TABLE public.alunos_vinculados ADD COLUMN IF NOT EXISTS unidade TEXT;
ALTER TABLE public.alunos_vinculados ALTER COLUMN "cpfLast6" DROP NOT NULL;
