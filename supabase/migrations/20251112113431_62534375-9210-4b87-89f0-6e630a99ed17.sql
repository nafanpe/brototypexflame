-- Make complaint-images bucket public so images can be accessed
UPDATE storage.buckets 
SET public = true 
WHERE id = 'complaint-images';

-- Ensure proper RLS policy for public image access
DROP POLICY IF EXISTS "Public Access to complaint images" ON storage.objects;

CREATE POLICY "Public Access to complaint images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'complaint-images');