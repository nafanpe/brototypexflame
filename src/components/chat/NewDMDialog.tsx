import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Search } from 'lucide-react';

interface NewDMDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated: () => void;
}

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

export function NewDMDialog({ open, onOpenChange, onConversationCreated }: NewDMDialogProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter((u) =>
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .neq('id', user?.id || '')
      .order('full_name');

    if (!error && data) {
      setUsers(data);
      setFilteredUsers(data);
    }
  };

  const handleSelectUser = async (selectedUser: UserProfile) => {
    if (!user) return;

    try {
      // Ensure user1_id < user2_id for the unique constraint
      const [user1, user2] = [user.id, selectedUser.id].sort();

      const { error } = await supabase
        .from('dm_conversations')
        .insert({
          user1_id: user1,
          user2_id: user2
        });

      if (error && error.code !== '23505') {
        // Ignore duplicate key error
        throw error;
      }

      toast.success(`Started conversation with ${selectedUser.full_name}`);
      onConversationCreated();
      onOpenChange(false);
      setSearchQuery('');
    } catch (error: any) {
      toast.error('Failed to start conversation');
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start Direct Message</DialogTitle>
          <DialogDescription>Search for a user to start chatting</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <ScrollArea className="h-[300px]">
          <div className="space-y-2">
            {filteredUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => handleSelectUser(u)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
              >
                <Avatar>
                  <AvatarImage src={u.avatar_url || ''} />
                  <AvatarFallback>{u.full_name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{u.full_name}</span>
              </button>
            ))}
            {filteredUsers.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No users found</p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
