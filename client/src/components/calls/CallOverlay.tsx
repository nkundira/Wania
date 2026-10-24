import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Mic, MicOff, Phone, PhoneOff, SwitchCamera, Video, VideoOff } from 'lucide-react';
import { useCall } from '../../contexts/CallContext';
import { cn, formatDuration } from '../../utils/format';
import { Avatar } from '../Avatar';

function useCallTimer(startedAt: number | null, active: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active || !startedAt) {
      setSeconds(0);
      return;
    }
    const update = () => setSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [startedAt, active]);
  return seconds;
}

export function CallOverlay() {
  const { call, localStream, remoteStream, muted, cameraOff, acceptCall, declineCall, endCall, dismissCall, toggleMute, toggleCamera, switchCamera } = useCall();
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const seconds = useCallTimer(call?.startedAt ?? null, call?.phase === 'active');

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
    if (remoteAudioRef.current && remoteStream) remoteAudioRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  useEffect(() => {
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  if (!call) return null;

  const incoming = call.phase === 'incoming';
  const finished = call.phase === 'ended' || call.phase === 'declined';
  const connecting = call.phase === 'ringing' || call.phase === 'connecting';
  const isVideo = call.type === 'video';

  const status = incoming
    ? `Incoming ${call.type} call`
    : call.phase === 'ringing'
      ? 'Calling…'
      : call.phase === 'connecting'
        ? 'Connecting…'
        : call.phase === 'active'
          ? formatDuration(seconds)
          : call.phase === 'declined'
            ? 'Call declined'
            : 'Call ended';

  return createPortal(
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-ink-950">
      {isVideo && !finished ? (
        <>
          <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 h-full w-full object-cover" />
          {!remoteStream && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-ink-900 via-ink-950 to-grape-950/40">
              <div className="flex flex-col items-center gap-4">
                <Avatar user={call.peer} size={120} />
                {connecting && <span className="text-lg font-semibold text-white">{call.peer.displayName}</span>}
              </div>
            </div>
          )}
          <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/75 to-transparent px-5 pb-12 pt-5">
            <p className="text-center font-display text-lg font-bold text-white">{call.peer.displayName}</p>
            <p className="mt-0.5 text-center text-xs font-medium text-white/70">{status}</p>
          </div>
          {localStream && (
            <div className="absolute right-4 top-20 h-40 w-28 overflow-hidden rounded-xl border border-white/20 bg-black shadow-xl sm:h-44 sm:w-32">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className={cn('h-full w-full object-cover', !cameraOff && 'scale-x-[-1]')}
              />
              {cameraOff && (
                <div className="absolute inset-0 flex items-center justify-center bg-ink-900">
                  <VideoOff className="h-6 w-6 text-zinc-500" />
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-5 px-6 text-center">
          <div className="relative">
            {connecting && !finished && (
              <>
                <span className="absolute inset-0 animate-ping rounded-full bg-grape-500/25" />
                <span className="absolute inset-[-14px] animate-pulse rounded-full border border-grape-400/20" />
              </>
            )}
            <Avatar user={call.peer} size={116} />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-white">{call.peer.displayName}</h2>
            <p className="mt-1 text-sm text-zinc-400">@{call.peer.username}</p>
            <p className={cn('mt-4 text-sm font-medium', call.phase === 'active' ? 'text-emerald-400' : 'text-zinc-400')}>{status}</p>
          </div>
        </div>
      )}

      <audio ref={remoteAudioRef} autoPlay className="hidden" />

      {!finished && (
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-6 bg-gradient-to-t from-black/85 to-transparent pb-[max(2rem,env(safe-area-inset-bottom))] pt-16">
          {incoming ? (
            <div className="flex items-center gap-12">
              <button
                onClick={declineCall}
                className="flex flex-col items-center gap-2 text-[11px] font-medium text-zinc-300"
                aria-label="Decline call"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg transition active:scale-95">
                  <PhoneOff className="h-6 w-6" />
                </span>
                Decline
              </button>
              <button
                onClick={() => void acceptCall()}
                className="flex flex-col items-center gap-2 text-[11px] font-medium text-zinc-300"
                aria-label="Accept call"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg transition active:scale-95">
                  <Phone className="h-6 w-6" />
                </span>
                Accept
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <ControlButton active={muted} onClick={toggleMute} label={muted ? 'Unmute' : 'Mute'}>
                {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </ControlButton>
              {isVideo && (
                <>
                  <ControlButton active={cameraOff} onClick={toggleCamera} label={cameraOff ? 'Turn camera on' : 'Turn camera off'}>
                    {cameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                  </ControlButton>
                  <ControlButton onClick={() => void switchCamera()} label="Switch camera">
                    <SwitchCamera className="h-5 w-5" />
                  </ControlButton>
                </>
              )}
              <button
                onClick={endCall}
                className="ml-1 flex h-14 w-14 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg transition hover:bg-rose-500 active:scale-95"
                aria-label="End call"
              >
                <PhoneOff className="h-6 w-6" />
              </button>
            </div>
          )}
        </div>
      )}

      {finished && (
        <div className="absolute inset-x-0 bottom-0 flex justify-center pb-[max(2.5rem,env(safe-area-inset-bottom))]">
          <button className="btn-secondary px-6" onClick={dismissCall}>
            Close
          </button>
        </div>
      )}
    </div>,
    document.body
  );
}

function ControlButton({
  children,
  onClick,
  label,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        'flex h-12 w-12 items-center justify-center rounded-full border transition active:scale-95',
        active ? 'border-white/30 bg-white text-ink-950' : 'border-white/15 bg-white/10 text-white hover:bg-white/20'
      )}
    >
      {children}
    </button>
  );
}
