import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface VoiceParticipant {
  userId: string;
  userName: string;
  isMuted: boolean;
  isSpeaking: boolean;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export function useVoiceChat(channelId: string | null) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<any>(null);
  const signalingChannelRef = useRef<any>(null);

  const createPeerConnection = async (peerId: string) => {
    if (peerConnectionsRef.current.has(peerId)) {
      return peerConnectionsRef.current.get(peerId)!;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pc.ontrack = (event) => {
      console.log('Received remote track from:', peerId);
      setRemoteStreams(prev => new Map(prev).set(peerId, event.streams[0]));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && signalingChannelRef.current) {
        signalingChannelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            from: user!.id,
            to: peerId,
            candidate: event.candidate
          }
        });
      }
    };

    peerConnectionsRef.current.set(peerId, pc);
    return pc;
  };

  const handleNewPeer = async (peerId: string) => {
    if (peerId === user?.id) return;
    
    console.log('Creating offer for peer:', peerId);
    const pc = await createPeerConnection(peerId);
    
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      signalingChannelRef.current?.send({
        type: 'broadcast',
        event: 'webrtc-offer',
        payload: {
          from: user!.id,
          to: peerId,
          offer: pc.localDescription
        }
      });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  };

  const handleOffer = async (from: string, offer: RTCSessionDescriptionInit) => {
    if (from === user?.id) return;
    
    console.log('Received offer from:', from);
    const pc = await createPeerConnection(from);
    
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      signalingChannelRef.current?.send({
        type: 'broadcast',
        event: 'webrtc-answer',
        payload: {
          from: user!.id,
          to: from,
          answer: pc.localDescription
        }
      });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  const handleAnswer = async (from: string, answer: RTCSessionDescriptionInit) => {
    if (from === user?.id) return;
    
    console.log('Received answer from:', from);
    const pc = peerConnectionsRef.current.get(from);
    
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        console.error('Error handling answer:', error);
      }
    }
  };

  const handleIceCandidate = async (from: string, candidate: RTCIceCandidateInit) => {
    if (from === user?.id) return;
    
    const pc = peerConnectionsRef.current.get(from);
    
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    }
  };

  useEffect(() => {
    if (!channelId || !user || !isConnected) {
      return;
    }

    const presenceChannel = supabase.channel(`voice:${channelId}`, {
      config: { presence: { key: user.id } }
    });

    const signalingChannel = supabase.channel(`signaling:${channelId}`);

    signalingChannel
      .on('broadcast', { event: 'webrtc-offer' }, ({ payload }) => {
        if (payload.to === user.id) {
          handleOffer(payload.from, payload.offer);
        }
      })
      .on('broadcast', { event: 'webrtc-answer' }, ({ payload }) => {
        if (payload.to === user.id) {
          handleAnswer(payload.from, payload.answer);
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, ({ payload }) => {
        if (payload.to === user.id) {
          handleIceCandidate(payload.from, payload.candidate);
        }
      })
      .subscribe();

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const users = Object.values(state).flat() as any[];
        const userList = users.map((u: any) => ({
          userId: u.userId,
          userName: u.userName,
          isMuted: u.isMuted,
          isSpeaking: false
        }));
        setParticipants(userList);
        
        users.forEach((u: any) => {
          if (u.userId !== user.id && !peerConnectionsRef.current.has(u.userId)) {
            handleNewPeer(u.userId);
          }
        });
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined voice:', newPresences);
        newPresences.forEach((presence: any) => {
          if (presence.userId !== user.id) {
            handleNewPeer(presence.userId);
          }
        });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left voice:', leftPresences);
        leftPresences.forEach((presence: any) => {
          const pc = peerConnectionsRef.current.get(presence.userId);
          if (pc) {
            pc.close();
            peerConnectionsRef.current.delete(presence.userId);
          }
          setRemoteStreams(prev => {
            const newMap = new Map(prev);
            newMap.delete(presence.userId);
            return newMap;
          });
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            userId: user.id,
            userName: user.user_metadata?.full_name || 'Unknown',
            isMuted: isMuted
          });
        }
      });

    channelRef.current = presenceChannel;
    signalingChannelRef.current = signalingChannel;

    return () => {
      supabase.removeChannel(presenceChannel);
      supabase.removeChannel(signalingChannel);
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
    remoteStreams,
    connect,
    disconnect,
    toggleMute
  };
}
