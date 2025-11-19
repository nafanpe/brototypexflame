import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ServerRail } from '@/components/chat/ServerRail';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatArea } from '@/components/chat/ChatArea';

export interface ChatServer {
  id: string;
  name: string;
  icon_url: string | null;
  owner_id: string;
  is_public: boolean;
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
  const [selectedServer, setSelectedServer] = useState<ChatServer | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(null);
  const [selectedDM, setSelectedDM] = useState<DMConversation | null>(null);
  const [isDMMode, setIsDMMode] = useState(false);

  useEffect(() => {
    if (!user && !loading) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

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

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Pane 1: Server Rail */}
      <ServerRail
        selectedServer={selectedServer}
        onSelectServer={handleSelectServer}
        onDMMode={handleDMMode}
        isDMMode={isDMMode}
      />

      {/* Pane 2: Sidebar */}
      <ChatSidebar
        selectedServer={selectedServer}
        selectedChannel={selectedChannel}
        selectedDM={selectedDM}
        isDMMode={isDMMode}
        onSelectChannel={handleSelectChannel}
        onSelectDM={handleSelectDM}
      />

      {/* Pane 3: Chat Area */}
      <ChatArea
        selectedServer={selectedServer}
        selectedChannel={selectedChannel}
        selectedDM={selectedDM}
        isDMMode={isDMMode}
      />
    </div>
  );
}
