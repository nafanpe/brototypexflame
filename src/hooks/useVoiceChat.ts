import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface VoiceParticipant {
  userId: string;
  userName: string;
  isMuted: boolean;
  isSpeaking: boolean;
}

export function useVoiceChat(channelId: string | null) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!channelId || !user) {
      return;
    }

    const setupPresenceChannel = () => {
      const presenceChannel = supabase.channel(`voice:${channelId}`, {
        config: { presence: { key: user.id } }
      });

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState();
          const users = Object.values(state).flat() as any[];
          setParticipants(users.map((u: any) => ({
            userId: u.userId,
            userName: u.userName,
            isMuted: u.isMuted,
            isSpeaking: false
          })));
        })
        .on('presence', { event: 'join' }, ({ newPresences }) => {
          console.log('User joined voice:', newPresences);
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          console.log('User left voice:', leftPresences);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && isConnected) {
            await presenceChannel.track({
              userId: user.id,
              userName: user.user_metadata?.full_name || 'Unknown',
              isMuted: isMuted
            });
          }
        });

      channelRef.current = presenceChannel;
    };

    if (isConnected) {
      setupPresenceChannel();
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [channelId, user, isConnected, isMuted]);

  const connect = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      localStreamRef.current = stream;
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to get audio stream:', error);
      throw error;
    }
  };

  const disconnect = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();

    if (channelRef.current) {
      channelRef.current.untrack();
    }

    setIsConnected(false);
    setParticipants([]);
  };

  const toggleMute = async () => {
    if (!localStreamRef.current) return;

    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);

      if (channelRef.current && user) {
        await channelRef.current.track({
          userId: user.id,
          userName: user.user_metadata?.full_name || 'Unknown',
          isMuted: !audioTrack.enabled
        });
      }
    }
  };

  return {
    isConnected,
    isMuted,
    participants,
    connect,
    disconnect,
    toggleMute
  };
}
