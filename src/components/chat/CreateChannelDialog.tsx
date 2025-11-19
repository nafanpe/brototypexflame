import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverId: string;
  onChannelCreated: () => void;
}

export function CreateChannelDialog({
  open,
  onOpenChange,
  serverId,
  onChannelCreated
}: CreateChannelDialogProps) {
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      const { error } = await supabase
        .from('chat_channels')
        .insert({
          server_id: serverId,
          name: name.trim().toLowerCase().replace(/\s+/g, '-')
        });

      if (error) throw error;

      toast.success('Channel created!');
      setName('');
      onChannelCreated();
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Failed to create channel');
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Channel</DialogTitle>
          <DialogDescription>Add a new text channel to your server</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="channel-name">Channel Name *</Label>
            <Input
              id="channel-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., frontend, backend, random"
              maxLength={30}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Lowercase, no spaces (use hyphens instead)
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!name.trim() || isCreating}>
              {isCreating ? 'Creating...' : 'Create Channel'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
