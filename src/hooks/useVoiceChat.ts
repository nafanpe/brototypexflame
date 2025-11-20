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

  const createPeerConnection = async (peerId: string) => {
    if (peerConnectionsRef.current.has(peerId)) {
      const existing = peerConnectionsRef.current.get(peerId)!;
      console.log('[Voice] Reusing existing peer connection for:', peerId, 'state:', existing.connectionState);
      return existing;
    }

    console.log('[Voice] Creating NEW peer connection for:', peerId);
    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    if (!localStreamRef.current) {
      console.error('[Voice] ⚠️ WARNING: No local stream when creating peer connection!');
    }
    
    if (localStreamRef.current) {
      console.log('[Voice] Adding local tracks to peer connection:', peerId);
      localStreamRef.current.getTracks().forEach(track => {
        const sender = pc.addTrack(track, localStreamRef.current!);
        console.log('[Voice] ✓ Added track:', {
          trackId: track.id,
          kind: track.kind,
          enabled: track.enabled,
          readyState: track.readyState,
          muted: track.muted,
          senderId: sender.track?.id
        });
      });
    }

    pc.ontrack = (event) => {
      console.log('[Voice] ✓ Received remote track from:', peerId);
      const track = event.track;
      
      console.log('[Voice] Track details:', {
        kind: track.kind,
        enabled: track.enabled,
        readyState: track.readyState,
        muted: track.muted,
        id: track.id
      });
      
      const stream = event.streams[0];
      
      // CRITICAL: Force unmute and enable
      stream.getAudioTracks().forEach(audioTrack => {
        audioTrack.enabled = true;
        
        // Monitor track state changes
        audioTrack.addEventListener('unmute', () => {
          console.log('[Voice] ✓✓ Track UNMUTED:', audioTrack.id);
        });
        
        audioTrack.addEventListener('mute', () => {
          console.log('[Voice] ⚠️ Track MUTED:', audioTrack.id);
        });
        
        audioTrack.addEventListener('ended', () => {
          console.log('[Voice] Track ended:', audioTrack.id);
        });
        
        console.log('[Voice] Track configured:', {
          id: audioTrack.id,
          enabled: audioTrack.enabled,
          muted: audioTrack.muted,
          readyState: audioTrack.readyState
        });
        
        // Try to force unmute if currently muted
        if (audioTrack.muted) {
          console.log('[Voice] ⚠️ Track is muted, this means no audio packets are coming!');
        }
      });
      
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        newMap.set(peerId, stream);
        console.log('[Voice] ✓ Remote streams updated, total:', newMap.size);
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
            candidate: event.candidate
          }
        });
      }
    };

    // Monitor ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log(`[Voice] ICE connection state for ${peerId}:`, pc.iceConnectionState);
      
      if (pc.iceConnectionState === 'failed') {
        console.log(`[Voice] ⚠️ Connection failed for ${peerId}, attempting ICE restart...`);
        
        // Try ICE restart first
        pc.restartIce();
        
        // If still failed after 3 seconds, recreate connection
        setTimeout(() => {
          if (pc.iceConnectionState === 'failed') {
            console.log(`[Voice] ICE restart failed, recreating connection for ${peerId}`);
            peerConnectionsRef.current.delete(peerId);
            handleNewPeer(peerId);
          }
        }, 3000);
      } else if (pc.iceConnectionState === 'disconnected') {
        console.log(`[Voice] ⚠️ Connection disconnected for ${peerId}, will retry...`);
        
        // Wait a bit before restarting
        setTimeout(() => {
          if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
            console.log(`[Voice] Attempting ICE restart for ${peerId}`);
            pc.restartIce();
          }
        }, 2000);
      } else if (pc.iceConnectionState === 'connected') {
        console.log(`[Voice] ✓✓ ICE connection established for ${peerId}`);
      } else if (pc.iceConnectionState === 'completed') {
        console.log(`[Voice] ✓✓✓ ICE connection completed for ${peerId}`);
      }
    };

    // Monitor connection state
    pc.onconnectionstatechange = () => {
      console.log(`[Voice] Connection state for ${peerId}:`, pc.connectionState);
      
      if (pc.connectionState === 'failed') {
        console.log(`[Voice] ⚠️⚠️ Peer connection FAILED for ${peerId}, recreating...`);
        peerConnectionsRef.current.delete(peerId);
        setTimeout(() => handleNewPeer(peerId), 1000);
      } else if (pc.connectionState === 'connected') {
        console.log(`[Voice] ✓✓✓ Peer connection fully CONNECTED for ${peerId}`);
      }
    };

    peerConnectionsRef.current.set(peerId, pc);
    return pc;
  };

  const handleNewPeer = async (peerId: string) => {
    if (peerId === user?.id) return;
    
    // Only create offer if our userId is "greater" to avoid glare condition
    const shouldCreateOffer = user!.id > peerId;
    
    if (!shouldCreateOffer) {
      console.log('[Voice] Waiting for offer from:', peerId);
      return;
    }
    
    console.log('[Voice] Creating offer for peer:', peerId);
    console.log('[Voice] Local stream exists:', !!localStreamRef.current);
    console.log('[Voice] Local tracks:', localStreamRef.current?.getTracks().map(t => ({
      kind: t.kind,
      enabled: t.enabled,
      readyState: t.readyState
    })));
    
    const pc = await createPeerConnection(peerId);
    
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      await pc.setLocalDescription(offer);
      
      console.log('[Voice] Sending offer to:', peerId);
      
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
      console.error('[Voice] Error creating offer:', error);
    }
  };

  const handleOffer = async (from: string, offer: RTCSessionDescriptionInit) => {
    if (from === user?.id) return;
    
    console.log('[Voice] Received offer from:', from);
    console.log('[Voice] Local stream for answer exists:', !!localStreamRef.current);
    
    const pc = await createPeerConnection(from);
    
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Process any pending ICE candidates
      const pending = pendingCandidatesRef.current.get(from) || [];
      console.log('[Voice] Processing', pending.length, 'pending ICE candidates');
      for (const candidate of pending) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidatesRef.current.delete(from);
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      console.log('[Voice] Sending answer to:', from);
      
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
      console.error('[Voice] Error handling offer:', error);
    }
  };

  const handleAnswer = async (from: string, answer: RTCSessionDescriptionInit) => {
    if (from === user?.id) return;
    
    console.log('[Voice] Received answer from:', from);
    const pc = peerConnectionsRef.current.get(from);
    
    if (pc && pc.signalingState !== 'stable') {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        
        // Process any pending ICE candidates
        const pending = pendingCandidatesRef.current.get(from) || [];
        console.log('[Voice] Processing', pending.length, 'pending ICE candidates');
        for (const candidate of pending) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingCandidatesRef.current.delete(from);
      } catch (error) {
        console.error('[Voice] Error handling answer:', error);
      }
    } else {
      console.log('[Voice] Ignoring answer - connection in stable state or not found');
    }
  };

  const handleIceCandidate = async (from: string, candidate: RTCIceCandidateInit) => {
    if (from === user?.id) return;
    
    const pc = peerConnectionsRef.current.get(from);
    
    if (pc) {
      // Only add candidate if remote description is set
      if (pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('[Voice] Added ICE candidate from:', from);
        } catch (error) {
          console.error('[Voice] Error adding ICE candidate:', error);
        }
      } else {
        // Queue candidate until remote description is set
        console.log('[Voice] Queueing ICE candidate from:', from);
        const pending = pendingCandidatesRef.current.get(from) || [];
        pending.push(candidate);
        pendingCandidatesRef.current.set(from, pending);
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
        console.log('[Voice] Received offer broadcast:', payload);
        if (payload.to === user.id) {
          handleOffer(payload.from, payload.offer);
        }
      })
      .on('broadcast', { event: 'webrtc-answer' }, ({ payload }) => {
        console.log('[Voice] Received answer broadcast:', payload);
        if (payload.to === user.id) {
          handleAnswer(payload.from, payload.answer);
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, ({ payload }) => {
        console.log('[Voice] Received ICE candidate broadcast:', payload);
        if (payload.to === user.id) {
          handleIceCandidate(payload.from, payload.candidate);
        }
      })
      .subscribe();

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const users = Object.values(state).flat() as any[];
        
        // Deduplicate users by userId (keep the latest entry)
        const uniqueUsersMap = new Map<string, VoiceParticipant>();
        users.forEach((u: any) => {
          uniqueUsersMap.set(u.userId, {
            userId: u.userId,
            userName: u.userName,
            isMuted: u.isMuted,
            isSpeaking: false
          });
        });
        
        const userList = Array.from(uniqueUsersMap.values());
        console.log('[Voice] Presence sync - total users:', users.length, 'unique:', userList.length);
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
      console.log('[Voice] Requesting microphone access...');
      
      // Enhanced audio constraints for mobile compatibility
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        },
        video: false
      });
      
      console.log('[Voice] ✓ Got media stream');
      
      // Ensure tracks are enabled
      stream.getAudioTracks().forEach(track => {
        track.enabled = true;
        console.log('[Voice] Local audio track:', {
          id: track.id,
          enabled: track.enabled,
          readyState: track.readyState,
          settings: track.getSettings()
        });
      });
      
      localStreamRef.current = stream;
      setIsConnected(true);
      
      console.log('[Voice] ✓ Connection established');
    } catch (error) {
      console.error('[Voice] Failed to get audio stream:', error);
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
    pendingCandidatesRef.current.clear();

    if (channelRef.current) {
      channelRef.current.untrack();
    }

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
