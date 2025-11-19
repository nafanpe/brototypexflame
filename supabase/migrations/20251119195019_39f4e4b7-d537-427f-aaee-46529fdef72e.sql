-- Drop old restrictive policies for channel messages
DROP POLICY IF EXISTS "Members can view channel messages" ON public.channel_messages;
DROP POLICY IF EXISTS "Members can send channel messages" ON public.channel_messages;

-- Allow users to view messages in public servers OR servers they're members of
CREATE POLICY "Users can view messages in accessible servers"
ON public.channel_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.chat_channels
    JOIN public.chat_servers ON chat_servers.id = chat_channels.server_id
    WHERE chat_channels.id = channel_messages.channel_id
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

-- Allow users to send messages in public servers OR servers they're members of
CREATE POLICY "Users can send messages in accessible servers"
ON public.channel_messages
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 
    FROM public.chat_channels
    JOIN public.chat_servers ON chat_servers.id = chat_channels.server_id
    WHERE chat_channels.id = channel_messages.channel_id
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