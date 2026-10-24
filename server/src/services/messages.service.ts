import { query, withTransaction } from '../db/pool.js';
import { badRequest, forbidden, notFound } from '../utils/errors.js';
import { clampInt, makeCursor, parseCursor } from '../utils/helpers.js';
import { assertNotBlocked, assertConversationMember, isFollowing } from './access.service.js';
import { signMediaUrl } from './media.service.js';
import { createNotification } from './notifications.service.js';
import { emitToUser, isOnline } from '../sockets/hub.js';
import { userSummary } from './serializers.js';

const messageSelect = `
  m.id, m.conversation_id, m.sender_id, m.body, m.kind, m.reply_to_id, m.story_id,
  m.expires_at, m.viewed_at, m.created_at, m.deleted_at,
  u.username, p.display_name, p.avatar_media_id,
  rm.body AS reply_body, rm.kind AS reply_kind, rm.deleted_at AS reply_deleted,
  ru.username AS reply_username, rp.display_name AS reply_display_name, rp.avatar_media_id AS reply_avatar_media_id,
  COALESCE((SELECT json_agg(json_build_object('mediaId', ma.media_id, 'kind', ma.kind, 'mediaType', mm.media_type, 'mimeType', mm.mime_type, 'duration', mm.duration_seconds))
    FROM message_attachments ma JOIN media mm ON mm.id=ma.media_id WHERE ma.message_id=m.id), '[]'::json) AS attachments,
  (SELECT count(*)::int FROM message_receipts r WHERE r.message_id=m.id) AS recipient_count,
  (SELECT count(*)::int FROM message_receipts r WHERE r.message_id=m.id AND r.delivered_at IS NOT NULL) AS delivered_count,
  (SELECT count(*)::int FROM message_receipts r WHERE r.message_id=m.id AND r.read_at IS NOT NULL) AS read_count
`;

function serializeMessage(row: Record<string, any>, viewerId: string) {
  const attachments = (row.attachments ?? []).map((a: Record<string, unknown>) => ({
    mediaId: a.mediaId,
    kind: a.kind,
    mediaType: a.mediaType,
    mimeType: a.mimeType,
    duration: a.duration,
    url: signMediaUrl(String(a.mediaId), viewerId),
  }));
  const status =
    row.read_count >= row.recipient_count && row.recipient_count > 0
      ? 'read'
      : row.delivered_count >= row.recipient_count && row.recipient_count > 0
        ? 'delivered'
        : 'sent';
  return {
    id: row.id,
    conversationId: row.conversation_id,
    body: row.body,
    kind: row.kind,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    viewedAt: row.viewed_at,
    deleted: Boolean(row.deleted_at),
    attachments,
    storyId: row.story_id,
    status,
    isMine: row.sender_id === viewerId,
    sender: {
      id: row.sender_id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_media_id ? signMediaUrl(row.avatar_media_id, viewerId) : null,
    },
    replyTo: row.reply_to_id
      ? {
          id: row.reply_to_id,
          body: row.reply_deleted ? 'Message deleted' : row.reply_kind === 'snap' ? 'Snap' : row.reply_body,
          senderName: row.reply_display_name,
        }
      : null,
  };
}

async function conversationMembers(conversationId: string, viewerId: string) {
  const { rows } = await query(
    `SELECT u.id,u.username,p.display_name,p.avatar_media_id,p.is_private,cm.role,cm.muted,cm.last_read_at
     FROM conversation_members cm
     JOIN users u ON u.id=cm.user_id
     JOIN profiles p ON p.user_id=u.id
     WHERE cm.conversation_id=$1
     ORDER BY cm.joined_at ASC`,
    [conversationId]
  );
  return rows.map((row) => ({
    ...userSummary(row, viewerId),
    role: row.role,
    muted: row.muted,
    lastReadAt: row.last_read_at,
  }));
}

function serializeConversation(row: Record<string, any>, members: ReturnType<typeof conversationMembers> extends Promise<infer T> ? T : never, viewerId: string) {
  const others = members.filter((m) => m.id !== viewerId);
  const direct = row.type === 'direct';
  const title = direct
    ? (others[0]?.displayName ?? others[0]?.username ?? 'Conversation')
    : (row.title || others.map((m) => m.displayName).join(', ') || 'Group chat');
  const avatarUrl = direct ? (others[0]?.avatarUrl ?? null) : null;
  return {
    id: row.id,
    type: row.type,
    title,
    avatarUrl,
    members,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessageAt: row.last_message_at,
    lastMessage: row.last_message_preview
      ? { preview: row.last_message_preview, kind: row.last_message_kind, createdAt: row.last_message_at }
      : null,
    unreadCount: row.unread_count ?? 0,
    muted: Boolean(row.my_muted),
  };
}

