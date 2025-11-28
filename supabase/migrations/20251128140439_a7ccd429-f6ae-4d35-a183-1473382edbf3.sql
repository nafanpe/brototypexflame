-- Add RLS policy for admins to delete any channel message
CREATE POLICY "Admins can delete any message"
ON public.channel_messages
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add RLS policy for admins to delete any direct message
CREATE POLICY "Admins can delete any DM"
ON public.direct_messages
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));