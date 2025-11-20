-- Create storage bucket for server icons
INSERT INTO storage.buckets (id, name, public)
VALUES ('server-icons', 'server-icons', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for server-icons bucket
CREATE POLICY "Anyone can view server icons"
ON storage.objects FOR SELECT
USING (bucket_id = 'server-icons');

CREATE POLICY "Server owners can upload icons"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'server-icons' 
  AND auth.uid() IN (
    SELECT owner_id FROM chat_servers
  )
);

CREATE POLICY "Server owners can update their server icons"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'server-icons'
  AND auth.uid() IN (
    SELECT owner_id FROM chat_servers
  )
);

CREATE POLICY "Server owners can delete their server icons"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'server-icons'
  AND auth.uid() IN (
    SELECT owner_id FROM chat_servers
  )
);