export async function listConversations(viewerId: string) {
  const { rows } = await query(
    `SELECT c.id, c.type, c.title, c.created_by, c.created_at, c.updated_at, c.last_message_at,
            cm.muted AS my_muted,
            (SELECT count(*)::int FROM messages m
              WHERE m.conversation_id=c.id AND m.sender_id<>$1 AND m.deleted_at IS NULL
                AND m.created_at > COALESCE(cm.last_read_at, 'epoch'::timestamptz)
                AND (m.expires_at IS NULL OR m.expires_at > now())) AS unread_count,
            (SELECT CASE
                WHEN m.kind='snap' THEN 'Snap'
                WHEN m.kind='voice' THEN 'Voice note'
                WHEN m.kind='story_reply' THEN 'Replied to your story'
                WHEN m.body <> '' THEN left(m.body, 90)
                ELSE 'Attachment' END
              FROM messages m WHERE m.conversation_id=c.id AND m.deleted_at IS NULL
                AND (m.expires_at IS NULL OR m.expires_at > now())
              ORDER BY m.created_at DESC LIMIT 1) AS last_message_preview,
            (SELECT m.kind FROM messages m WHERE m.conversation_id=c.id AND m.deleted_at IS NULL
              AND (m.expires_at IS NULL OR m.expires_at > now()) ORDER BY m.created_at DESC LIMIT 1) AS last_message_kind
     FROM conversation_members cm
     JOIN conversations c ON c.id=cm.conversation_id
     WHERE cm.user_id=$1
     ORDER BY COALESCE(c.last_message_at, c.created_at) DESC`,
    [viewerId]
  );
  const result = [];
  for (const row of rows) {
    const members = await conversationMembers(row.id, viewerId);
    result.push(serializeConversation(row, members, viewerId));
  }
  return result;
}

export async function getConversation(viewerId: string, conversationId: string) {
  await assertConversationMember(conversationId, viewerId);
  const { rows } = await query(
    `SELECT c.*, cm.muted AS my_muted,
       (SELECT count(*)::int FROM messages m WHERE m.conversation_id=c.id AND m.sender_id<>$2 AND m.deleted_at IS NULL
         AND m.created_at > COALESCE(cm.last_read_at, 'epoch'::timestamptz)
         AND (m.expires_at IS NULL OR m.expires_at > now())) AS unread_count
     FROM conversations c JOIN conversation_members cm ON cm.conversation_id=c.id
     WHERE c.id=$1 AND cm.user_id=$2`,
    [conversationId, viewerId]
  );
  if (!rows[0]) throw notFound('Conversation not found');
  const members = await conversationMembers(conversationId, viewerId);
  return serializeConversation(rows[0], members, viewerId);
}

async function directKey(a: string, b: string) {
  return [a, b].sort().join(':');
}

