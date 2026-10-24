import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getErrorMessage } from '../lib/api';
import { messagesApi } from '../services/wania';
import type { UserSummary } from '../types';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { useToast } from './ToastContext';

export type CallPeer = Pick<UserSummary, 'id' | 'username' | 'displayName' | 'avatarUrl'>;
export type CallType = 'audio' | 'video';
export type CallPhase = 'ringing' | 'incoming' | 'connecting' | 'active' | 'ended' | 'declined';

export type CallState = {
  id: string;
  type: CallType;
  peer: CallPeer;
  direction: 'incoming' | 'outgoing';
  phase: CallPhase;
  startedAt: number | null;
};

type CallContextValue = {
  call: CallState | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  muted: boolean;
  cameraOff: boolean;
  inCall: boolean;
  startCall: (peer: CallPeer, type: CallType) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  endCall: () => void;
  dismissCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  switchCamera: () => Promise<void>;
};

const CallContext = createContext<CallContextValue | null>(null);

const FALLBACK_ICE: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

function mediaError(error: unknown) {
  const name = (error as DOMException)?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Camera or microphone permission was denied. Allow access in your browser settings and try again.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No camera or microphone was found on this device.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Your camera or microphone is already in use by another app.';
  }
  return 'Could not access your camera or microphone.';
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { error, info } = useToast();

  const [call, setCall] = useState<CallState | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');

  const callRef = useRef<CallState | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const remoteRef = useRef<MediaStream | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const iceServersRef = useRef<RTCIceServer[]>(FALLBACK_ICE);
  const teardownTimerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;
    messagesApi
      .iceServers()
      .then((servers) => {
        if (servers.length) iceServersRef.current = servers;
      })
      .catch(() => {
        iceServersRef.current = FALLBACK_ICE;
      });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const commitCall = useCallback((next: CallState | null) => {
    callRef.current = next;
    setCall(next);
  }, []);

  const patchCall = useCallback((patch: Partial<CallState>) => {
    if (!callRef.current) return;
    const next = { ...callRef.current, ...patch };
    callRef.current = next;
    setCall(next);
  }, []);

  const stopLocal = useCallback(() => {
    localRef.current?.getTracks().forEach((track) => track.stop());
    localRef.current = null;
    setLocalStream(null);
  }, []);

  const teardown = useCallback(() => {
    if (teardownTimerRef.current) {
      window.clearTimeout(teardownTimerRef.current);
      teardownTimerRef.current = null;
    }
    const pc = pcRef.current;
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.getSenders().forEach((sender) => {
        try {
          pc.removeTrack(sender);
        } catch {
          /* already closed */
        }
      });
      pc.close();
      pcRef.current = null;
    }
    stopLocal();
    remoteRef.current?.getTracks().forEach((track) => track.stop());
    remoteRef.current = null;
    setRemoteStream(null);
    pendingIceRef.current = [];
    startedAtRef.current = null;
    setMuted(false);
    setCameraOff(false);
    setCameraFacing('user');
    commitCall(null);
  }, [commitCall, stopLocal]);

  const scheduleTeardown = useCallback(
    (delay = 1400) => {
      if (teardownTimerRef.current) window.clearTimeout(teardownTimerRef.current);
      teardownTimerRef.current = window.setTimeout(teardown, delay);
    },
    [teardown]
  );

  const emitAck = useCallback(
    <T,>(event: string, payload: Record<string, unknown>): Promise<T> =>
      new Promise((resolve, reject) => {
        if (!socket) {
          reject(new Error('Realtime connection is not ready. Please try again.'));
          return;
        }
        socket.timeout(15000).emit(event, payload, (timeoutError: Error | null, response: T & { ok?: boolean; error?: string }) => {
          if (timeoutError) {
            reject(new Error('The call request timed out. Please try again.'));
            return;
          }
          if (response?.ok === false) {
            reject(new Error(response.error || 'The call request failed.'));
            return;
          }
          resolve(response);
        });
      }),
    [socket]
  );

  const getLocalMedia = useCallback(async (type: CallType) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Your browser does not support audio and video calls.');
    }
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video:
          type === 'video'
            ? {
                facingMode: cameraFacing,
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30, max: 30 },
              }
            : false,
      });
    } catch (err) {
      throw new Error(mediaError(err));
    }
  }, [cameraFacing]);

  const flushIce = useCallback(async (pc: RTCPeerConnection) => {
    const pending = pendingIceRef.current;
    pendingIceRef.current = [];
    for (const candidate of pending) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        // A stale candidate can fail after a renegotiation; ignore it.
      }
    }
  }, []);

  const createPeer = useCallback(
    (callId: string, peerId: string) => {
      const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
      pcRef.current = pc;

      const current = localRef.current;
      if (current) {
        current.getTracks().forEach((track) => pc.addTrack(track, current));
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket?.emit('call:ice', { callId, candidate: event.candidate, to: peerId });
        }
      };

      pc.ontrack = (event) => {
        const stream = remoteRef.current ?? new MediaStream();
        remoteRef.current = stream;
        if (!stream.getTracks().some((track) => track.id === event.track.id)) {
          stream.addTrack(event.track);
        }
        setRemoteStream(new MediaStream(stream.getTracks()));
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          const startedAt = startedAtRef.current ?? Date.now();
          startedAtRef.current = startedAt;
          patchCall({ phase: 'active', startedAt });
        } else if (pc.connectionState === 'failed') {
          error('The call connection failed. Check your network and try again.');
          patchCall({ phase: 'ended' });
          scheduleTeardown(1800);
        }
      };

      return pc;
    },
    [error, patchCall, scheduleTeardown, socket]
  );

  const startCall = useCallback(
    async (peer: CallPeer, type: CallType) => {
      if (!user || peer.id === user.id) return;
      if (callRef.current) {
        error('You are already on a call.');
        return;
      }
      if (teardownTimerRef.current) {
        window.clearTimeout(teardownTimerRef.current);
        teardownTimerRef.current = null;
      }
      try {
        const stream = await getLocalMedia(type);
        localRef.current = stream;
        setLocalStream(stream);
        setMuted(false);
        setCameraOff(false);
        const result = await emitAck<{ call: { id: string } }>('call:invite', {
          calleeId: peer.id,
          type,
        });
        startedAtRef.current = null;
        commitCall({
          id: result.call.id,
          type,
          peer,
          direction: 'outgoing',
          phase: 'ringing',
          startedAt: null,
        });
        createPeer(result.call.id, peer.id);
      } catch (err) {
        stopLocal();
        error(getErrorMessage(err));
      }
    },
    [commitCall, createPeer, emitAck, error, getLocalMedia, stopLocal, user]
  );

  const acceptCall = useCallback(async () => {
    const current = callRef.current;
    if (!current || current.phase !== 'incoming') return;
    try {
      const stream = await getLocalMedia(current.type);
      localRef.current = stream;
      setLocalStream(stream);
      await emitAck('call:accept', { callId: current.id });
      const startedAt = Date.now();
      startedAtRef.current = startedAt;
      patchCall({ phase: 'connecting', startedAt });
      createPeer(current.id, current.peer.id);
    } catch (err) {
      error(getErrorMessage(err));
      if (localRef.current) {
        stopLocal();
        socket?.emit('call:decline', { callId: current.id });
        patchCall({ phase: 'declined' });
        scheduleTeardown();
      }
    }
  }, [createPeer, emitAck, error, getLocalMedia, patchCall, scheduleTeardown, socket, stopLocal]);

  const declineCall = useCallback(() => {
    const current = callRef.current;
    if (!current) return;
    socket?.emit('call:decline', { callId: current.id });
    patchCall({ phase: 'declined' });
    scheduleTeardown();
  }, [patchCall, scheduleTeardown, socket]);

  const endCall = useCallback(() => {
    const current = callRef.current;
    if (!current) return;
    if (current.phase === 'incoming' || current.phase === 'ringing') {
      socket?.emit('call:decline', { callId: current.id });
    } else {
      socket?.emit('call:end', { callId: current.id });
    }
    patchCall({ phase: 'ended' });
    scheduleTeardown();
  }, [patchCall, scheduleTeardown, socket]);

  const dismissCall = useCallback(() => {
    if (teardownTimerRef.current) window.clearTimeout(teardownTimerRef.current);
    teardown();
  }, [teardown]);

  const toggleMute = useCallback(() => {
    const stream = localRef.current;
    if (!stream) return;
    const next = !muted;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setMuted(next);
  }, [muted]);

  const toggleCamera = useCallback(() => {
    const stream = localRef.current;
    if (!stream) return;
    const next = !cameraOff;
    stream.getVideoTracks().forEach((track) => {
      track.enabled = !next;
    });
    setCameraOff(next);
  }, [cameraOff]);

  const switchCamera = useCallback(async () => {
    const stream = localRef.current;
    const pc = pcRef.current;
    if (!stream || !pc) return;
    const oldTrack = stream.getVideoTracks()[0];
    if (!oldTrack) return;
    const nextFacing = cameraFacing === 'user' ? 'environment' : 'user';
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextFacing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      const newTrack = nextStream.getVideoTracks()[0];
      if (!newTrack) throw new Error('Could not switch camera');
      const sender = pc.getSenders().find((item) => item.track?.kind === 'video');
      if (sender) await sender.replaceTrack(newTrack);
      stream.removeTrack(oldTrack);
      stream.addTrack(newTrack);
      oldTrack.stop();
      newTrack.enabled = !cameraOff;
      setLocalStream(new MediaStream(stream.getTracks()));
      setCameraFacing(nextFacing);
    } catch {
      error('Could not switch camera on this device.');
    }
  }, [cameraFacing, cameraOff, error]);

  useEffect(() => {
    if (!socket || !user) return;

    const onIncoming = (payload: { call: { id: string; type: CallType }; caller: CallPeer }) => {
      if (callRef.current) {
        socket.emit('call:decline', { callId: payload.call.id });
        return;
      }
      commitCall({
        id: payload.call.id,
        type: payload.call.type,
        peer: payload.caller,
        direction: 'incoming',
        phase: 'incoming',
        startedAt: null,
      });
      info(`${payload.caller.displayName || payload.caller.username} is calling you`);
    };

    const onAccepted = async (payload: { callId: string }) => {
      const current = callRef.current;
      if (!current || current.id !== payload.callId) return;
      const startedAt = current.startedAt ?? Date.now();
      startedAtRef.current = startedAt;
      patchCall({ phase: 'connecting', startedAt });
      try {
        const pc = pcRef.current ?? createPeer(current.id, current.peer.id);
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: current.type === 'video' });
        await pc.setLocalDescription(offer);
        socket.emit('call:offer', { callId: current.id, sdp: pc.localDescription });
      } catch {
        error('Could not start the call connection.');
        socket.emit('call:end', { callId: current.id });
        patchCall({ phase: 'ended' });
        scheduleTeardown();
      }
    };

    const onOffer = async (payload: { callId: string; sdp: RTCSessionDescriptionInit }) => {
      const current = callRef.current;
      if (!current || current.id !== payload.callId) return;
      try {
        const pc = pcRef.current ?? createPeer(current.id, current.peer.id);
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        await flushIce(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('call:answer', { callId: current.id, sdp: pc.localDescription });
      } catch {
        error('Could not answer the call connection.');
        socket.emit('call:end', { callId: current.id });
        patchCall({ phase: 'ended' });
        scheduleTeardown();
      }
    };

    const onAnswer = async (payload: { callId: string; sdp: RTCSessionDescriptionInit }) => {
      const current = callRef.current;
      const pc = pcRef.current;
      if (!current || current.id !== payload.callId || !pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        await flushIce(pc);
      } catch {
        error('The call connection could not be established.');
      }
    };

    const onIce = async (payload: { callId: string; candidate: RTCIceCandidateInit }) => {
      const current = callRef.current;
      if (!current || current.id !== payload.callId || !payload.candidate) return;
      const pc = pcRef.current;
      if (!pc || !pc.remoteDescription) {
        pendingIceRef.current.push(payload.candidate);
        return;
      }
      try {
        await pc.addIceCandidate(payload.candidate);
      } catch {
        // Ignore candidates that arrive after a connection change.
      }
    };

    const onDeclined = (payload: { callId: string }) => {
      const current = callRef.current;
      if (!current || current.id !== payload.callId) return;
      patchCall({ phase: 'declined' });
      scheduleTeardown();
    };

    const onEnded = (payload: { callId: string }) => {
      const current = callRef.current;
      if (!current || current.id !== payload.callId) return;
      patchCall({ phase: 'ended' });
      scheduleTeardown();
    };

    const onTimeout = (payload: { callId: string }) => {
      const current = callRef.current;
      if (!current || current.id !== payload.callId) return;
      const wasIncoming = current.direction === 'incoming' && current.phase === 'incoming';
      patchCall({ phase: current.direction === 'outgoing' || wasIncoming ? 'ended' : current.phase });
      if (current.direction === 'outgoing') info('No answer. Please try again later.');
      scheduleTeardown();
    };

    socket.on('call:incoming', onIncoming);
    socket.on('call:accepted', onAccepted);
    socket.on('call:offer', onOffer);
    socket.on('call:answer', onAnswer);
    socket.on('call:ice', onIce);
    socket.on('call:declined', onDeclined);
    socket.on('call:ended', onEnded);
    socket.on('call:timeout', onTimeout);

    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:accepted', onAccepted);
      socket.off('call:offer', onOffer);
      socket.off('call:answer', onAnswer);
      socket.off('call:ice', onIce);
      socket.off('call:declined', onDeclined);
      socket.off('call:ended', onEnded);
      socket.off('call:timeout', onTimeout);
    };
  }, [commitCall, createPeer, error, flushIce, info, patchCall, scheduleTeardown, socket, user]);

  useEffect(() => {
    return () => {
      if (teardownTimerRef.current) window.clearTimeout(teardownTimerRef.current);
      localRef.current?.getTracks().forEach((track) => track.stop());
      remoteRef.current?.getTracks().forEach((track) => track.stop());
      pcRef.current?.close();
    };
  }, []);

  const value = useMemo<CallContextValue>(
    () => ({
      call,
      localStream,
      remoteStream,
      muted,
      cameraOff,
      inCall: Boolean(call && call.phase !== 'ended' && call.phase !== 'declined'),
      startCall,
      acceptCall,
      declineCall,
      endCall,
      dismissCall,
      toggleMute,
      toggleCamera,
      switchCamera,
    }),
    [
      call,
      localStream,
      remoteStream,
      muted,
      cameraOff,
      startCall,
      acceptCall,
      declineCall,
      endCall,
      dismissCall,
      toggleMute,
      toggleCamera,
      switchCamera,
    ]
  );

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used inside CallProvider');
  return ctx;
}
