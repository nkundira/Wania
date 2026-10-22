import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const handlersRef = useRef(new Map());
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState([]);

  const attachAll = useCallback((s) => {
    for (const [event, handlers] of handlersRef.current) {
      for (const handler of handlers) s.on(event, handler);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
      setSocket(null);
      setConnected(false);
      setOnlineUserIds([]);
      return;
    }
    // Fall back to the API host when VITE_SOCKET_URL is unset, so a single
    // VITE_API_URL is enough to point both REST and realtime at the backend.
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const socketUrl = import.meta.env.VITE_SOCKET_URL || apiUrl.replace(/\/api\/?$/, '') || '/';
    const s = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('presence:online', ({ onlineUserIds }) => setOnlineUserIds(onlineUserIds));

    socketRef.current = s;
    setSocket(s);
    attachAll(s);

    return () => { s.disconnect(); socketRef.current = null; setSocket(null); setConnected(false); };
  }, [user?.id, attachAll]);

  const emit = useCallback((event, data, ack) => {
    if (socketRef.current?.connected) socketRef.current.emit(event, data, ack);
  }, []);

  const on = useCallback((event, handler) => {
    if (!handlersRef.current.has(event)) handlersRef.current.set(event, new Set());
    handlersRef.current.get(event).add(handler);
    socketRef.current?.on(event, handler);
    return () => {
      handlersRef.current.get(event)?.delete(handler);
      socketRef.current?.off(event, handler);
    };
  }, []);

  const joinRoom = useCallback((room) => emit('chat:join', room), [emit]);
  const leaveRoom = useCallback((room) => emit('chat:leave', room), [emit]);

  return (
    <SocketContext.Provider value={{ socket, connected, onlineUserIds, emit, on, joinRoom, leaveRoom }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
