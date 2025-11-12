-- Fix the comment insertion policy to allow commenting on any accessible complaint
DROP POLICY IF EXISTS "Users can create comments on their complaints" ON public.complaint_comments;

-- Allow users to comment on any complaint they can view
CREATE POLICY "Users can create comments on accessible complaints"
ON public.complaint_comments
FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM complaints
    WHERE complaints.id = complaint_comments.complaint_id
    AND (
      -- User can comment if they can view the complaint
      complaints.user_id = auth.uid() OR  -- Own complaints
      NOT complaints.is_anonymous OR      -- Non-anonymous complaints
      has_role(auth.uid(), 'admin'::app_role)  -- Admins can comment on anything
    )
  )
);