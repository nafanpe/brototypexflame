-- Add policy to allow all authenticated users to view active profiles
CREATE POLICY "Authenticated users can view active profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_active = true);