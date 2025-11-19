import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Hash, User } from 'lucide-react';
import { ChatServer, ChatChannel, DMConversation } from '@/pages/Chat';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { VoiceChannel } from './VoiceChannel';

interface ChatAreaProps {
  selectedServer: ChatServer | null;
  selectedChannel: ChatChannel | null;
  selectedDM: DMConversation | null;
  isDMMode: boolean;
}

interface Message {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  user_id?: string;
  sender_id?: string;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export function ChatArea({ selectedServer, selectedChannel, selectedDM, isDMMode }: ChatAreaProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedChannel) {
      fetchChannelMessages();
      const cleanup = subscribeToChannelMessages();
      return cleanup;
    } else if (selectedDM) {
      fetchDMMessages();
      const cleanup = subscribeToDMMessages();
      return cleanup;
    }
  }, [selectedChannel, selectedDM]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  const fetchChannelMessages = async () => {
    if (!selectedChannel) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('channel_messages')
      .select(`
        *,
        profiles:user_id (full_name, avatar_url)
      `)
      .eq('channel_id', selectedChannel.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
    setLoading(false);
  };

  const fetchDMMessages = async () => {
    if (!selectedDM) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('direct_messages')
      .select(`
        *,
        profiles:sender_id (full_name, avatar_url)
      `)
      .eq('conversation_id', selectedDM.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
    setLoading(false);
  };

  const subscribeToChannelMessages = () => {
    if (!selectedChannel) return;

    const channel = supabase
      .channel(`channel-messages-${selectedChannel.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'channel_messages',
          filter: `channel_id=eq.${selectedChannel.id}`
        },
        async (payload) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', payload.new.user_id)
            .single();

          const newMessage: Message = {
            id: payload.new.id,
            content: payload.new.content,
            image_url: payload.new.image_url,
            created_at: payload.new.created_at,
            user_id: payload.new.user_id,
            profiles: profile || undefined
          };

          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToDMMessages = () => {
    if (!selectedDM) return;

    const channel = supabase
      .channel(`dm-messages-${selectedDM.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `conversation_id=eq.${selectedDM.id}`
        },
        async (payload) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', payload.new.sender_id)
            .single();

          const newMessage: Message = {
            id: payload.new.id,
            content: payload.new.content,
            image_url: payload.new.image_url,
            created_at: payload.new.created_at,
            sender_id: payload.new.sender_id,
            profiles: profile || undefined
          };

          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async (content: string, imageUrl: string | null) => {
    if (!user) return;

    try {
      if (selectedChannel) {
        const { error } = await supabase.from('channel_messages').insert({
          channel_id: selectedChannel.id,
          user_id: user.id,
          content,
          image_url: imageUrl
        });
        
        if (error) throw error;
      } else if (selectedDM) {
        const { error } = await supabase.from('direct_messages').insert({
          conversation_id: selectedDM.id,
          sender_id: user.id,
          content,
          image_url: imageUrl
        });
        
        if (error) throw error;
      }
    } catch (error: any) {
      console.error('Send message error:', error);
      throw error; // Re-throw so MessageInput can handle it
    }
  };

  if (!selectedChannel && !selectedDM) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <p className="text-muted-foreground">
          {isDMMode ? 'Select a conversation or start a new DM' : 'Select a channel to start chatting'}
        </p>
      </div>
    );
  }

  // Show voice channel interface for voice channels
  if (selectedChannel?.type === 'voice') {
    return (
      <div className="flex-1">
        <VoiceChannel channelId={selectedChannel.id} channelName={selectedChannel.name} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="h-12 px-4 flex items-center border-b border-border/50">
        {selectedChannel ? (
          <>
            <Hash className="h-5 w-5 mr-2 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">{selectedChannel.name}</h2>
          </>
        ) : selectedDM ? (
          <>
            <User className="h-5 w-5 mr-2 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">{selectedDM.profiles?.full_name}</h2>
          </>
        ) : null}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Loading messages...</p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={(message.user_id || message.sender_id) === user?.id}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <MessageInput onSend={handleSendMessage} />
    </div>
  );
}
