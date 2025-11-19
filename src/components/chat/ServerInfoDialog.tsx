import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Calendar, User } from 'lucide-react';
import { ChatServer } from '@/pages/Chat';

interface ServerMember {
  user_id: string;
  joined_at: string;
  profiles: {
    full_name: string;
    avatar_url?: string;
  };
}

interface ServerInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server: ChatServer | null;
}

export function ServerInfoDialog({ open, onOpenChange, server }: ServerInfoDialogProps) {
  const [members, setMembers] = useState<ServerMember[]>([]);
  const [ownerProfile, setOwnerProfile] = useState<{ full_name: string; avatar_url?: string } | null>(null);

  useEffect(() => {
    if (server && open) {
      fetchServerDetails();
    }
  }, [server, open]);

  const fetchServerDetails = async () => {
    if (!server) return;

    // Fetch owner profile
    const { data: owner } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', server.owner_id)
      .single();
    
    if (owner) setOwnerProfile(owner);

    // Fetch members
    const { data: memberData } = await supabase
      .from('server_members')
      .select(`
        user_id,
        joined_at,
        profiles:user_id (full_name, avatar_url)
      `)
      .eq('server_id', server.id)
      .order('joined_at');

    if (memberData) {
      setMembers(memberData as any);
    }
  };

  if (!server) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {server.icon_url && (
              <Avatar className="h-10 w-10">
                <AvatarImage src={server.icon_url} />
                <AvatarFallback>{server.name[0]}</AvatarFallback>
              </Avatar>
            )}
            {server.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Owner Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="font-semibold">Server Owner</span>
            </div>
            {ownerProfile && (
              <div className="flex items-center gap-2 pl-6">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={ownerProfile.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {ownerProfile.full_name[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{ownerProfile.full_name}</span>
              </div>
            )}
          </div>

          {/* Created Date */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Created {new Date(server.created_at).toLocaleDateString()}</span>
          </div>

          {/* Members List */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="font-semibold">Members ({members.length})</span>
            </div>
            <ScrollArea className="h-48">
              <div className="space-y-2 pl-6">
                {members.map((member) => (
                  <div key={member.user_id} className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={member.profiles?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {member.profiles?.full_name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{member.profiles?.full_name || 'Unknown'}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
