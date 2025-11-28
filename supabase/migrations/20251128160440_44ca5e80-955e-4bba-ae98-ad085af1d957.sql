-- Fix infinite recursion in RLS policies

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view public servers or servers they're invited to" ON public.chat_servers;
DROP POLICY IF EXISTS "Users can view server memberships" ON public.server_members;

-- Create simplified server_members SELECT policy (no recursion)
CREATE POLICY "Users can view their own memberships"
ON public.server_members
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create simplified chat_servers SELECT policy
CREATE POLICY "Users can view accessible servers"
ON public.chat_servers
FOR SELECT
TO authenticated
USING (
  is_public = true 
  OR auth.uid() = owner_id
  OR EXISTS (
    SELECT 1 FROM server_members 
    WHERE server_members.server_id = chat_servers.id 
    AND server_members.user_id = auth.uid()
  )
);