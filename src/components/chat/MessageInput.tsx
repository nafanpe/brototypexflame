import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Image as ImageIcon, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface MessageInputProps {
  onSend: (content: string, imageUrl: string | null) => Promise<void>;
}

export function MessageInput({ onSend }: MessageInputProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleSend = async () => {
    // Prevent sending empty messages
    if (!content.trim() && !selectedImage) return;

    setIsSending(true);
    try {
      let imageUrl = null;

      if (selectedImage && user) {
        const fileExt = selectedImage.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('community-posts')
          .upload(fileName, selectedImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('community-posts')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      await onSend(content.trim() || ' ', imageUrl);
      setContent('');
      clearImage();
    } catch (error: any) {
      // Handle RLS policy violations and other errors
      if (error.code === '42501' || error.message?.includes('policy')) {
        toast.error('You do not have permission to send messages here');
      } else {
        toast.error('Failed to send message');
      }
      console.error('Message send error:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 border-t border-border/50 bg-[#0a0f1a]">
      {imagePreview && (
        <div className="mb-2 relative inline-block">
          <img src={imagePreview} alt="Preview" className="rounded-lg max-h-32" />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6"
            onClick={clearImage}
          >
            ×
          </Button>
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="file"
          id="chat-image-upload"
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => document.getElementById('chat-image-upload')?.click()}
          disabled={isSending}
        >
          <ImageIcon className="h-5 w-5" />
        </Button>

        <Textarea
          placeholder="Type a message... (Markdown & code blocks supported)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 min-h-[60px] max-h-[200px] resize-none"
          disabled={isSending}
        />

        <Button
          onClick={handleSend}
          disabled={(!content.trim() && !selectedImage) || isSending}
          size="icon"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        Tip: Use **bold**, *italic*, or ```code``` for formatting. Press Enter to send, Shift+Enter for new line.
      </p>
    </div>
  );
}