export async function ensureDirectConversation(a: string, b: string) {
  if (a === b) throw badRequest('You cannot message yourself');
  await assertNotBlocked(a, b);
  const { rows: targetRows } = await query(
    `SELECT u.id, p.message_privacy, p.display_name FROM users u JOIN profiles p ON p.user_id=u.id
     WHERE u.id=$1 AND u.is_active=true`,
    [b]
  );
  const target = targetRows[0];
  if (!target) throw notFound('User not found');
  if (target.message_privacy === 'followers' && !(await isFollowing(a, b))) {
    throw forbidden('This person only accepts messages from people they follow');
  }
  const key = await directKey(a, b);
  const { rows: existing } = await query(`SELECT * FROM conversations WHERE direct_key=$1`, [key]);
  if (existing[0]) return existing[0];
  const conversation = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO conversations (type, direct_key, created_by) VALUES ('direct',$1,$2) ON CONFLICT (direct_key) DO NOTHING RETURNING *`,
      [key, a]
    );
    if (!rows[0]) {
      const { rows: again } = await client.query(`SELECT * FROM conversations WHERE direct_key=$1`, [key]);
      return again[0];
    }
    const created = rows[0];
    for (const member of [a, b]) {
      await client.query(`INSERT INTO conversation_members (conversation_id,user_id) VALUES ($1,$2)`, [created.id, member]);
    }
    return created;
  });
  return conversation;
}

export async function createConversation(
  viewerId: string,
  input: { type: 'direct' | 'group'; memberIds: string[]; title?: string }
) {
  const members = [...new Set(input.memberIds.filter((id) => id !== viewerId))];
  if (!members.length) throw badRequest('Choose at least one person');
  if (input.type === 'direct') {
    if (members.length !== 1) throw badRequest('A direct chat needs exactly one person');
    const conversation = await ensureDirectConversation(viewerId, members[0]);
    return getConversation(viewerId, conversation.id);
  }
  if (members.length < 1) throw badRequest('A group needs at least two members');
  const { rows: valid } = await query(`SELECT id FROM users WHERE id = ANY($1::uuid[]) AND is_active=true`, [members]);
  if (valid.length !== members.length) throw badRequest('Some members were not found');
  for (const member of members) await assertNotBlocked(viewerId, member);
  const conversation = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO conversations (type, title, created_by) VALUES ('group',$1,$2) RETURNING *`,
      [input.title?.trim() || null, viewerId]
    );
    const created = rows[0];
    await client.query(`INSERT INTO conversation_members (conversation_id,user_id,role) VALUES ($1,$2,'owner')`, [
      created.id,
      viewerId,
    ]);
    for (const member of members) {
      await client.query(`INSERT INTO conversation_members (conversation_id,user_id) VALUES ($1,$2)`, [created.id, member]);
    }
    return created;
  });
  emitToUser(viewerId, 'conversation:created', { id: conversation.id });
  for (const member of members) emitToUser(member, 'conversation:created', { id: conversation.id });
  return getConversation(viewerId, conversation.id);
}

export async function insertMessage(input: {
  conversationId: string;
  senderId: string;
  body?: string;
  kind?: string;
  attachmentIds?: string[];
  replyToId?: string;
  storyId?: string;
  expiresAt?: string | null;
}) {
  await assertConversationMember(input.conversationId, input.senderId);
  const body = (input.body ?? '').trim();
  const attachmentIds = [...new Set(input.attachmentIds ?? [])];
  if (!body && !attachmentIds.length && input.kind !== 'story_reply') throw badRequest('Message cannot be empty');
  let kind = input.kind ?? (attachmentIds.length ? 'image' : 'text');
  if (!['text', 'image', 'video', 'voice', 'snap', 'story_reply', 'system'].includes(kind)) {
    throw badRequest('Invalid message type');
  }
  if (attachmentIds.length) {
    const { rows } = await query(
      `SELECT id, media_type FROM media WHERE id = ANY($1::uuid[]) AND owner_id=$2`,
      [attachmentIds, input.senderId]
    );
    if (rows.length !== attachmentIds.length) throw badRequest('Attachment upload not found');
    if (kind !== 'snap') {
      const type = rows[0].media_type;
      kind = type === 'video' ? 'video' : type === 'audio' ? 'voice' : 'image';
    }
  } else if (['image', 'video', 'voice', 'snap'].includes(kind)) {
    throw badRequest('This message type needs an attachment');
  }
  if (input.replyToId) {
    const { rowCount } = await query(`SELECT 1 FROM messages WHERE id=$1 AND conversation_id=$2`, [
      input.replyToId,
      input.conversationId,
    ]);
    if (!rowCount) throw badRequest('The message you replied to no longer exists');
  }
  let expiresAt = input.expiresAt ?? null;
  if (kind === 'snap' && !expiresAt) expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const messageId = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO messages (conversation_id, sender_id, body, kind, reply_to_id, story_id, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [input.conversationId, input.senderId, body, kind, input.replyToId ?? null, input.storyId ?? null, expiresAt]
    );
    const id = rows[0].id;
    for (const mediaId of attachmentIds) {
      const { rows: mediaRows } = await client.query(`SELECT media_type FROM media WHERE id=$1`, [mediaId]);
      const attachmentKind = mediaRows[0]?.media_type === 'video' ? 'video' : mediaRows[0]?.media_type === 'audio' ? 'audio' : 'image';
      await client.query(`INSERT INTO message_attachments (message_id, media_id, kind) VALUES ($1,$2,$3)`, [
        id,
        mediaId,
        attachmentKind,
      ]);
    }
    await client.query(
      `INSERT INTO message_receipts (message_id, user_id, delivered_at)
       SELECT $1::uuid, cm.user_id, NULL::timestamptz
       FROM conversation_members cm
       WHERE cm.conversation_id=$2::uuid AND cm.user_id<>$3::uuid`,
      [id, input.conversationId, input.senderId]
    );
    await client.query(`UPDATE conversations SET last_message_at=now(), updated_at=now() WHERE id=$1`, [
      input.conversationId,
    ]);
    await client.query(
      `UPDATE conversation_members SET last_read_at=now() WHERE conversation_id=$1 AND user_id=$2`,
      [input.conversationId, input.senderId]
    );
    return id as string;
  });

  const message = await getMessageForViewer(messageId, input.senderId);
  const { rows: memberRows } = await query(
    `SELECT user_id FROM conversation_members WHERE conversation_id=$1 AND user_id<>$2`,
    [input.conversationId, input.senderId]
  );
  for (const member of memberRows) {
    const online = isOnline(member.user_id);
    if (online) {
      await query(`UPDATE message_receipts SET delivered_at=COALESCE(delivered_at, now()) WHERE message_id=$1 AND user_id=$2`, [
        messageId,
        member.user_id,
      ]);
    }
    const forMember = await getMessageForViewer(messageId, member.user_id);
    if (forMember && !forMember.deleted) emitToUser(member.user_id, 'message:new', forMember);
    await createNotification({
      userId: member.user_id,
      actorId: input.senderId,
      type: 'message',
      entityType: 'conversation',
      entityId: input.conversationId,
      data: { conversationId: input.conversationId, preview: kind === 'snap' ? 'Sent you a snap' : body.slice(0, 100) },
    });
    emitToUser(member.user_id, 'conversation:updated', { id: input.conversationId });
  }
  emitToUser(input.senderId, 'conversation:updated', { id: input.conversationId });
  return getMessageForViewer(messageId, input.senderId) ?? message;
}

