-- CHAT SERVERS
CREATE TABLE public.chat_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon_url TEXT,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- CHAT CHANNELS
CREATE TABLE public.chat_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES public.chat_servers(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- SERVER MEMBERS (Many-to-Many)
CREATE TABLE public.server_members (
  server_id UUID REFERENCES public.chat_servers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (server_id, user_id)
);

-- CHANNEL MESSAGES
CREATE TABLE public.channel_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.chat_channels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- DM CONVERSATIONS
CREATE TABLE public.dm_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user2_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_conversation UNIQUE(user1_id, user2_id),
  CONSTRAINT user_order CHECK (user1_id < user2_id)
);

-- DIRECT MESSAGES
CREATE TABLE public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.dm_conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ========== RLS POLICIES ==========

-- CHAT SERVERS
ALTER TABLE public.chat_servers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public servers"
  ON public.chat_servers FOR SELECT
  USING (is_public = true OR auth.uid() = owner_id);

CREATE POLICY "Authenticated users can create servers"
  ON public.chat_servers FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Server owners can update their servers"
  ON public.chat_servers FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Server owners can delete their servers"
  ON public.chat_servers FOR DELETE
  USING (auth.uid() = owner_id);

-- CHAT CHANNELS
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view channels in their servers"
  ON public.chat_channels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.server_members
      WHERE server_members.server_id = chat_channels.server_id
      AND server_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Server owners can create channels"
  ON public.chat_channels FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_servers
      WHERE chat_servers.id = server_id
      AND chat_servers.owner_id = auth.uid()
    )
  );

CREATE POLICY "Server owners can update channels"
  ON public.chat_channels FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_servers
      WHERE chat_servers.id = server_id
      AND chat_servers.owner_id = auth.uid()
    )
  );

CREATE POLICY "Server owners can delete channels"
  ON public.chat_channels FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_servers
      WHERE chat_servers.id = server_id
      AND chat_servers.owner_id = auth.uid()
    )
  );

-- SERVER MEMBERS
ALTER TABLE public.server_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view other members"
  ON public.server_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.server_members sm
      WHERE sm.server_id = server_members.server_id
      AND sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join public servers"
  ON public.server_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.chat_servers
      WHERE id = server_id AND is_public = true
    )
  );

CREATE POLICY "Users can leave servers"
  ON public.server_members FOR DELETE
  USING (auth.uid() = user_id);

-- CHANNEL MESSAGES
ALTER TABLE public.channel_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view channel messages"
  ON public.channel_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_channels
      JOIN public.server_members ON server_members.server_id = chat_channels.server_id
      WHERE chat_channels.id = channel_messages.channel_id
      AND server_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can send channel messages"
  ON public.channel_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.chat_channels
      JOIN public.server_members ON server_members.server_id = chat_channels.server_id
      WHERE chat_channels.id = channel_id
      AND server_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own messages"
  ON public.channel_messages FOR DELETE
  USING (auth.uid() = user_id);

-- DM CONVERSATIONS
ALTER TABLE public.dm_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations"
  ON public.dm_conversations FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create conversations"
  ON public.dm_conversations FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- DIRECT MESSAGES
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view DM messages"
  ON public.direct_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.dm_conversations
      WHERE dm_conversations.id = conversation_id
      AND (dm_conversations.user1_id = auth.uid() OR dm_conversations.user2_id = auth.uid())
    )
  );

CREATE POLICY "Participants can send DM messages"
  ON public.direct_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.dm_conversations
      WHERE dm_conversations.id = conversation_id
      AND (dm_conversations.user1_id = auth.uid() OR dm_conversations.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete their own DMs"
  ON public.direct_messages FOR DELETE
  USING (auth.uid() = sender_id);

-- ========== FUNCTIONS & TRIGGERS ==========

-- Function to automatically add owner as first member when creating a server
CREATE OR REPLACE FUNCTION public.add_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.server_members (server_id, user_id)
  VALUES (NEW.id, NEW.owner_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER add_owner_as_member_trigger
  AFTER INSERT ON public.chat_servers
  FOR EACH ROW
  EXECUTE FUNCTION public.add_owner_as_member();

-- Function to create default #general channel when creating a server
CREATE OR REPLACE FUNCTION public.create_default_channel()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.chat_channels (server_id, name)
  VALUES (NEW.id, 'general');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER create_default_channel_trigger
  AFTER INSERT ON public.chat_servers
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_channel();

-- Function to update last_message_at on dm_conversations
CREATE OR REPLACE FUNCTION public.update_dm_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.dm_conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_dm_conversation_timestamp_trigger
  AFTER INSERT ON public.direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_dm_conversation_timestamp();

-- ========== INDEXES FOR PERFORMANCE ==========

CREATE INDEX idx_channel_messages_channel_id ON public.channel_messages(channel_id);
CREATE INDEX idx_channel_messages_created_at ON public.channel_messages(created_at DESC);
CREATE INDEX idx_direct_messages_conversation_id ON public.direct_messages(conversation_id);
CREATE INDEX idx_direct_messages_created_at ON public.direct_messages(created_at DESC);
CREATE INDEX idx_dm_conversations_users ON public.dm_conversations(user1_id, user2_id);
CREATE INDEX idx_server_members_user_id ON public.server_members(user_id);
CREATE INDEX idx_chat_channels_server_id ON public.chat_channels(server_id);