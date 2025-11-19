-- Enable realtime for chat_channels table so all server members see new channels instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_channels;