-- Allow admins to delete any complaint
CREATE POLICY "Admins can delete any complaint"
ON public.complaints
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));