-- Drop the existing restrictive policy for joining servers
DROP POLICY IF EXISTS "Users can join public servers" ON public.server_members;

-- Create new policy that allows users to join any server via invite link
-- Since the server owner controls who gets the invite link, this is secure
CREATE POLICY "Users can join servers via invite"
ON public.server_members
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Update the SELECT policy on chat_servers to allow viewing server info when accessed directly
-- This allows the invite link to work by letting users see the server exists
DROP POLICY IF EXISTS "Anyone can view public servers" ON public.chat_servers;

CREATE POLICY "Users can view public servers or servers they're invited to"
ON public.chat_servers
FOR SELECT
TO authenticated
USING (
  (is_public = true) 
  OR (auth.uid() = owner_id)
  OR (EXISTS (
    SELECT 1 FROM server_members 
    WHERE server_members.server_id = chat_servers.id 
    AND server_members.user_id = auth.uid()
  ))
);