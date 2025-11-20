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
          console.error('[Voice] ⚠️⚠️ Track ENDED unexpectedly:', audioTrack.id, 'from:', peerId);
          // Track ended - connection might be broken
          if (pc.connectionState !== 'closed') {
            console.log('[Voice] Track ended but connection still open, might need restart');
          }
        });
        
        console.log('[Voice] Track configured:', {
          id: audioTrack.id,
          enabled: audioTrack.enabled,
          muted: audioTrack.muted,
          readyState: audioTrack.readyState
        });
        
        // Warn if muted
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
        console.error(`[Voice] ⚠️ ICE connection FAILED for ${peerId}`);
        console.log(`[Voice] Attempting to restart ICE for ${peerId}`);
        // Attempt ICE restart
        pc.restartIce();
      } else if (pc.iceConnectionState === 'disconnected') {
        console.log(`[Voice] ⚠️ ICE connection DISCONNECTED for ${peerId} - waiting for auto-recovery`);
        // Give ICE 5 seconds to reconnect naturally before forcing restart
        setTimeout(() => {
          if (pc.iceConnectionState === 'disconnected') {
            console.log(`[Voice] Still disconnected after 5s, attempting restart for ${peerId}`);
            pc.restartIce();
          }
        }, 5000);
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
        console.log(`[Voice] ⚠️⚠️ Peer connection FAILED for ${peerId}`);
        // Let presence sync handle recreation
      } else if (pc.connectionState === 'connected') {
        console.log(`[Voice] ✓✓✓ Peer connection fully CONNECTED for ${peerId}`);
      } else if (pc.connectionState === 'disconnected') {
        console.log(`[Voice] ⚠️ Peer connection DISCONNECTED for ${peerId}`);
        // Let presence sync handle recreation
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
    
    // Check existing connection state
    const existingPc = peerConnectionsRef.current.get(from);
    if (existingPc) {
      const connState = existingPc.connectionState;
      const iceState = existingPc.iceConnectionState;
      
      // If connection is working perfectly, ignore the offer
      if (connState === 'connected' && (iceState === 'connected' || iceState === 'completed')) {
        console.log('[Voice] ⚠️ Ignoring offer - connection already stable:', from);
        return;
      }
      
      // Only close and recreate if connection is permanently broken (failed or closed)
      // Don't close on "disconnected" - that's temporary and can recover
      if (connState === 'failed' || connState === 'closed') {
        console.log('[Voice] Closing permanently broken connection before processing offer:', from, 
          'connState:', connState);
        existingPc.close();
        peerConnectionsRef.current.delete(from);
        pendingCandidatesRef.current.delete(from);
      } else if (connState === 'connecting' || connState === 'new') {
        // Connection is still being established - process the offer
        console.log('[Voice] Connection still establishing, processing offer:', from, 'connState:', connState);
      } else {
        // For any other state (including disconnected), log but continue processing
        console.log('[Voice] Processing offer for connection in state:', connState, 'iceState:', iceState);
      }
    }
    
    console.log('[Voice] Processing offer from:', from);
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
        
        // CRITICAL: Only create peer connections for truly new users OR if definitely broken
        // DON'T recreate on "disconnected" - that's temporary and can recover
        // Only recreate on "failed" or "closed" which are permanent states
        users.forEach((u: any) => {
          if (u.userId !== user.id) {
            const existingPc = peerConnectionsRef.current.get(u.userId);
            
            if (!existingPc) {
              // No connection exists - create new one
              console.log('[Voice] No connection exists for:', u.userId, '- creating');
              handleNewPeer(u.userId);
            } else if (existingPc.connectionState === 'closed' || existingPc.connectionState === 'failed') {
              // Connection is permanently broken - recreate
              console.log('[Voice] Connection permanently broken for:', u.userId, 
                'state:', existingPc.connectionState, '- recreating');
              existingPc.close();
              peerConnectionsRef.current.delete(u.userId);
              handleNewPeer(u.userId);
            } else {
              // Connection exists and is not permanently broken - keep it
              // Even if "disconnected", give ICE time to recover naturally
              console.log('[Voice] Keeping existing connection for:', u.userId, 
                'state:', existingPc.connectionState, 
                'iceState:', existingPc.iceConnectionState);
            }
          }
        });
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('[Voice] User joined voice:', newPresences);
        // Don't auto-create connections on join - let sync handle it
        // This prevents duplicate connection attempts
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('[Voice] User left voice:', leftPresences);
        leftPresences.forEach((presence: any) => {
          const pc = peerConnectionsRef.current.get(presence.userId);
          if (pc) {
            console.log('[Voice] Closing connection for leaving user:', presence.userId);
            pc.close();
            peerConnectionsRef.current.delete(presence.userId);
          }
          setRemoteStreams(prev => {
            const newMap = new Map(prev);
            newMap.delete(presence.userId);
            console.log('[Voice] Removed stream for leaving user, remaining:', newMap.size);
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
      
      // Ensure tracks are enabled and monitored
      stream.getAudioTracks().forEach(track => {
        track.enabled = true;
        
        // Monitor local track state
        track.addEventListener('ended', () => {
          console.error('[Voice] ⚠️⚠️ LOCAL track ENDED:', track.id);
          console.error('[Voice] This should not happen during normal mute/unmute!');
        });
        
        track.addEventListener('mute', () => {
          console.log('[Voice] Local track muted (this is normal during hardware issues):', track.id);
        });
        
        track.addEventListener('unmute', () => {
          console.log('[Voice] Local track unmuted:', track.id);
        });
        
        console.log('[Voice] Local audio track:', {
          id: track.id,
          enabled: track.enabled,
          readyState: track.readyState,
          muted: track.muted,
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
      const wasEnabled = audioTrack.enabled;
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);

      console.log('[Voice] Toggle mute:', wasEnabled ? 'muting' : 'unmuting', 'track:', audioTrack.id);

      // Update presence WITHOUT disrupting connections
      if (channelRef.current && user) {
        try {
          await channelRef.current.track({
            userId: user.id,
            userName: user.user_metadata?.full_name || 'Unknown',
            isMuted: !audioTrack.enabled
          });
          console.log('[Voice] Presence updated for mute state');
        } catch (error) {
          console.error('[Voice] Error updating presence:', error);
          // Don't fail the mute operation if presence update fails
        }
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
