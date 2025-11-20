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
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10
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
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const sessionIdRef = useRef<string | null>(null);
  const isNegotiatingRef = useRef<Map<string, boolean>>(new Map());
  const lastConnectTimeRef = useRef<number>(0);
  const previousUserListRef = useRef<string>('');

  const createPeerConnection = async (peerId: string) => {
    if (peerConnectionsRef.current.has(peerId)) {
      return peerConnectionsRef.current.get(peerId)!;
    }

    console.log('[Voice] Creating peer connection for:', peerId, 'sessionId:', sessionIdRef.current);
    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      stream.getAudioTracks().forEach(audioTrack => {
        audioTrack.enabled = true;
      });
      
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        newMap.set(peerId, stream);
        return newMap;
      });
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && signalingChannelRef.current) {
        signalingChannelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            from: user!.id,
            to: peerId,
            candidate: event.candidate,
            sessionId: sessionIdRef.current
          }
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') {
        pc.restartIce();
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        isNegotiatingRef.current.delete(peerId);
      }
    };

    peerConnectionsRef.current.set(peerId, pc);
    return pc;
  };

  const handleNewPeer = async (peerId: string) => {
    if (peerId === user?.id || isNegotiatingRef.current.get(peerId)) return;
    if (user!.id <= peerId) return;
    
    isNegotiatingRef.current.set(peerId, true);
    const pc = await createPeerConnection(peerId);
    
    try {
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
      await pc.setLocalDescription(offer);
      
      signalingChannelRef.current?.send({
        type: 'broadcast',
        event: 'webrtc-offer',
        payload: { from: user!.id, to: peerId, offer: pc.localDescription, sessionId: sessionIdRef.current }
      });
    } catch (error) {
      isNegotiatingRef.current.delete(peerId);
    }
  };

  const handleOffer = async (from: string, offer: RTCSessionDescriptionInit, incomingSessionId?: string) => {
    if (from === user?.id) return;
    if (incomingSessionId && sessionIdRef.current && incomingSessionId !== sessionIdRef.current) return;
    
    const pc = await createPeerConnection(from);
    
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      signalingChannelRef.current?.send({
        type: 'broadcast',
        event: 'webrtc-answer',
        payload: { from: user!.id, to: from, answer: pc.localDescription, sessionId: sessionIdRef.current }
      });
    } catch (error) {
      console.error('[Voice] Error handling offer:', error);
    }
  };

  const handleAnswer = async (from: string, answer: RTCSessionDescriptionInit, incomingSessionId?: string) => {
    if (from === user?.id) return;
    if (incomingSessionId && sessionIdRef.current && incomingSessionId !== sessionIdRef.current) return;
    
    const pc = peerConnectionsRef.current.get(from);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  };

  const handleIceCandidate = async (from: string, candidate: RTCIceCandidateInit, incomingSessionId?: string) => {
    if (from === user?.id) return;
    if (incomingSessionId && sessionIdRef.current && incomingSessionId !== sessionIdRef.current) return;
    
    const pc = peerConnectionsRef.current.get(from);
    if (pc?.remoteDescription) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  useEffect(() => {
    if (!channelId || !user || !isConnected) return;

    const presenceChannel = supabase.channel(`voice:${channelId}:presence`);
    const signalingChannel = supabase.channel(`voice:${channelId}:signaling`);

    signalingChannel
      .on('broadcast', { event: 'webrtc-offer' }, ({ payload }) => {
        if (payload.to === user.id) handleOffer(payload.from, payload.offer, payload.sessionId);
      })
      .on('broadcast', { event: 'webrtc-answer' }, ({ payload }) => {
        if (payload.to === user.id) handleAnswer(payload.from, payload.answer, payload.sessionId);
      })
      .on('broadcast', { event: 'ice-candidate' }, ({ payload }) => {
        if (payload.to === user.id) handleIceCandidate(payload.from, payload.candidate, payload.sessionId);
      })
      .subscribe();

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const users: any[] = [];
        Object.keys(state).forEach(key => {
          (state[key] as any[]).forEach(presence => users.push(presence));
        });
        
        const currentUserIds = users.map(u => u.userId).sort().join(',');
        
        if (currentUserIds !== previousUserListRef.current) {
          previousUserListRef.current = currentUserIds;
          users.forEach((u: any) => {
            if (u.userId !== user.id) {
              const existingPc = peerConnectionsRef.current.get(u.userId);
              if (!existingPc || existingPc.connectionState === 'closed' || existingPc.connectionState === 'failed') {
                handleNewPeer(u.userId);
              }
            }
          });
        }
        
        const uniqueUsersMap = new Map<string, VoiceParticipant>();
        users.forEach((u: any) => {
          uniqueUsersMap.set(u.userId, {
            userId: u.userId,
            userName: u.userName,
            isMuted: u.isMuted || false,
            isSpeaking: false
          });
        });
        setParticipants(Array.from(uniqueUsersMap.values()));
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        leftPresences.forEach((presence: any) => {
          peerConnectionsRef.current.get(presence.userId)?.close();
          peerConnectionsRef.current.delete(presence.userId);
          isNegotiatingRef.current.delete(presence.userId);
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
            isMuted
          });
        }
      });

    channelRef.current = presenceChannel;
    signalingChannelRef.current = signalingChannel;

    return () => {
      supabase.removeChannel(presenceChannel);
      supabase.removeChannel(signalingChannel);
    };
  }, [channelId, user, isConnected]);

  const connect = async () => {
    const now = Date.now();
    if (now - lastConnectTimeRef.current < 1000) return;
    lastConnectTimeRef.current = now;
    
    sessionIdRef.current = crypto.randomUUID();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.current = stream;
    setIsConnected(true);
  };

  const disconnect = () => {
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
    pendingCandidatesRef.current.clear();
    isNegotiatingRef.current.clear();
    previousUserListRef.current = '';
    sessionIdRef.current = null;
    channelRef.current?.untrack();
    setIsConnected(false);
    setParticipants([]);
    setRemoteStreams(new Map());
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

  return { isConnected, isMuted, participants, remoteStreams, connect, disconnect, toggleMute };
}
