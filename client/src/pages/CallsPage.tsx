import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, Phone, PhoneCall, PhoneIncoming, PhoneMissed, Video } from 'lucide-react';
import { getErrorMessage } from '../lib/api';
import { messagesApi } from '../services/wania';
import type { CallRecord } from '../types';
import { useCall } from '../contexts/CallContext';
import { useSocket } from '../contexts/SocketContext';
import { useToast } from '../contexts/ToastContext';
import { cn, fullDate, timeAgo } from '../utils/format';
import { Avatar } from '../components/Avatar';
import { EmptyState, ErrorState, PageHeader, Spinner } from '../components/ui';

function statusLabel(call: CallRecord) {
  if (call.status === 'missed') return 'Missed';
  if (call.status === 'declined') return 'Declined';
  if (call.status === 'ringing') return 'Ringing';
  if (call.answeredAt && call.durationSeconds != null) {
    const minutes = Math.floor(call.durationSeconds / 60);
    const seconds = call.durationSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }
  return call.direction === 'incoming' ? 'Incoming' : 'Outgoing';
}

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return fullDate(iso);
}

export function CallsPage() {
  const { startCall } = useCall();
  const { socket } = useSocket();
  const { error } = useToast();
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState<'all' | 'missed'>('all');
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    messagesApi
      .callHistory()
      .then((data) => {
        if (!cancelled) setCalls(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => {
      messagesApi.callHistory().then(setCalls).catch(() => undefined);
    };
    socket.on('call:ended', refresh);
    socket.on('call:declined', refresh);
    socket.on('call:timeout', refresh);
    return () => {
      socket.off('call:ended', refresh);
      socket.off('call:declined', refresh);
      socket.off('call:timeout', refresh);
    };
  }, [socket]);

  const filtered = useMemo(
    () => (filter === 'missed' ? calls.filter((call) => call.status === 'missed' || call.status === 'declined') : calls),
    [calls, filter]
  );

  const grouped = useMemo(() => {
    const groups: { label: string; calls: CallRecord[] }[] = [];
    for (const call of filtered) {
      const label = dayLabel(call.startedAt);
      const last = groups[groups.length - 1];
      if (last?.label === label) last.calls.push(call);
      else groups.push({ label, calls: [call] });
    }
    return groups;
  }, [filtered]);

  async function callBack(call: CallRecord, type: 'audio' | 'video') {
    setStarting(call.id);
    try {
      await startCall(call.peer, type);
    } catch (err) {
      error(getErrorMessage(err));
    } finally {
      setStarting(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Calls" subtitle="Your call history, ready when you are." />

      <div className="mb-4 flex gap-2">
        <button className={cn('chip', filter === 'all' && 'chip-active')} onClick={() => setFilter('all')}>
          All calls
        </button>
        <button className={cn('chip', filter === 'missed' && 'chip-active')} onClick={() => setFilter('missed')}>
          Missed
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-7 w-7 text-grape-400" />
        </div>
      ) : loadError ? (
        <div className="card">
          <ErrorState message={loadError} onRetry={() => window.location.reload()} />
        </div>
      ) : !filtered.length ? (
        <div className="card">
          <EmptyState
            icon={filter === 'missed' ? PhoneMissed : PhoneCall}
            title={filter === 'missed' ? 'No missed calls' : 'No calls yet'}
            description={
              filter === 'missed'
                ? 'You haven’t missed anything. Nice.'
                : 'Start an audio or video call from a chat or from someone’s profile.'
            }
          />
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <section key={group.label}>
              <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-zinc-500">{group.label}</h2>
              <div className="card divide-y divide-white/[0.05] overflow-hidden">
                {group.calls.map((call) => {
                  const missed = call.status === 'missed' || call.status === 'declined';
                  const Direction = call.direction === 'incoming' ? ArrowDownLeft : ArrowUpRight;
                  return (
                    <div key={call.id} className="flex items-center gap-3 p-3.5">
                      <div className="relative shrink-0">
                        <Link to={`/u/${call.peer.username}`}>
                          <Avatar user={call.peer} size={44} />
                        </Link>
                        <span
                          className={cn(
                            'absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-ink-850',
                            missed ? 'bg-rose-500/90 text-white' : 'bg-emerald-500/90 text-white'
                          )}
                        >
                          {missed ? <PhoneMissed className="h-2.5 w-2.5" /> : <Direction className="h-2.5 w-2.5" />}
                        </span>
                      </div>
                      <Link to={`/u/${call.peer.username}`} className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{call.peer.displayName}</p>
                        <p className={cn('mt-0.5 flex items-center gap-1 text-xs', missed ? 'text-rose-300' : 'text-zinc-500')}>
                          {call.type === 'video' ? <Video className="h-3 w-3" /> : <PhoneIncoming className="h-3 w-3" />}
                          {statusLabel(call)}
                          <span className="text-zinc-600">·</span>
                          <span className="text-zinc-600">{timeAgo(call.startedAt)}</span>
                        </p>
                      </Link>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => void callBack(call, 'audio')}
                          disabled={starting === call.id}
                          className="icon-btn text-emerald-300 hover:bg-emerald-500/10"
                          aria-label={`Call ${call.peer.displayName}`}
                        >
                          <Phone className="h-[18px] w-[18px]" />
                        </button>
                        <button
                          onClick={() => void callBack(call, 'video')}
                          disabled={starting === call.id}
                          className="icon-btn text-grape-300 hover:bg-grape-500/10"
                          aria-label={`Video call ${call.peer.displayName}`}
                        >
                          <Video className="h-[18px] w-[18px]" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