async function getMessageForViewer(messageId: string, viewerId: string) {
  const { rows } = await query(
    `SELECT ${messageSelect} FROM messages m
     JOIN users u ON u.id=m.sender_id JOIN profiles p ON p.user_id=m.sender_id
     LEFT JOIN messages rm ON rm.id=m.reply_to_id
     LEFT JOIN users ru ON ru.id=rm.sender_id LEFT JOIN profiles rp ON rp.user_id=rm.sender_id
     WHERE m.id=$1`,
    [messageId]
  );
  if (!rows[0]) return null;
  return serializeMessage(rows[0], viewerId);
}

export async function listMessages(viewerId: string, conversationId: string, cursor?: string, limit?: number) {
  await assertConversationMember(conversationId, viewerId);
  const take = clampInt(limit, 1, 60, 30);
  const parsed = parseCursor(cursor);
  const params: unknown[] = [conversationId];
  let where = '';
  if (parsed) {
    params.push(parsed.createdAt, parsed.id);
    where = ` AND (m.created_at, m.id) < ($2::timestamptz, $3::uuid)`;
  }
  params.push(take + 1);
  const { rows } = await query(
    `SELECT ${messageSelect} FROM messages m
     JOIN users u ON u.id=m.sender_id JOIN profiles p ON p.user_id=m.sender_id
     LEFT JOIN messages rm ON rm.id=m.reply_to_id
     LEFT JOIN users ru ON ru.id=rm.sender_id LEFT JOIN profiles rp ON rp.user_id=rm.sender_id
     WHERE m.conversation_id=$1 AND m.deleted_at IS NULL
       AND (m.expires_at IS NULL OR m.expires_at > now())${where}
     ORDER BY m.created_at DESC, m.id DESC LIMIT $${params.length}`,
    params
  );
  const page = rows.slice(0, take).reverse().map((row) => serializeMessage(row, viewerId));
  const oldest = rows[take - 1];
  return {
    items: page,
    nextCursor: rows.length > take && oldest ? makeCursor(oldest.created_at, oldest.id) : null,
  };
}

