-- Add new columns to community_posts for V1.1
ALTER TABLE public.community_posts 
ADD COLUMN IF NOT EXISTS image_url text,
ADD COLUMN IF NOT EXISTS like_count integer DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS comment_count integer DEFAULT 0 NOT NULL;

-- Remove old check constraint if exists and add new one
ALTER TABLE public.community_posts DROP CONSTRAINT IF EXISTS check_post_content;
ALTER TABLE public.community_posts 
ADD CONSTRAINT check_post_content 
CHECK (text_content IS NOT NULL OR image_url IS NOT NULL);

-- Create storage bucket for community post images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community-posts',
  'community-posts',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view post images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

-- Storage policies for community-posts bucket
CREATE POLICY "Authenticated users can upload post images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'community-posts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view community post images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'community-posts');

CREATE POLICY "Users can delete their own post images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'community-posts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Function to update post like count
CREATE OR REPLACE FUNCTION public.update_post_like_count()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.community_posts
    SET like_count = like_count + 1
    WHERE id = NEW.post_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.community_posts
    SET like_count = GREATEST(like_count - 1, 0)
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger for like count
DROP TRIGGER IF EXISTS on_like_change ON public.community_likes;
CREATE TRIGGER on_like_change
  AFTER INSERT OR DELETE ON public.community_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_post_like_count();

-- Function to update post comment count
CREATE OR REPLACE FUNCTION public.update_post_comment_count()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.community_posts
    SET comment_count = comment_count + 1
    WHERE id = NEW.post_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.community_posts
    SET comment_count = GREATEST(comment_count - 1, 0)
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;