import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Camera, CheckCheck, Heart, MessageCircle, Phone, UserPlus } from 'lucide-react';
import { getErrorMessage } from '../lib/api';
import { notificationsApi, usersApi } from '../services/wania';
import type { Notification } from '../types';
import { useSocket } from '../contexts/SocketContext';
import { useToast } from '../contexts/ToastContext';
import { cn, timeAgo } from '../utils/format';
import { Avatar } from '../components/Avatar';
import { EmptyState, ErrorState, PageHeader, Spinner } from '../components/ui';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'follow', label: 'Follows' },
  { value: 'like', label: 'Likes' },
  { value: 'comment', label: 'Comments' },
  { value: 'message', label: 'Messages' },
  { value: 'call', label: 'Calls' },
] as const;

type Filter = (typeof FILTERS)[number]['value'];

const ICONS = {
  follow: UserPlus,
  follow_request: UserPlus,
  follow_accepted: UserPlus,
  like: Heart,
  comment: MessageCircle,
  mention: MessageCircle,
  story_reply: Camera,
  story_reaction: Camera,
  message: MessageCircle,
  call: Phone,
} as const;

function notificationText(notification: Notification) {
  const name = notification.actor?.displayName || 'Someone';
  switch (notification.type) {
    case 'follow':
      return <><span className="font-semibold text-white">{name}</span> started following you.</>;
    case 'follow_request':
      return <><span className="font-semibold text-white">{name}</span> requested to follow you.</>;
    case 'follow_accepted':
      return <><span className="font-semibold text-white">{name}</span> accepted your follow request.</>;
    case 'like':
      return <><span className="font-semibold text-white">{name}</span> liked your post.</>;
    case 'comment':
      return <><span className="font-semibold text-white">{name}</span> commented: “{String(notification.data.preview ?? '')}”</>;
    case 'mention':
      return <><span className="font-semibold text-white">{name}</span> mentioned you.</>;
    case 'story_reply':
      return <><span className="font-semibold text-white">{name}</span> replied to your story{notification.data.preview ? `: “${notification.data.preview}”` : '.'}</>;
    case 'story_reaction':
      return <><span className="font-semibold text-white">{name}</span> reacted to your story.</>;
    case 'message':
      return <><span className="font-semibold text-white">{name}</span> sent you a message{notification.data.preview ? `: “${notification.data.preview}”` : '.'}</>;
    case 'call':
      return <><span className="font-semibold text-white">{name}</span> gave you a {String(notification.data.callType ?? '')} call.</>;
    default:
      return <>You have a new notification.</>;
  }
}

