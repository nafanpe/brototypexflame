import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ServerRail } from '@/components/chat/ServerRail';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatArea } from '@/components/chat/ChatArea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ChatServer {
  id: string;
  name: string;
  icon_url: string | null;
  owner_id: string;
  is_public: boolean;
  created_at: string;
}

export interface ChatChannel {
  id: string;
  server_id: string;
  name: string;
  type: string;
}

export interface DMConversation {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message_at: string;
  profiles?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export default function Chat() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedServer, setSelectedServer] = useState<ChatServer | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(null);
  const [selectedDM, setSelectedDM] = useState<DMConversation | null>(null);
  const [isDMMode, setIsDMMode] = useState(false);

  useEffect(() => {
    if (!user && !loading) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Handle invite link
  useEffect(() => {
    const handleInviteLink = async () => {
      const joinServerId = searchParams.get('join');
      if (!joinServerId || !user) return;

      try {
        // Check if already a member
        const { data: existingMember } = await supabase
          .from('server_members')
          .select('server_id')
          .eq('server_id', joinServerId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingMember) {
          // Already a member - fetch server and select it
          const { data: server } = await supabase
            .from('chat_servers')
            .select('*')
            .eq('id', joinServerId)
            .maybeSingle();
          
          if (server) {
            toast.info('You are already a member of this server');
            setSelectedServer(server as ChatServer);
          }
          setSearchParams({});
          return;
        }

        // Try to join the server directly
        const { error: joinError } = await supabase
          .from('server_members')
          .insert({
            server_id: joinServerId,
            user_id: user.id
          });

        if (joinError) {
          console.error('Join error:', joinError);
          toast.error('Unable to join this server. The invite link may be invalid.');
          setSearchParams({});
          return;
        }

        // Successfully joined - now fetch the server info
        const { data: server, error: serverError } = await supabase
          .from('chat_servers')
          .select('*')
          .eq('id', joinServerId)
          .maybeSingle();

        if (serverError || !server) {
          toast.error('Joined server but failed to load server info. Please refresh.');
          console.error('Server fetch error:', serverError);
        } else {
          toast.success(`Successfully joined ${server.name}!`);
          setSelectedServer(server as ChatServer);
        }
      } catch (error) {
        console.error('Error handling invite:', error);
        toast.error('Failed to process invite link');
      } finally {
        setSearchParams({});
      }
    };

    handleInviteLink();
  }, [searchParams, user, setSearchParams]);

  const handleSelectServer = (server: ChatServer) => {
    setSelectedServer(server);
    setSelectedChannel(null);
    setSelectedDM(null);
    setIsDMMode(false);
  };

  const handleSelectChannel = (channel: ChatChannel) => {
    setSelectedChannel(channel);
    setSelectedDM(null);
  };

  const handleSelectDM = (dm: DMConversation) => {
    setSelectedDM(dm);
    setSelectedChannel(null);
  };

  const handleDMMode = () => {
    setIsDMMode(true);
    setSelectedServer(null);
    setSelectedChannel(null);
  };

  const handleServerUpdated = (updatedServer: ChatServer | null) => {
    setSelectedServer(updatedServer);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="dark h-screen w-full flex overflow-hidden bg-[#0a0f1a] text-white">
      {/* Desktop: Pane 1 - Server Rail (hidden on mobile) */}
      <div className="hidden md:block">
        <ServerRail
          selectedServer={selectedServer}
          onSelectServer={handleSelectServer}
          onDMMode={handleDMMode}
          isDMMode={isDMMode}
        />
      </div>

      {/* Desktop: Pane 2 - Sidebar (hidden on mobile) */}
      <div className="hidden md:block">
        <ChatSidebar
          selectedServer={selectedServer}
          selectedChannel={selectedChannel}
          selectedDM={selectedDM}
          isDMMode={isDMMode}
          onSelectChannel={handleSelectChannel}
          onSelectDM={handleSelectDM}
          onServerUpdated={handleServerUpdated}
        />
      </div>

      {/* Pane 3: Chat Area (full width on mobile) */}
      <ChatArea
        selectedServer={selectedServer}
        selectedChannel={selectedChannel}
        selectedDM={selectedDM}
        isDMMode={isDMMode}
        onSelectServer={handleSelectServer}
        onSelectChannel={handleSelectChannel}
        onSelectDM={handleSelectDM}
        onDMMode={handleDMMode}
        onServerUpdated={handleServerUpdated}
      />
    </div>
  );
}
