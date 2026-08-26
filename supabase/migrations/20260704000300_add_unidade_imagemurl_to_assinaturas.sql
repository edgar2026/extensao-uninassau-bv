-- Migration: Add unidade and imagemUrl columns to assinaturas table
-- Also creates the Supabase Storage bucket configuration for stamp images

-- Add unidade column (which campus director belongs to)
ALTER TABLE public.assinaturas 
  ADD COLUMN IF NOT EXISTS unidade TEXT NOT NULL DEFAULT '';

-- Add imagemUrl column (public URL of the uploaded stamp image)
ALTER TABLE public.assinaturas 
  ADD COLUMN IF NOT EXISTS "imagemUrl" TEXT;

-- Update existing seed records with default unidades
UPDATE public.assinaturas SET unidade = 'Campus Centro'    WHERE id = '1';
UPDATE public.assinaturas SET unidade = 'Campus Zona Norte' WHERE id = '2';

-- Create storage bucket for signature/stamp images
-- NOTE: Run this in Supabase Dashboard > Storage > New bucket
-- Bucket name: assinaturas
-- Public: YES (so certificate URLs work)
-- The following is for reference only (not valid SQL, it's a Supabase API call):
-- supabase.storage.createBucket('assinaturas', { public: true })

-- Storage RLS policy (run in SQL Editor after creating the bucket):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('assinaturas', 'assinaturas', true) ON CONFLICT (id) DO NOTHING;
-- CREATE POLICY "Public read assinaturas" ON storage.objects FOR SELECT USING (bucket_id = 'assinaturas');
-- CREATE POLICY "Admin upload assinaturas" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'assinaturas');