export async function markConversationRead(viewerId: string, conversationId: string) {
  await assertConversationMember(conversationId, viewerId);
  await withTransaction(async (client) => {
    await client.query(`UPDATE conversation_members SET last_read_at=now() WHERE conversation_id=$1 AND user_id=$2`, [
      conversationId,
      viewerId,
    ]);
    await client.query(
      `UPDATE message_receipts r SET read_at=now(), delivered_at=COALESCE(r.delivered_at, now())
       FROM messages m
       WHERE r.message_id=m.id AND r.user_id=$2 AND m.conversation_id=$1 AND m.sender_id<>$2 AND r.read_at IS NULL`,
      [conversationId, viewerId]
    );
  });
  const { rows: members } = await query(`SELECT user_id FROM conversation_members WHERE conversation_id=$1`, [conversationId]);
  for (const member of members) {
    emitToUser(member.user_id, 'message:read', { conversationId, userId: viewerId, readAt: new Date().toISOString() });
  }
  return { read: true };
}

export async function markAllDelivered(userId: string) {
  await query(
    `UPDATE message_receipts SET delivered_at=now() WHERE user_id=$1 AND delivered_at IS NULL AND read_at IS NULL`,
    [userId]
  );
}

export async function deleteMessage(viewerId: string, messageId: string) {
  const { rows } = await query(`SELECT sender_id, conversation_id FROM messages WHERE id=$1`, [messageId]);
  if (!rows[0]) throw notFound('Message not found');
  if (rows[0].sender_id !== viewerId) throw forbidden('You can only delete your own messages');
  await query(`UPDATE messages SET deleted_at=now(), body='' WHERE id=$1`, [messageId]);
  const { rows: members } = await query(`SELECT user_id FROM conversation_members WHERE conversation_id=$1`, [
    rows[0].conversation_id,
  ]);
  for (const member of members) {
    emitToUser(member.user_id, 'message:deleted', { messageId, conversationId: rows[0].conversation_id });
  }
  return { deleted: true };
}

export async function markSnapViewed(viewerId: string, messageId: string) {
  const { rows } = await query(
    `SELECT m.sender_id, m.conversation_id, m.kind, m.viewed_at FROM messages m WHERE m.id=$1`,
    [messageId]
  );
  if (!rows[0] || rows[0].kind !== 'snap') return;
  if (rows[0].sender_id === viewerId || rows[0].viewed_at) return;
  await query(`UPDATE messages SET viewed_at=now() WHERE id=$1`, [messageId]);
  emitToUser(rows[0].sender_id, 'snap:viewed', { messageId, conversationId: rows[0].conversation_id });
}

export async function markTyping(viewerId: string, conversationId: string) {
  await assertConversationMember(conversationId, viewerId);
}

export async function listCallHistory(viewerId: string, limit = 30) {
  const { rows } = await query(
    `SELECT c.*, cu.username AS caller_username, cp.display_name AS caller_name, cp.avatar_media_id AS caller_avatar,
            tu.username AS callee_username, tp.display_name AS callee_name, tp.avatar_media_id AS callee_avatar
     FROM calls c
     JOIN users cu ON cu.id=c.caller_id JOIN profiles cp ON cp.user_id=c.caller_id
     JOIN users tu ON tu.id=c.callee_id JOIN profiles tp ON tp.user_id=c.callee_id
     WHERE c.caller_id=$1 OR c.callee_id=$1
     ORDER BY c.started_at DESC LIMIT $2`,
    [viewerId, clampInt(limit, 1, 100, 30)]
  );
  return rows.map((row) => {
    const outgoing = row.caller_id === viewerId;
    return {
      id: row.id,
      type: row.type,
      status: row.status,
      direction: outgoing ? 'outgoing' : 'incoming',
      startedAt: row.started_at,
      answeredAt: row.answered_at,
      endedAt: row.ended_at,
      durationSeconds: row.duration_seconds,
      peer: {
        id: outgoing ? row.callee_id : row.caller_id,
        username: outgoing ? row.callee_username : row.caller_username,
        displayName: outgoing ? row.callee_name : row.caller_name,
        avatarUrl: (outgoing ? row.callee_avatar : row.caller_avatar)
          ? signMediaUrl(outgoing ? row.callee_avatar : row.caller_avatar, viewerId)
          : null,
      },
    };
  });
}
