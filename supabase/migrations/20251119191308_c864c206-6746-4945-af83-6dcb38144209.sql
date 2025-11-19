-- Fix infinite recursion in server_members RLS policy
-- Drop the problematic policy
DROP POLICY IF EXISTS "Members can view other members" ON public.server_members;

-- Create a simpler policy that avoids recursion
-- Users can see memberships for servers they own or are members of
CREATE POLICY "Users can view server memberships"
  ON public.server_members
  FOR SELECT
  USING (
    user_id = auth.uid() 
    OR 
    EXISTS (
      SELECT 1 FROM public.chat_servers
      WHERE chat_servers.id = server_members.server_id
      AND chat_servers.owner_id = auth.uid()
    )
  );