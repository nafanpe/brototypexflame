import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';

interface CreateServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onServerCreated: () => void;
}

export function CreateServerDialog({ open, onOpenChange, onServerCreated }: CreateServerDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleIconSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIconFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setIconPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = async () => {
    if (!name.trim() || !user) return;

    setIsCreating(true);
    try {
      let iconUrl = null;

      if (iconFile) {
        const fileExt = iconFile.name.split('.').pop();
        const fileName = `server-icons/${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('community-posts')
          .upload(fileName, iconFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('community-posts')
          .getPublicUrl(fileName);

        iconUrl = publicUrl;
      }

      const { error } = await supabase
        .from('chat_servers')
        .insert({
          name: name.trim(),
          icon_url: iconUrl,
          owner_id: user.id,
          is_public: isPublic
        });

      if (error) throw error;

      toast.success('Server created!');
      setName('');
      setIconFile(null);
      setIconPreview(null);
      setIsPublic(true);
      onServerCreated(); // This triggers fetchUserServers in ServerRail
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Failed to create server');
      console.error('Server creation error:', error);
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Server</DialogTitle>
          <DialogDescription>
            Create your own space to chat with classmates
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Server Icon (Optional)</Label>
            <div className="mt-2 flex items-center gap-4">
              {iconPreview ? (
                <img src={iconPreview} alt="Icon" className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <input
                type="file"
                id="server-icon-upload"
                accept="image/*"
                className="hidden"
                onChange={handleIconSelect}
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('server-icon-upload')?.click()}
              >
                Upload Icon
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="server-name">Server Name *</Label>
            <Input
              id="server-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Class of '25, Frontend Wizards"
              maxLength={50}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Public Server</Label>
              <p className="text-xs text-muted-foreground">
                Allow anyone on campus to discover and join
              </p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!name.trim() || isCreating}>
              {isCreating ? 'Creating...' : 'Create Server'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
