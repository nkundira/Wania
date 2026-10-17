import jwt from 'jsonwebtoken';
import { query, queryOne, execute } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const onlineUsers = new Map(); // userId -> Set(socketIds)
const activeCalls = new Map(); // callId -> callState

function getOnlineUsers() {
  return [...onlineUsers.keys()];
}

function emitToUser(userId, event, data) {
  const sockets = onlineUsers.get(parseInt(userId));
  if (sockets) {
    for (const sid of sockets) {
      global.io.to(sid).emit(event, data);
    }
  }
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

export function setupSocket(io) {
  global.io = io;

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || parseCookies(socket.handshake.headers?.cookie)?.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await queryOne('SELECT id, username, display_name, profile_picture FROM users WHERE id = ?', [decoded.id]);
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user.id;
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);
    await execute('UPDATE users SET is_online = 1, last_seen = NOW() WHERE id = ?', [userId]);
    io.emit('presence:update', { userId, isOnline: true });
    io.emit('presence:online', { onlineUserIds: getOnlineUsers() });

    // Auto-join all of the user's conversation rooms so messages are never
    // missed due to the client's join round-trip racing an incoming message.
    const memberships = await query(
      'SELECT conversation_id FROM conversation_participants WHERE user_id = ?',
      [userId]
    );
    for (const m of memberships) socket.join(`conv:${m.conversation_id}`);

    socket.on('chat:join', (conversationId) => {
      socket.join(`conv:${conversationId}`);
    });

    socket.on('chat:leave', (conversationId) => {
      socket.leave(`conv:${conversationId}`);
    });

    socket.on('chat:message', async (data, ack) => {
      try {
        const { conversationId, content, messageType = 'text', imageUrl } = data;
        const participant = await queryOne(
          'SELECT id FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
          [conversationId, userId]
        );
        if (!participant) return ack?.({ error: 'Not a participant' });
        if (!content?.trim() && !imageUrl) return ack?.({ error: 'Empty message' });
        const result = await execute(
          'INSERT INTO messages (conversation_id, sender_id, content, message_type, image_url) VALUES (?, ?, ?, ?, ?)',
          [conversationId, userId, content || '', messageType, imageUrl || null]
        );
        await execute('UPDATE conversations SET updated_at = NOW() WHERE id = ?', [conversationId]);
        const message = await queryOne(
          'SELECT m.*, u.username as sender_username, u.display_name as sender_name, u.profile_picture as sender_picture FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?',
          [result.insertId]
        );
        io.to(`conv:${conversationId}`).emit('chat:message', message);
        // Notify other participants
        const others = await queryOne(
          'SELECT user_id FROM conversation_participants WHERE conversation_id = ? AND user_id != ?',
          [conversationId, userId]
        );
        const othersAll = await queryOne(
          'SELECT GROUP_CONCAT(user_id) as ids FROM conversation_participants WHERE conversation_id = ? AND user_id != ?',
          [conversationId, userId]
        );
        if (othersAll?.ids) {
          for (const uid of othersAll.ids.split(',')) {
            emitToUser(parseInt(uid), 'chat:notify', { conversationId, message });
          }
        }
        ack?.({ ok: true, message });
      } catch (err) {
        console.error('chat:message error:', err.message);
        ack?.({ error: 'Failed to send' });
      }
    });

    socket.on('chat:typing', ({ conversationId, isTyping }) => {
      socket.to(`conv:${conversationId}`).emit('chat:typing', { conversationId, userId, isTyping, username: socket.user.username });
    });

    // ---- CALL SIGNALING ----
    socket.on('call:initiate', async (data, ack) => {
      try {
        const { calleeId, callType } = data; // callType: 'audio' | 'video'
        if (!calleeId || parseInt(calleeId) === userId) return ack?.({ error: 'Invalid callee' });
        const callee = await queryOne('SELECT id, username, display_name, profile_picture FROM users WHERE id = ?', [calleeId]);
        if (!callee) return ack?.({ error: 'User not found' });
        const blocked = await queryOne(
          'SELECT id FROM blocked_users WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)',
          [calleeId, userId, userId, calleeId]
        );
        if (blocked) return ack?.({ error: 'Cannot call this user' });
        // Check if callee is online
        const calleeSockets = onlineUsers.get(parseInt(calleeId));
        if (!calleeSockets || calleeSockets.size === 0) {
          const result = await execute(
            'INSERT INTO call_records (caller_id, callee_id, call_type, status) VALUES (?, ?, ?, "missed")',
            [userId, calleeId, callType]
          );
          return ack?.({ error: 'User is offline', callRecordId: result.insertId });
        }
        const callId = `call_${Date.now()}_${userId}_${calleeId}`;
        activeCalls.set(callId, {
          callId, callerId: userId, calleeId: parseInt(calleeId),
          callType, state: 'ringing', startedAt: new Date()
        });
        emitToUser(calleeId, 'call:incoming', {
          callId,
          caller: { id: socket.user.id, username: socket.user.username, displayName: socket.user.display_name, profilePicture: socket.user.profile_picture },
          callType
        });
        ack?.({ ok: true, callId });
      } catch (err) {
        console.error('call:initiate error:', err.message);
        ack?.({ error: 'Failed to initiate call' });
      }
    });

    socket.on('call:accept', async (data, ack) => {
      try {
        const { callId } = data;
        const call = activeCalls.get(callId);
        if (!call || call.calleeId !== userId) return ack?.({ error: 'Cannot accept this call' });
        call.state = 'connected';
        call.answeredAt = new Date();
        emitToUser(call.callerId, 'call:accepted', { callId, callee: { id: socket.user.id, username: socket.user.username, displayName: socket.user.display_name, profilePicture: socket.user.profile_picture } });
        ack?.({ ok: true });
      } catch (err) { ack?.({ error: 'Failed' }); }
    });

    socket.on('call:reject', async (data, ack) => {
      try {
        const { callId, reason } = data;
        const call = activeCalls.get(callId);
        if (!call) return ack?.({ error: 'Call not found' });
        if (call.calleeId !== userId && call.callerId !== userId) return ack?.({ error: 'Not authorized' });
        call.state = 'declined';
        await execute(
          'INSERT INTO call_records (caller_id, callee_id, call_type, status, started_at, ended_at) VALUES (?, ?, ?, "declined", ?, NOW())',
          [call.callerId, call.calleeId, call.callType, call.startedAt]
        );
        emitToUser(call.callerId, 'call:rejected', { callId, reason });
        emitToUser(call.calleeId, 'call:rejected', { callId, reason });
        activeCalls.delete(callId);
        ack?.({ ok: true });
      } catch (err) { ack?.({ error: 'Failed' }); }
    });

    socket.on('call:cancel', async (data, ack) => {
      try {
        const { callId } = data;
        const call = activeCalls.get(callId);
        if (!call || call.callerId !== userId) return ack?.({ error: 'Not authorized' });
        call.state = 'cancelled';
        await execute(
          'INSERT INTO call_records (caller_id, callee_id, call_type, status, started_at, ended_at) VALUES (?, ?, ?, "cancelled", ?, NOW())',
          [call.callerId, call.calleeId, call.callType, call.startedAt]
        );
        emitToUser(call.calleeId, 'call:cancelled', { callId });
        activeCalls.delete(callId);
        ack?.({ ok: true });
      } catch (err) { ack?.({ error: 'Failed' }); }
    });

    socket.on('call:offer', (data) => {
      const { callId, offer, targetUserId } = data;
      const call = activeCalls.get(callId);
      if (!call) return;
      emitToUser(targetUserId || (call.callerId === userId ? call.calleeId : call.callerId), 'call:offer', { callId, offer, from: userId });
    });

    socket.on('call:answer', (data) => {
      const { callId, answer, targetUserId } = data;
      const call = activeCalls.get(callId);
      if (!call) return;
      emitToUser(targetUserId || (call.callerId === userId ? call.calleeId : call.callerId), 'call:answer', { callId, answer, from: userId });
    });

    socket.on('call:ice-candidate', (data) => {
      const { callId, candidate, targetUserId } = data;
      const call = activeCalls.get(callId);
      if (!call) return;
      emitToUser(targetUserId || (call.callerId === userId ? call.calleeId : call.callerId), 'call:ice-candidate', { callId, candidate, from: userId });
    });

    socket.on('call:end', async (data, ack) => {
      try {
        const { callId } = data;
        const call = activeCalls.get(callId);
        if (!call) return ack?.({ ok: true });
        if (call.callerId !== userId && call.calleeId !== userId) return ack?.({ error: 'Not authorized' });
        call.state = 'ended';
        const duration = call.answeredAt ? Math.floor((Date.now() - call.answeredAt.getTime()) / 1000) : 0;
        const status = call.answeredAt ? 'completed' : 'missed';
        await execute(
          'INSERT INTO call_records (caller_id, callee_id, call_type, status, started_at, answered_at, ended_at, duration_seconds) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)',
          [call.callerId, call.calleeId, call.callType, status, call.startedAt, call.answeredAt || null, duration]
        );
        const otherId = call.callerId === userId ? call.calleeId : call.callerId;
        emitToUser(otherId, 'call:ended', { callId, duration, status });
        activeCalls.delete(callId);
        ack?.({ ok: true });
      } catch (err) { ack?.({ error: 'Failed' }); }
    });

    socket.on('call:missed', async (data) => {
      const { callId } = data;
      const call = activeCalls.get(callId);
      if (!call) return;
      await execute(
        'INSERT INTO call_records (caller_id, callee_id, call_type, status, started_at, ended_at) VALUES (?, ?, ?, "missed", ?, NOW())',
        [call.callerId, call.calleeId, call.callType, call.startedAt]
      );
      activeCalls.delete(callId);
    });

    socket.on('call:media-state', (data) => {
      const { callId, audioEnabled, videoEnabled } = data;
      const call = activeCalls.get(callId);
      if (!call) return;
      const otherId = call.callerId === userId ? call.calleeId : call.callerId;
      emitToUser(otherId, 'call:media-state', { callId, userId, audioEnabled, videoEnabled });
    });

    socket.on('disconnect', async () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          await execute('UPDATE users SET is_online = 0, last_seen = NOW() WHERE id = ?', [userId]);
          io.emit('presence:update', { userId, isOnline: false });
          io.emit('presence:online', { onlineUserIds: getOnlineUsers() });
          // Cancel any ringing calls for this user
          for (const [callId, call] of activeCalls) {
            if (call.state === 'ringing' && (call.calleeId === userId || call.callerId === userId)) {
              const otherId = call.callerId === userId ? call.calleeId : call.callerId;
              emitToUser(otherId, 'call:ended', { callId, reason: 'disconnected' });
              activeCalls.delete(callId);
            }
          }
        }
      }
    });
  });
}
