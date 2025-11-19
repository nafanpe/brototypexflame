-- Drop the old policy that only allowed members to view channels
DROP POLICY IF EXISTS "Members can view channels in their servers" ON public.chat_channels;

-- Create new policy that allows viewing channels in public servers OR servers where user is a member
CREATE POLICY "Users can view channels in accessible servers"
ON public.chat_channels
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_servers
    WHERE chat_servers.id = chat_channels.server_id
    AND (
      chat_servers.is_public = true
      OR EXISTS (
        SELECT 1 FROM public.server_members
        WHERE server_members.server_id = chat_servers.id
        AND server_members.user_id = auth.uid()
      )
    )
  )
);