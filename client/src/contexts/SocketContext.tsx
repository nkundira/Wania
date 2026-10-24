import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { socketBaseUrl } from '../lib/api';
import { notificationsApi } from '../services/wania';
import type { Notification } from '../types';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

type SocketContextValue = {
  socket: Socket | null;
  connected: boolean;
  unread: number;
  setUnread: (value: number) => void;
  refreshUnread: () => Promise<void>;
};

const SocketContext = createContext<SocketContextValue | null>(null);

function notificationText(notification: Notification) {
  const actor = notification.actor?.displayName || notification.actor?.username || 'Someone';
  switch (notification.type) {
    case 'follow':
      return `${actor} started following you`;
    case 'follow_request':
      return `${actor} requested to follow you`;
    case 'follow_accepted':
      return `${actor} accepted your follow request`;
    case 'like':
      return `${actor} liked your post`;
    case 'comment':
      return `${actor} commented on your post`;
    case 'mention':
      return `${actor} mentioned you`;
    case 'story_reply':
      return `${actor} replied to your story`;
    case 'story_reaction':
      return `${actor} reacted to your story`;
    case 'message':
      return `New message from ${actor}`;
    case 'call':
      return `Missed ${String(notification.data?.callType || '')} call from ${actor}`.trim();
    default:
      return 'New notification';
  }
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const { info } = useToast();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [unread, setUnread] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user?.id]);

  const refreshUnread = useCallback(async () => {
    if (!userIdRef.current) {
      setUnread(0);
      return;
    }
    try {
      setUnread(await notificationsApi.unread());
    } catch {
      // Badge counts are non-critical.
    }
  }, []);

  useEffect(() => {
    if (!user || !token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
      setUnread(0);
      return;
    }

    const instance = io(socketBaseUrl(), {
      auth: { token },
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 12,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
    });
    socketRef.current = instance;
    setSocket(instance);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onNotification = (notification: Notification) => {
      setUnread((current) => current + 1);
      info(notificationText(notification));
    };

    instance.on('connect', onConnect);
    instance.on('disconnect', onDisconnect);
    instance.on('notification:new', onNotification);

    return () => {
      instance.off('connect', onConnect);
      instance.off('disconnect', onDisconnect);
      instance.off('notification:new', onNotification);
      instance.disconnect();
      if (socketRef.current === instance) {
        socketRef.current = null;
        setSocket(null);
      }
    };
  }, [user?.id, info]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onRefreshed = (event: Event) => {
      const nextToken = (event as CustomEvent<{ accessToken: string }>).detail?.accessToken;
      if (nextToken && socketRef.current) {
        socketRef.current.auth = { token: nextToken };
        if (!socketRef.current.connected) socketRef.current.connect();
      }
    };
    window.addEventListener('wania:session-refreshed', onRefreshed);
    return () => window.removeEventListener('wania:session-refreshed', onRefreshed);
  }, []);

  useEffect(() => {
    if (user) void refreshUnread();
  }, [user?.id, refreshUnread]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo(
    () => ({ socket, connected, unread, setUnread, refreshUnread }),
    [socket, connected, unread, refreshUnread]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside SocketProvider');
  return ctx;
}
