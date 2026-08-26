-- Migration: Create 'assinaturas' storage bucket and set up RLS policies
-- This registers the bucket in the storage system and configures permissions

-- 1. Insert the bucket into the storage system
INSERT INTO storage.buckets (id, name, public) 
VALUES ('assinaturas', 'assinaturas', true) 
ON CONFLICT (id) DO NOTHING;

-- 2. Create policy to allow anyone to read files from this bucket (so certificates render correctly)
DROP POLICY IF EXISTS "Public Read Assinaturas" ON storage.objects;
CREATE POLICY "Public Read Assinaturas" ON storage.objects 
  FOR SELECT USING (bucket_id = 'assinaturas');

-- 3. Create policy to allow file uploads to this bucket
DROP POLICY IF EXISTS "Public Upload Assinaturas" ON storage.objects;
CREATE POLICY "Public Upload Assinaturas" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'assinaturas');
