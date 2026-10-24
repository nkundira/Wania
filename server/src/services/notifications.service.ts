import { query } from '../db/pool.js';
import { emitToUser } from '../sockets/hub.js';
import { clampInt, makeCursor } from '../utils/helpers.js';
import { userSummary } from './serializers.js';

const preferenceColumn: Record<string, string> = {
  follow: 'notify_follows',
  follow_request: 'notify_follows',
  follow_accepted: 'notify_follows',
  like: 'notify_likes',
  comment: 'notify_comments',
  mention: 'notify_comments',
  story_reply: 'notify_messages',
  story_reaction: 'notify_messages',
  message: 'notify_messages',
  call: 'notify_calls',
};

export async function createNotification(input: {
  userId: string;
  actorId?: string | null;
  type: keyof typeof preferenceColumn;
  entityType?: string | null;
  entityId?: string | null;
  data?: Record<string, unknown>;
}) {
  if (input.actorId && input.actorId === input.userId) return null;
  const col = preferenceColumn[input.type];
  if (col) {
    const { rows } = await query(`SELECT ${col} AS enabled, ai_enabled FROM profiles WHERE user_id=$1`, [input.userId]);
    if (rows[0] && rows[0].enabled === false) return null;
  }
  const { rows } = await query(
    `INSERT INTO notifications (user_id, actor_id, type, entity_type, entity_id, data)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [input.userId, input.actorId ?? null, input.type, input.entityType ?? null, input.entityId ?? null, input.data ?? {}]
  );
  const notification = await serializeNotification(rows[0], input.userId);
  emitToUser(input.userId, 'notification:new', notification);
  return notification;
}

export async function serializeNotification(row: Record<string, unknown>, viewerId: string) {
  let actor = null;
  if (row.actor_id) {
    const { rows } = await query(
      `SELECT u.id,u.username,p.display_name,p.avatar_media_id,p.is_private
       FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.id=$1`,
      [row.actor_id]
    );
    if (rows[0]) actor = userSummary(rows[0], viewerId);
  }
  return {
    id: row.id,
    type: row.type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    data: row.data,
    readAt: row.read_at,
    createdAt: row.created_at,
    actor,
  };
}

export async function listNotifications(userId: string, cursor?: string, limit?: number) {
  const take = clampInt(limit, 1, 40, 20);
  const cursorData = cursor ? Buffer.from(cursor, 'base64url').toString('utf8').split('|') : null;
  const params: unknown[] = [userId];
  let where = `n.user_id=$1`;
  if (cursorData?.[0] && cursorData?.[1]) {
    params.push(cursorData[0], cursorData[1]);
    where += ` AND (n.created_at, n.id) < ($2::timestamptz, $3::uuid)`;
  }
  params.push(take + 1);
  const { rows } = await query(
    `SELECT n.*, u.username, p.display_name, p.avatar_media_id
     FROM notifications n
     LEFT JOIN users u ON u.id=n.actor_id
     LEFT JOIN profiles p ON p.user_id=n.actor_id
     WHERE ${where}
     ORDER BY n.created_at DESC, n.id DESC LIMIT $${params.length}`,
    params
  );
  const items = rows.slice(0, take).map((row) => ({
    id: row.id,
    type: row.type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    data: row.data,
    readAt: row.read_at,
    createdAt: row.created_at,
    actor: row.actor_id
      ? userSummary(
          {
            id: row.actor_id,
            username: row.username,
            display_name: row.display_name,
            avatar_media_id: row.avatar_media_id,
          },
          userId
        )
      : null,
  }));
  const last = rows[take - 1];
  const nextCursor = rows.length > take && last ? makeCursor(last.created_at, last.id) : null;
  const unread = await unreadNotificationCount(userId);
  return { items, nextCursor, unread };
}

export async function unreadNotificationCount(userId: string) {
  const { rows } = await query(`SELECT count(*)::int AS count FROM notifications WHERE user_id=$1 AND read_at IS NULL`, [
    userId,
  ]);
  return rows[0].count as number;
}

export async function markNotificationsRead(userId: string, id?: string) {
  if (id) {
    await query(`UPDATE notifications SET read_at=now() WHERE id=$1 AND user_id=$2 AND read_at IS NULL`, [id, userId]);
  } else {
    await query(`UPDATE notifications SET read_at=now() WHERE user_id=$1 AND read_at IS NULL`, [userId]);
  }
}
