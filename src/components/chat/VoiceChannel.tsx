import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Mic, MicOff, Volume2 } from 'lucide-react';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useEffect, useRef } from 'react';

interface VoiceChannelProps {
  channelId: string;
  channelName: string;
}

export function VoiceChannel({ channelId, channelName }: VoiceChannelProps) {
  const { isConnected, isMuted, participants, remoteStreams, connect, disconnect, toggleMute } = useVoiceChat(channelId);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    remoteStreams.forEach((stream, peerId) => {
      let audioEl = audioElementsRef.current.get(peerId);
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        audioEl.volume = 1.0;
        document.body.appendChild(audioEl);
        audioElementsRef.current.set(peerId, audioEl);
      }
      if (audioEl.srcObject !== stream) {
        audioEl.srcObject = stream;
        audioEl.play().catch(() => {});
      }
    });

    audioElementsRef.current.forEach((audioEl, peerId) => {
      if (!remoteStreams.has(peerId)) {
        audioEl.pause();
        audioEl.srcObject = null;
        audioEl.parentNode?.removeChild(audioEl);
        audioElementsRef.current.delete(peerId);
      }
    });
    
    return () => {
      audioElementsRef.current.forEach((audioEl) => {
        audioEl.pause();
        audioEl.srcObject = null;
        audioEl.parentNode?.removeChild(audioEl);
      });
      audioElementsRef.current.clear();
    };
  }, [remoteStreams]);

  return (
    <div className="flex flex-col h-full bg-[#0a0f1a]">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2 text-foreground">
          <Phone className="w-5 h-5" />
          <h2 className="font-semibold">{channelName}</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3 md:block md:space-y-3">
          {participants.map(participant => (
            <div key={participant.userId} className="flex flex-col md:flex-row items-center gap-2 md:gap-3 p-3 bg-[#1a1f2e] rounded-lg">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {participant.userName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-center md:text-left">
                <div className="text-sm md:text-base font-medium text-foreground truncate">
                  {participant.userName}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {participant.isSpeaking && <Volume2 className="w-3 h-3 md:w-4 md:h-4 text-green-500 animate-pulse" />}
                {participant.isMuted && <MicOff className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-border/50">
        {!isConnected ? (
          <Button onClick={() => connect().then(() => toast.success(`Connected to ${channelName}`)).catch(() => toast.error('Failed to connect'))} className="w-full">
            <Phone className="w-4 h-4 mr-2" />
            Join Voice Channel
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={toggleMute} variant={isMuted ? "destructive" : "secondary"} className="flex-1">
              {isMuted ? <MicOff className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
              {isMuted ? 'Unmute' : 'Mute'}
            </Button>
            <Button onClick={() => { disconnect(); toast.success('Disconnected'); }} variant="destructive" className="flex-1">
              <PhoneOff className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
