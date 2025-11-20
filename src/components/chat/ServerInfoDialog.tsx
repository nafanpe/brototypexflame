import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Calendar, User, Edit2, Check, X, Upload } from 'lucide-react';
import { ChatServer } from '@/pages/Chat';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
  const { user } = useAuth();
  const [members, setMembers] = useState<ServerMember[]>([]);
  const [ownerProfile, setOwnerProfile] = useState<{ full_name: string; avatar_url?: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (server && open) {
      fetchServerDetails();
      setEditedName(server.name);
      setIsEditing(false);
    }
  }, [server, open]);

  const fetchServerDetails = async () => {
    if (!server) return;

    // Fetch owner profile
    const { data: owner } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', server.owner_id)
      .maybeSingle();
    
    if (owner) setOwnerProfile(owner);

    // If public server, fetch all active users who can access it
    if (server.is_public) {
      const { data: allUsers } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('is_active', true)
        .order('full_name');

      if (allUsers) {
        // Transform to match ServerMember interface
        const allMembers = allUsers.map(user => ({
          user_id: user.id,
          joined_at: new Date().toISOString(),
          profiles: {
            full_name: user.full_name,
            avatar_url: user.avatar_url
          }
        }));
        setMembers(allMembers as any);
      }
    } else {
      // For private servers, only show actual members
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
    }
  };

  const handleSaveName = async () => {
    if (!server || !editedName.trim()) return;

    const { error } = await supabase
      .from('chat_servers')
      .update({ name: editedName.trim() })
      .eq('id', server.id);

    if (error) {
      toast.error('Failed to update server name');
      return;
    }

    toast.success('Server name updated');
    setIsEditing(false);
    // Refresh parent component by closing and reopening
    onOpenChange(false);
    setTimeout(() => onOpenChange(true), 100);
  };

  const handleIconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !server) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    setIsUploading(true);

    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${server.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('server-icons')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('server-icons')
        .getPublicUrl(filePath);

      // Update server with new icon URL
      const { error: updateError } = await supabase
        .from('chat_servers')
        .update({ icon_url: publicUrl })
        .eq('id', server.id);

      if (updateError) throw updateError;

      toast.success('Server icon updated');
      // Refresh parent component
      onOpenChange(false);
      setTimeout(() => onOpenChange(true), 100);
    } catch (error) {
      console.error('Error uploading icon:', error);
      toast.error('Failed to upload icon');
    } finally {
      setIsUploading(false);
    }
  };

  const isOwner = user?.id === server?.owner_id;

  if (!server) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarImage src={server.icon_url} />
                <AvatarFallback>{server.name[0]}</AvatarFallback>
              </Avatar>
              {isOwner && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-background border shadow-sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="h-3 w-3" />
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleIconUpload}
                  />
                </>
              )}
            </div>
            {isEditing ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="h-8"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleSaveName}
                >
                  <Check className="h-4 w-4 text-green-500" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setIsEditing(false);
                    setEditedName(server.name);
                  }}
                >
                  <X className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <span>{server.name}</span>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
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
              <span className="font-semibold">
                {server.is_public ? 'All Users ' : 'Members '}
                ({members.length})
              </span>
            </div>
            {server.is_public && (
              <p className="text-xs text-muted-foreground pl-6 mb-2">
                Public server - visible to all users
              </p>
            )}
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
