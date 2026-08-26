-- Add email and phone columns to public.alunos_vinculados
ALTER TABLE public.alunos_vinculados ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.alunos_vinculados ADD COLUMN IF NOT EXISTS telefone1 TEXT;
ALTER TABLE public.alunos_vinculados ADD COLUMN IF NOT EXISTS telefone2 TEXT;
