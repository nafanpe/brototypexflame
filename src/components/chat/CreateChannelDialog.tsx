import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Hash, Volume2 } from 'lucide-react';
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
  const [channelType, setChannelType] = useState<'text' | 'voice'>('text');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      const { error } = await supabase
        .from('chat_channels')
        .insert({
          server_id: serverId,
          name: name.trim().toLowerCase().replace(/\s+/g, '-'),
          type: channelType
        });

      if (error) throw error;

      toast.success('Channel created!');
      setName('');
      setChannelType('text');
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
          <DialogDescription>Add a new channel to your server</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Channel Type</Label>
            <RadioGroup value={channelType} onValueChange={(value: 'text' | 'voice') => setChannelType(value)}>
              <div className="flex items-center space-x-2 p-3 rounded-md border border-border hover:bg-accent/50 cursor-pointer">
                <RadioGroupItem value="text" id="text" />
                <Label htmlFor="text" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Hash className="w-4 h-4" />
                  <div>
                    <div className="font-medium">Text</div>
                    <div className="text-xs text-muted-foreground">Send messages, images, and links</div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-md border border-border hover:bg-accent/50 cursor-pointer">
                <RadioGroupItem value="voice" id="voice" />
                <Label htmlFor="voice" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Volume2 className="w-4 h-4" />
                  <div>
                    <div className="font-medium">Voice</div>
                    <div className="text-xs text-muted-foreground">Speak with voice in real-time</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="channel-name">Channel Name *</Label>
            <Input
              id="channel-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={channelType === 'text' ? 'e.g., general, random' : 'e.g., voice-chat, hangout'}
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
