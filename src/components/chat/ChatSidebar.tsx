import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Hash, Plus, Info, X, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChatServer, ChatChannel, DMConversation } from '@/pages/Chat';
import { NewDMDialog } from './NewDMDialog';
import { CreateChannelDialog } from './CreateChannelDialog';
import { ServerInfoDialog } from './ServerInfoDialog';

interface ChatSidebarProps {
  selectedServer: ChatServer | null;
  selectedChannel: ChatChannel | null;
  selectedDM: DMConversation | null;
  isDMMode: boolean;
  onSelectChannel: (channel: ChatChannel) => void;
  onSelectDM: (dm: DMConversation) => void;
}

export function ChatSidebar({
  selectedServer,
  selectedChannel,
  selectedDM,
  isDMMode,
  onSelectChannel,
  onSelectDM
}: ChatSidebarProps) {
  const { user } = useAuth();
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [conversations, setConversations] = useState<DMConversation[]>([]);
  const [isNewDMOpen, setIsNewDMOpen] = useState(false);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [isServerInfoOpen, setIsServerInfoOpen] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (selectedServer) {
      fetchChannels();
      setIsOwner(selectedServer.owner_id === user?.id);
      return subscribeToChannels();
    }
  }, [selectedServer, user]);

  const subscribeToChannels = () => {
    if (!selectedServer) return;

    const channel = supabase
      .channel(`server-${selectedServer.id}-channels`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_channels',
          filter: `server_id=eq.${selectedServer.id}`
        },
        () => {
          fetchChannels();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  useEffect(() => {
    if (isDMMode && user) {
      fetchConversations();
    }
  }, [isDMMode, user]);

  const fetchChannels = async () => {
    if (!selectedServer) return;

    const { data, error } = await supabase
      .from('chat_channels')
      .select('*')
      .eq('server_id', selectedServer.id)
      .order('created_at');

    if (!error && data) {
      setChannels(data);
      if (data.length > 0 && !selectedChannel) {
        onSelectChannel(data[0]);
      }
    }
  };

  const fetchConversations = async () => {
    const { data, error } = await supabase
      .from('dm_conversations')
      .select(`
        *,
        profiles:user1_id (id, full_name, avatar_url)
      `)
      .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`)
      .order('last_message_at', { ascending: false });

    if (!error && data) {
      const conversationsWithProfiles = await Promise.all(
        data.map(async (conv) => {
          const otherId = conv.user1_id === user?.id ? conv.user2_id : conv.user1_id;
          const { data: otherProfile } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', otherId)
            .single();

          return {
            ...conv,
            profiles: otherProfile
          };
        })
      );
      setConversations(conversationsWithProfiles);
    }
  };

  const handleDeleteChannel = async (channelId: string, channelName: string) => {
    if (!confirm(`Are you sure you want to delete #${channelName}? This action cannot be undone.`)) {
      return;
    }

    const { error } = await supabase
      .from('chat_channels')
      .delete()
      .eq('id', channelId);

    if (error) {
      console.error('Error deleting channel:', error);
      alert('Failed to delete channel');
    } else {
      // If we deleted the currently selected channel, select another one
      if (selectedChannel?.id === channelId) {
        const remainingChannels = channels.filter(c => c.id !== channelId);
        if (remainingChannels.length > 0) {
          onSelectChannel(remainingChannels[0]);
        }
      }
    }
  };

  if (!isDMMode && !selectedServer) {
    return (
      <div className="w-60 bg-[#0f1419] border-r border-border/50 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Select a server</p>
      </div>
    );
  }

  return (
    <div className="w-60 bg-[#0f1419] border-r border-border/50 flex flex-col">
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-border/50">
        <h2 className="font-semibold text-foreground">
          {isDMMode ? 'Direct Messages' : selectedServer?.name}
        </h2>
        {isDMMode ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsNewDMOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsServerInfoOpen(true)}
          >
            <Info className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {isDMMode ? (
          <div className="p-2 space-y-1">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelectDM(conv)}
                className={`w-full px-2 py-2 rounded flex items-center gap-3 hover:bg-accent transition-colors ${
                  selectedDM?.id === conv.id ? 'bg-accent' : ''
                }`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={conv.profiles?.avatar_url || ''} />
                  <AvatarFallback className="text-xs">
                    {conv.profiles?.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-foreground truncate">
                  {conv.profiles?.full_name || 'Unknown User'}
                </span>
              </button>
            ))}
            {conversations.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">
                No conversations yet.
                <br />
                Click + to start a DM.
              </p>
            )}
          </div>
        ) : (
          <div className="p-2 space-y-4">
            {/* Text Channels Section */}
            <div className="space-y-1">
              <div className="px-2 py-1 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Text Channels
                </span>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => setIsCreateChannelOpen(true)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
              </div>
              {channels.filter(ch => ch.type === 'text' || !ch.type).map((channel) => (
                <div
                  key={channel.id}
                  className={`w-full px-2 py-2 rounded flex items-center gap-2 transition-colors group ${
                    selectedChannel?.id === channel.id
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:bg-accent'
                  }`}
                >
                  <button
                    onClick={() => onSelectChannel(channel)}
                    className="flex items-center gap-2 flex-1 min-w-0"
                  >
                    <Hash className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm truncate">{channel.name}</span>
                  </button>
                  {isOwner && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChannel(channel.id, channel.name);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity"
                      title="Delete channel"
                    >
                      <X className="h-3 w-3 text-destructive" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Voice Channels Section */}
            <div className="space-y-1">
              <div className="px-2 py-1 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Voice Channels
                </span>
              </div>
              {channels.filter(ch => ch.type === 'voice').map((channel) => (
                <div
                  key={channel.id}
                  className={`w-full px-2 py-2 rounded flex items-center gap-2 transition-colors group ${
                    selectedChannel?.id === channel.id
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:bg-accent'
                  }`}
                >
                  <button
                    onClick={() => onSelectChannel(channel)}
                    className="flex items-center gap-2 flex-1 min-w-0"
                  >
                    <Volume2 className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm truncate">{channel.name}</span>
                  </button>
                  {isOwner && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChannel(channel.id, channel.name);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity"
                      title="Delete channel"
                    >
                      <X className="h-3 w-3 text-destructive" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>

      <NewDMDialog
        open={isNewDMOpen}
        onOpenChange={setIsNewDMOpen}
        onConversationCreated={fetchConversations}
      />

      <CreateChannelDialog
        open={isCreateChannelOpen}
        onOpenChange={setIsCreateChannelOpen}
        serverId={selectedServer?.id || ''}
        onChannelCreated={fetchChannels}
      />

      <ServerInfoDialog
        open={isServerInfoOpen}
        onOpenChange={setIsServerInfoOpen}
        server={selectedServer}
      />
    </div>
  );
}