function destination(notification: Notification) {
  if (['follow', 'follow_request', 'follow_accepted'].includes(notification.type)) {
    return notification.actor ? `/u/${notification.actor.username}` : null;
  }
  if (['like', 'comment', 'mention'].includes(notification.type)) return notification.entityId ? `/post/${notification.entityId}` : null;
  if (['story_reply', 'story_reaction'].includes(notification.type)) return notification.actor ? `/u/${notification.actor.username}` : null;
  if (notification.type === 'message') return notification.entityId ? `/messages/${notification.entityId}` : '/messages';
  if (notification.type === 'call') return '/calls';
  return null;
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const { socket, setUnread } = useSocket();
  const { error, success } = useToast();
  const [items, setItems] = useState<Notification[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    notificationsApi
      .list()
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setCursor(data.nextCursor);
        setUnread(data.unread);
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
  }, [setUnread]);

  useEffect(() => {
    if (!socket) return;
    const onNew = (notification: Notification) => {
      setItems((current) => (current.some((item) => item.id === notification.id) ? current : [notification, ...current]));
    };
    socket.on('notification:new', onNew);
    return () => {
      socket.off('notification:new', onNew);
    };
  }, [socket]);

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    if (filter === 'follow') return items.filter((item) => item.type.startsWith('follow'));
    return items.filter((item) => item.type.startsWith(filter));
  }, [items, filter]);

  async function markAllRead() {
    try {
      const unread = await notificationsApi.read();
      setUnread(unread);
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
      success('All caught up');
    } catch (err) {
      error(getErrorMessage(err));
    }
  }

  async function openNotification(notification: Notification) {
    if (!notification.readAt) {
      try {
        const unread = await notificationsApi.read(notification.id);
        setUnread(unread);
        setItems((current) => current.map((item) => (item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item)));
      } catch {
        // Navigation should not be blocked by a read receipt failure.
      }
    }
    const to = destination(notification);
    if (to) navigate(to);
  }

  async function respond(notification: Notification, action: 'accept' | 'decline') {
    if (!notification.actor) return;
    setActing(notification.id);
    try {
      await usersApi.respondRequest(notification.actor.id, action);
      success(action === 'accept' ? 'Follow request accepted' : 'Follow request declined');
      setItems((current) => current.filter((item) => item.id !== notification.id));
    } catch (err) {
      error(getErrorMessage(err));
    } finally {
      setActing(null);
    }
  }

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await notificationsApi.list(cursor);
      setItems((current) => [...current, ...data.items.filter((item) => !current.some((entry) => entry.id === item.id))]);
      setCursor(data.nextCursor);
      setUnread(data.unread);
    } catch (err) {
      error(getErrorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Notifications"
        subtitle="What’s happened in your world."
        action={
          <button className="btn-secondary text-xs" onClick={() => void markAllRead()} disabled={!items.some((item) => !item.readAt)}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
        }
      />

      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((item) => (
          <button key={item.value} onClick={() => setFilter(item.value)} className={cn('chip shrink-0', filter === item.value && 'chip-active')}>
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card divide-y divide-white/[0.05]">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 p-4">
              <div className="skeleton h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3 w-2/3" />
                <div className="skeleton h-2.5 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div className="card">
          <ErrorState message={loadError} onRetry={() => window.location.reload()} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Bell}
            title={filter === 'all' ? 'Nothing new yet' : 'Nothing here yet'}
            description={filter === 'all' ? 'Follows, likes, comments and messages will show up here.' : 'Try another filter or come back later.'}
          />
        </div>
      ) : (
        <div className="card divide-y divide-white/[0.05] overflow-hidden">
          {filtered.map((notification) => {
            const Icon = ICONS[notification.type] ?? Bell;
            const iconTone =
              notification.type.startsWith('follow')
                ? 'bg-emerald-500/15 text-emerald-300'
                : notification.type.startsWith('like')
                  ? 'bg-rose-500/15 text-rose-300'
                  : notification.type.startsWith('call')
                    ? 'bg-sky-500/15 text-sky-300'
                    : notification.type.startsWith('story')
                      ? 'bg-amber-500/15 text-amber-300'
                      : 'bg-grape-500/15 text-grape-300';
            return (
              <div
                key={notification.id}
                className={cn('flex items-start gap-3 p-3.5 transition hover:bg-white/[0.02]', !notification.readAt && 'bg-grape-600/[0.06]')}
              >
                <button onClick={() => void openNotification(notification)} className="relative shrink-0" aria-label="Open notification">
                  {notification.actor ? (
                    <Avatar user={notification.actor} size={40} />
                  ) : (
                    <span className={cn('flex h-10 w-10 items-center justify-center rounded-full', iconTone)}>
                      <Icon className="h-5 w-5" />
                    </span>
                  )}
                  <span className={cn('absolute -bottom-1 -right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-ink-850', iconTone)}>
                    <Icon className="h-2.5 w-2.5" />
                  </span>
                </button>
                <button onClick={() => void openNotification(notification)} className="min-w-0 flex-1 text-left">
                  <p className="text-sm leading-snug text-zinc-300">{notificationText(notification)}</p>
                  <p className="mt-1 text-[11px] text-zinc-600">
                    {timeAgo(notification.createdAt)}
                    {!notification.readAt && <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-grape-400 align-middle" />}
                  </p>
                  {notification.type === 'follow_request' && notification.actor && (
                    <div className="mt-2 flex gap-2" onClick={(event) => event.stopPropagation()}>
                      <button
                        className="btn-primary px-3 py-1.5 text-xs"
                        onClick={() => void respond(notification, 'accept')}
                        disabled={acting === notification.id}
                      >
                        Accept
                      </button>
                      <button
                        className="btn-secondary px-3 py-1.5 text-xs"
                        onClick={() => void respond(notification, 'decline')}
                        disabled={acting === notification.id}
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </button>
                <Link to={notification.actor ? `/u/${notification.actor.username}` : '#'} className="shrink-0">
                  {notification.actor ? <Avatar user={notification.actor} size={34} /> : null}
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {cursor && (
        <div className="mt-4 flex justify-center">
          <button className="btn-secondary" onClick={() => void loadMore()} disabled={loadingMore}>
            {loadingMore && <Spinner className="h-4 w-4" />}
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
