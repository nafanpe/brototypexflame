import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageSquare, Plus, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CreateServerDialog } from './CreateServerDialog';
import { ChatServer } from '@/pages/Chat';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ServerRailProps {
  selectedServer: ChatServer | null;
  onSelectServer: (server: ChatServer) => void;
  onDMMode: () => void;
  isDMMode: boolean;
}

export function ServerRail({ selectedServer, onSelectServer, onDMMode, isDMMode }: ServerRailProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [servers, setServers] = useState<ChatServer[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserServers();
      const cleanup = subscribeToServers();
      return cleanup;
    }
  }, [user]);

  const fetchUserServers = async () => {
    if (!user?.id) return;

    try {
      // Fetch all public servers OR servers where user is a member
      const { data: memberData } = await supabase
        .from('server_members')
        .select('server_id')
        .eq('user_id', user.id);

      const memberServerIds = memberData?.map((m) => m.server_id) || [];

      // Fetch servers: all public servers + servers user is a member of (even if private)
      const { data, error } = await supabase
        .from('chat_servers')
        .select('*')
        .or(`is_public.eq.true,id.in.(${memberServerIds.length > 0 ? memberServerIds.join(',') : '00000000-0000-0000-0000-000000000000'})`);

      if (error) {
        console.error('Error fetching servers:', error);
        return;
      }

      if (data) {
        setServers(data);
      }
    } catch (error) {
      console.error('Unexpected error fetching servers:', error);
    }
  };

  const subscribeToServers = () => {
    // Subscribe to server_members changes to detect when user joins a server
    const channel = supabase
      .channel('server-updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'server_members',
        filter: `user_id=eq.${user?.id}`
      }, () => {
        fetchUserServers();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'chat_servers' 
      }, () => {
        fetchUserServers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  return (
    <div className="w-[72px] bg-[#0a0f1a] flex flex-col items-center py-3 gap-2 border-r border-border/50">
      <TooltipProvider delayDuration={0}>
        {/* Dashboard/Home Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-full bg-[#1a1f2e] hover:bg-primary/20"
              onClick={() => navigate('/dashboard')}
            >
              <LayoutDashboard className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Dashboard</p>
          </TooltipContent>
        </Tooltip>

        <div className="w-8 h-[2px] bg-border/50 rounded-full my-1" />

        {/* DM Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`h-12 w-12 rounded-full ${
                isDMMode ? 'bg-primary text-primary-foreground' : 'bg-[#1a1f2e] hover:bg-primary/20'
              }`}
              onClick={onDMMode}
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Direct Messages</p>
          </TooltipContent>
        </Tooltip>

        <div className="w-8 h-[2px] bg-border/50 rounded-full my-1" />

        {/* Server Icons */}
        {servers.map((server) => (
          <Tooltip key={server.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onSelectServer(server)}
                className={`relative h-12 w-12 rounded-full transition-all hover:rounded-2xl ${
                  selectedServer?.id === server.id
                    ? 'rounded-2xl ring-2 ring-primary'
                    : ''
                }`}
              >
                {server.icon_url ? (
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={server.icon_url} />
                    <AvatarFallback className="bg-[#1a1f2e] text-foreground">
                      {server.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-12 w-12 rounded-full bg-[#1a1f2e] flex items-center justify-center text-foreground font-semibold hover:bg-primary/20 transition-colors">
                    {server.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {selectedServer?.id === server.id && (
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{server.name}</p>
            </TooltipContent>
          </Tooltip>
        ))}

        {/* Create Server Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-full bg-[#1a1f2e] hover:bg-primary/20 hover:rounded-2xl transition-all"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Create Server</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <CreateServerDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onServerCreated={fetchUserServers}
      />
    </div>
  );
}
