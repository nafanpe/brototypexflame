import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Mic, MicOff, Volume2 } from 'lucide-react';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
        audioEl.setAttribute('playsinline', '');
        audioElementsRef.current.set(peerId, audioEl);
      }
      
      audioEl.srcObject = stream;
    });

    audioElementsRef.current.forEach((audioEl, peerId) => {
      if (!remoteStreams.has(peerId)) {
        audioEl.srcObject = null;
        audioElementsRef.current.delete(peerId);
      }
    });
  }, [remoteStreams]);

  const handleConnect = async () => {
    try {
      await connect();
      toast.success(`Connected to ${channelName}`);
    } catch (error) {
      toast.error('Failed to connect. Please allow microphone access.');
    }
  };

  const handleDisconnect = () => {
    disconnect();
    toast.success('Disconnected from voice channel');
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0f1a]">
      {/* Header */}
      <div className="h-12 border-b border-border px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">{channelName}</h2>
        </div>
      </div>

      {/* Voice Controls */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
        {!isConnected ? (
          <div className="text-center space-y-4">
            <div className="w-24 h-24 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
              <Volume2 className="w-12 h-12 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Voice Channel</h3>
              <p className="text-muted-foreground">Click to join and start speaking</p>
            </div>
            <Button
              onClick={handleConnect}
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Phone className="w-5 h-5 mr-2" />
              Join Voice
            </Button>
          </div>
        ) : (
          <div className="w-full max-w-2xl space-y-8">
            {/* Participants */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase px-2">
                In Voice — {participants.length}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {participants.map((participant) => (
                  <div
                    key={participant.userId}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg bg-accent/20 border border-border"
                  >
                    <div className="relative">
                      <Avatar className="w-16 h-16">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {participant.userName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {participant.isMuted && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-destructive flex items-center justify-center">
                          <MicOff className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-medium text-center truncate w-full">
                      {participant.userName}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-4">
              <Button
                onClick={toggleMute}
                size="lg"
                variant={isMuted ? 'destructive' : 'secondary'}
                className="rounded-full w-14 h-14"
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </Button>
              <Button
                onClick={handleDisconnect}
                size="lg"
                variant="destructive"
                className="rounded-full w-14 h-14"
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {isMuted ? 'You are muted' : 'You are unmuted'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
