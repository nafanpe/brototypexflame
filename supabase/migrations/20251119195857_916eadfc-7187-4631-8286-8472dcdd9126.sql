-- Drop restrictive policies on complaint_comments if they exist
DROP POLICY IF EXISTS "Admin can view all comments" ON public.complaint_comments;
DROP POLICY IF EXISTS "Admin can insert comments" ON public.complaint_comments;

-- Allow all authenticated users to view comments
CREATE POLICY "Users can view all comments"
ON public.complaint_comments
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to post comments with their own user_id
CREATE POLICY "Users can post comments"
ON public.complaint_comments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own comments
CREATE POLICY "Users can update their own comments"
ON public.complaint_comments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own comments, or admins to delete any
CREATE POLICY "Users can delete their own comments or admins can delete any"
ON public.complaint_comments
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin')
);