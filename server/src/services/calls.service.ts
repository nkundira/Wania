import { env } from '../config/env.js';
import { query } from '../db/pool.js';
import { badRequest, forbidden, notFound } from '../utils/errors.js';
import { isBlocked } from './access.service.js';

export async function createCall(callerId: string, calleeId: string, type: 'audio' | 'video', conversationId?: string) {
  if (callerId === calleeId) throw badRequest('You cannot call yourself');
  if (await isBlocked(callerId, calleeId)) throw forbidden('Calling is unavailable');
  const { rows } = await query(
    `SELECT u.id, u.is_active, p.display_name FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.id=$1`,
    [calleeId]
  );
  if (!rows[0] || !rows[0].is_active) throw notFound('User not found');
  if (conversationId) {
    const { rowCount } = await query(
      `SELECT 1 FROM conversation_members WHERE conversation_id=$1 AND user_id=$2`,
      [conversationId, callerId]
    );
    if (!rowCount) throw forbidden('You are not part of this conversation');
  }
  const { rows: callRows } = await query(
    `INSERT INTO calls (caller_id, callee_id, conversation_id, type, status) VALUES ($1,$2,$3,$4,'ringing') RETURNING *`,
    [callerId, calleeId, conversationId ?? null, type]
  );
  return callRows[0];
}

export async function getCall(callId: string) {
  const { rows } = await query(`SELECT * FROM calls WHERE id=$1`, [callId]);
  return rows[0] ?? null;
}

export async function acceptCall(callId: string, userId: string) {
  const { rows } = await query(
    `UPDATE calls SET status='accepted', answered_at=now()
     WHERE id=$1 AND callee_id=$2 AND status='ringing' RETURNING *`,
    [callId, userId]
  );
  if (!rows[0]) throw notFound('Call is no longer ringing');
  return rows[0];
}

export async function declineCall(callId: string, userId: string) {
  const { rows } = await query(
    `UPDATE calls SET status='declined', ended_at=now()
     WHERE id=$1 AND (callee_id=$2 OR caller_id=$2) AND status='ringing' RETURNING *`,
    [callId, userId]
  );
  return rows[0] ?? null;
}

export async function endCall(callId: string, userId: string) {
  const call = await getCall(callId);
  if (!call) throw notFound('Call not found');
  if (call.caller_id !== userId && call.callee_id !== userId) throw forbidden();
  if (call.status === 'ended' || call.status === 'declined' || call.status === 'missed') return call;
  const duration = call.answered_at
    ? Math.max(0, Math.round((Date.now() - new Date(call.answered_at).getTime()) / 1000))
    : 0;
  const { rows } = await query(
    `UPDATE calls SET status=CASE WHEN answered_at IS NULL THEN 'missed' ELSE 'ended' END,
       ended_at=now(), duration_seconds=$2 WHERE id=$1 RETURNING *`,
    [callId, duration]
  );
  return rows[0];
}

export async function markMissed(callId: string) {
  const { rows } = await query(
    `UPDATE calls SET status='missed', ended_at=now() WHERE id=$1 AND status='ringing' RETURNING *`,
    [callId]
  );
  return rows[0] ?? null;
}

export function iceServers() {
  const servers: { urls: string | string[]; username?: string; credential?: string }[] = [
    { urls: env.STUN_URLS.split(',').map((s) => s.trim()).filter(Boolean) },
  ];
  if (env.TURN_URL && env.TURN_USERNAME && env.TURN_CREDENTIAL) {
    servers.push({ urls: env.TURN_URL, username: env.TURN_USERNAME, credential: env.TURN_CREDENTIAL });
  }
  return servers;
}
