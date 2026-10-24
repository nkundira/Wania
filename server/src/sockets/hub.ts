import type { Server } from 'socket.io';

let io: Server | null = null;
export const onlineUsers = new Map<string, Set<string>>();

export function setIo(server: Server) {
  io = server;
}

export function getIo() {
  return io;
}

export function addOnline(userId: string, socketId: string) {
  const set = onlineUsers.get(userId) ?? new Set<string>();
  set.add(socketId);
  onlineUsers.set(userId, set);
}

export function removeOnline(userId: string, socketId: string) {
  const set = onlineUsers.get(userId);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) onlineUsers.delete(userId);
}

export function isOnline(userId: string) {
  return onlineUsers.has(userId);
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload);
}

export function emitToConversation(conversationId: string, event: string, payload: unknown) {
  io?.to(`conv:${conversationId}`).emit(event, payload);
}

export function emitToAll(event: string, payload: unknown) {
  io?.emit(event, payload);
}
