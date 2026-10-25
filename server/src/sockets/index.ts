import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { isAllowedOrigin } from '../config/origins.js';
import { query } from '../db/pool.js';
import { assertConversationMember, getConversationMember, isBlocked } from '../services/access.service.js';
import { acceptCall, createCall, declineCall, endCall, getCall, markMissed } from '../services/calls.service.js';
import { insertMessage, markAllDelivered, markConversationRead } from '../services/messages.service.js';
import { signMediaUrl } from '../services/media.service.js';
import { addOnline, emitToUser, onlineUsers, removeOnline, setIo } from './hub.js';

type SocketUser = { id: string; username: string; displayName: string; avatarMediaId: string | null };

const messageTimestamps = new Map<string, number[]>();

function rateLimited(socketId: string, max = 30, windowMs = 10_000) {
  const now = Date.now();
  const list = (messageTimestamps.get(socketId) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  messageTimestamps.set(socketId, list);
  return list.length > max;
}

async function notifyPresence(userId: string, online: boolean) {
  const { rows } = await query(
    `SELECT DISTINCT cm2.user_id
     FROM conversation_members cm1
     JOIN conversation_members cm2 ON cm2.conversation_id=cm1.conversation_id
     WHERE cm1.user_id=$1 AND cm2.user_id<>$1`,
    [userId]
  );
  for (const row of rows) emitToUser(row.user_id, 'presence:update', { userId, online });
  emitToUser(userId, 'presence:update', { userId, online });
}

export function initSockets(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin(origin, cb) {
        if (!origin || isAllowedOrigin(origin)) return cb(null, true);
        cb(new Error('Not allowed by CORS'));
      },
      credentials: true,
    },
    maxHttpBufferSize: 1e6,
  });
  setIo(io);

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (typeof socket.handshake.headers.authorization === 'string'
          ? socket.handshake.headers.authorization.replace('Bearer ', '')
          : null);
      if (!token) return next(new Error('UNAUTHORIZED'));
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string; typ: string };
      if (payload.typ !== 'access') return next(new Error('UNAUTHORIZED'));
      const { rows } = await query(
        `SELECT u.id, u.username, p.display_name, p.avatar_media_id
         FROM users u JOIN profiles p ON p.user_id=u.id
         WHERE u.id=$1 AND u.is_active=true`,
        [payload.sub]
      );
      if (!rows[0]) return next(new Error('UNAUTHORIZED'));
      socket.data.user = {
        id: rows[0].id,
        username: rows[0].username,
        displayName: rows[0].display_name,
        avatarMediaId: rows[0].avatar_media_id,
      } satisfies SocketUser;
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.data.user as SocketUser;
    socket.join(`user:${user.id}`);
    addOnline(user.id, socket.id);
    await query(`UPDATE users SET last_seen_at=now() WHERE id=$1`, [user.id]);
    await markAllDelivered(user.id);
    notifyPresence(user.id, true);
    socket.emit('ready', { userId: user.id });

    socket.on('conversation:join', async (payload, ack) => {
      try {
        const conversationId = String(payload?.conversationId ?? '');
        await assertConversationMember(conversationId, user.id);
        socket.join(`conv:${conversationId}`);
        await markConversationRead(user.id, conversationId);
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: (err as Error).message });
      }
    });

    socket.on('conversation:leave', (payload) => {
      const conversationId = String(payload?.conversationId ?? '');
      socket.leave(`conv:${conversationId}`);
    });

    socket.on('typing:start', async (payload) => {
      try {
        const conversationId = String(payload?.conversationId ?? '');
        const member = await getConversationMember(conversationId, user.id);
        if (!member) return;
        socket.to(`conv:${conversationId}`).emit('typing:start', {
          conversationId,
          user: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarMediaId ? signMediaUrl(user.avatarMediaId, user.id) : null,
          },
        });
      } catch {
        /* ignore */
      }
    });

    socket.on('typing:stop', async (payload) => {
      const conversationId = String(payload?.conversationId ?? '');
      const member = await getConversationMember(conversationId, user.id).catch(() => null);
      if (!member) return;
      socket.to(`conv:${conversationId}`).emit('typing:stop', { conversationId, userId: user.id });
    });

    socket.on('message:send', async (payload, ack) => {
      try {
        if (rateLimited(socket.id)) throw new Error('You are sending messages too quickly');
        const conversationId = String(payload?.conversationId ?? '');
        const message = await insertMessage({
          conversationId,
          senderId: user.id,
          body: typeof payload?.body === 'string' ? payload.body.slice(0, 4000) : '',
          kind: typeof payload?.kind === 'string' ? payload.kind : undefined,
          attachmentIds: Array.isArray(payload?.attachmentIds)
            ? payload.attachmentIds.map(String).slice(0, 4)
            : undefined,
          replyToId: payload?.replyToId ? String(payload.replyToId) : undefined,
          expiresAt: payload?.expiresAt ? String(payload.expiresAt) : null,
        });
        ack?.({ ok: true, message });
      } catch (err) {
        ack?.({ ok: false, error: (err as Error).message });
      }
    });

    socket.on('message:read', async (payload, ack) => {
      try {
        await markConversationRead(user.id, String(payload?.conversationId ?? ''));
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: (err as Error).message });
      }
    });

    socket.on('call:invite', async (payload, ack) => {
      try {
        const calleeId = String(payload?.calleeId ?? '');
        const type = payload?.type === 'video' ? 'video' : 'audio';
        if (await isBlocked(user.id, calleeId)) throw new Error('Calling is unavailable');
        const call = await createCall(user.id, calleeId, type, payload?.conversationId);
        emitToUser(calleeId, 'call:incoming', {
          call: { id: call.id, type: call.type, status: call.status, startedAt: call.started_at },
          caller: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarMediaId ? signMediaUrl(user.avatarMediaId, calleeId) : null,
          },
        });
        const timeout = setTimeout(async () => {
          const missed = await markMissed(call.id);
          if (missed) {
            emitToUser(calleeId, 'call:timeout', { callId: call.id });
            emitToUser(user.id, 'call:timeout', { callId: call.id });
          }
        }, 45_000);
        callTimeouts.set(call.id, timeout);
        ack?.({ ok: true, call });
      } catch (err) {
        ack?.({ ok: false, error: (err as Error).message });
      }
    });

    socket.on('call:accept', async (payload, ack) => {
      try {
        const call = await acceptCall(String(payload?.callId ?? ''), user.id);
        clearTimeout(callTimeouts.get(call.id));
        callTimeouts.delete(call.id);
        emitToUser(call.caller_id, 'call:accepted', { callId: call.id });
        ack?.({ ok: true, call });
      } catch (err) {
        ack?.({ ok: false, error: (err as Error).message });
      }
    });

    socket.on('call:decline', async (payload, ack) => {
      try {
        const call = await declineCall(String(payload?.callId ?? ''), user.id);
        if (call) {
          clearTimeout(callTimeouts.get(call.id));
          callTimeouts.delete(call.id);
          const other = call.caller_id === user.id ? call.callee_id : call.caller_id;
          emitToUser(other, 'call:declined', { callId: call.id });
        }
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: (err as Error).message });
      }
    });

    socket.on('call:end', async (payload, ack) => {
      try {
        const callId = String(payload?.callId ?? '');
        const call = await getCall(callId);
        if (call && (call.caller_id === user.id || call.callee_id === user.id)) {
          const ended = await endCall(callId, user.id);
          const other = call.caller_id === user.id ? call.callee_id : call.caller_id;
          emitToUser(other, 'call:ended', { callId, durationSeconds: ended?.duration_seconds ?? 0 });
        }
        callTimeouts.delete(callId);
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: (err as Error).message });
      }
    });

    const relay = (event: string) => async (payload: any) => {
      try {
        const call = await getCall(String(payload?.callId ?? ''));
        if (!call) return;
        if (call.caller_id !== user.id && call.callee_id !== user.id) return;
        if (call.status !== 'accepted' && event !== 'call:ice') return;
        const other = call.caller_id === user.id ? call.callee_id : call.caller_id;
        emitToUser(other, event, { ...payload, from: user.id });
      } catch {
        /* ignore */
      }
    };
    socket.on('call:offer', relay('call:offer'));
    socket.on('call:answer', relay('call:answer'));
    socket.on('call:ice', relay('call:ice'));

    socket.on('disconnect', async () => {
      removeOnline(user.id, socket.id);
      messageTimestamps.delete(socket.id);
      await query(`UPDATE users SET last_seen_at=now() WHERE id=$1`, [user.id]);
      if (!onlineUsers.has(user.id)) notifyPresence(user.id, false);
    });
  });

  return io;
}

const callTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
