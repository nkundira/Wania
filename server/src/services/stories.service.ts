import { query } from '../db/pool.js';
import { badRequest, forbidden, notFound } from '../utils/errors.js';
import { assertConversationMember, canViewStory, isBlocked, isFollowing } from './access.service.js';
import { signMediaUrl } from './media.service.js';
import { createNotification } from './notifications.service.js';
import { emitToUser } from '../sockets/hub.js';
import { ensureDirectConversation, insertMessage } from './messages.service.js';
import { userSummary } from './serializers.js';

const storySelect = `
  s.id, s.author_id, s.media_id, s.caption, s.privacy, s.expires_at, s.created_at,
  u.username, p.display_name, p.avatar_media_id, p.is_private,
  m.media_type, m.mime_type, m.duration_seconds,
  EXISTS(SELECT 1 FROM story_views sv WHERE sv.story_id=s.id AND sv.viewer_id=$1) AS seen,
  (SELECT count(*)::int FROM story_views sv WHERE sv.story_id=s.id) AS view_count,
  (SELECT count(*)::int FROM story_reactions sr WHERE sr.story_id=s.id) AS reaction_count
`;

function serialize(row: Record<string, any>, viewerId: string) {
  return {
    id: row.id,
    caption: row.caption,
    privacy: row.privacy,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    seen: Boolean(row.seen),
    viewCount: row.view_count ?? 0,
    reactionCount: row.reaction_count ?? 0,
    media: {
      id: row.media_id,
      type: row.media_type,
      mimeType: row.mime_type,
      duration: row.duration_seconds,
      url: signMediaUrl(row.media_id, viewerId),
    },
    author: {
      id: row.author_id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_media_id ? signMediaUrl(row.avatar_media_id, viewerId) : null,
      isPrivate: row.is_private,
    },
  };
}

export async function storyFeed(viewerId: string) {
  const { rows } = await query(
    `SELECT ${storySelect}
     FROM stories s
     JOIN users u ON u.id=s.author_id
     JOIN profiles p ON p.user_id=s.author_id
     JOIN media m ON m.id=s.media_id
     WHERE s.deleted_at IS NULL AND s.expires_at > now() AND u.is_active=true
       AND (
         s.author_id=$1
         OR EXISTS(SELECT 1 FROM follows f WHERE f.follower_id=$1 AND f.following_id=s.author_id)
         OR (s.privacy='everyone' AND p.is_private=false)
       )
       AND NOT EXISTS(SELECT 1 FROM blocks b WHERE (b.blocker_id=$1 AND b.blocked_id=s.author_id) OR (b.blocker_id=s.author_id AND b.blocked_id=$1))
     ORDER BY s.created_at ASC`,
    [viewerId]
  );
  const map = new Map<string, { author: ReturnType<typeof userSummary>; stories: ReturnType<typeof serialize>[]; allSeen: boolean }>();
  for (const row of rows) {
    const item = serialize(row, viewerId);
    const existing = map.get(row.author_id);
    if (existing) {
      existing.stories.push(item);
      existing.allSeen = existing.allSeen && item.seen;
    } else {
      map.set(row.author_id, {
        author: userSummary(
          {
            id: row.author_id,
            username: row.username,
            display_name: row.display_name,
            avatar_media_id: row.avatar_media_id,
            is_private: row.is_private,
          },
          viewerId
        ),
        stories: [item],
        allSeen: item.seen,
      });
    }
  }
  const groups = [...map.values()];
  groups.sort((a, b) => {
    if (a.author.id === viewerId) return -1;
    if (b.author.id === viewerId) return 1;
    if (a.allSeen !== b.allSeen) return a.allSeen ? 1 : -1;
    return new Date(b.stories[b.stories.length - 1].createdAt).getTime() - new Date(a.stories[a.stories.length - 1].createdAt).getTime();
  });
  return groups;
}

export async function getStory(viewerId: string, storyId: string) {
  const { rows } = await query(
    `SELECT ${storySelect} FROM stories s
     JOIN users u ON u.id=s.author_id JOIN profiles p ON p.user_id=s.author_id JOIN media m ON m.id=s.media_id
     WHERE s.id=$2 AND s.deleted_at IS NULL AND s.expires_at > now()`,
    [viewerId, storyId]
  );
  const row = rows[0];
  if (!row) throw notFound('Story not found or expired');
  if (await isBlocked(viewerId, row.author_id)) throw notFound('Story not found or expired');
  if (!(await canViewStory(viewerId, row.author_id, row.privacy))) throw forbidden('This story is private');
  if (row.author_id !== viewerId) {
    await query(`INSERT INTO story_views (story_id, viewer_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [storyId, viewerId]);
    emitToUser(row.author_id, 'story:viewed', { storyId, viewerId });
  }
  const { rows: reactions } = await query(
    `SELECT sr.emoji, sr.user_id, u.username FROM story_reactions sr JOIN users u ON u.id=sr.user_id WHERE sr.story_id=$1`,
    [storyId]
  );
  return { ...serialize({ ...row, seen: true }, viewerId), reactions, isOwner: row.author_id === viewerId };
}

export async function createStory(
  viewerId: string,
  input: { mediaId: string; caption?: string; privacy?: 'everyone' | 'followers'; hours?: number }
) {
  const { rows: mediaRows } = await query(`SELECT id, media_type FROM media WHERE id=$1 AND owner_id=$2`, [
    input.mediaId,
    viewerId,
  ]);
  if (!mediaRows[0]) throw badRequest('Upload not found');
  const hours = Math.min(24, Math.max(1, input.hours ?? 24));
  const { rows } = await query(
    `INSERT INTO stories (author_id, media_id, caption, privacy, expires_at)
     VALUES ($1,$2,$3,$4, now() + ($5 || ' hours')::interval) RETURNING id`,
    [viewerId, input.mediaId, input.caption?.trim() ?? '', input.privacy ?? 'followers', String(hours)]
  );
  emitToUser(viewerId, 'story:created', { id: rows[0].id });
  return getStory(viewerId, rows[0].id);
}

export async function deleteStory(viewerId: string, storyId: string) {
  const { rowCount } = await query(
    `UPDATE stories SET deleted_at=now() WHERE id=$1 AND author_id=$2 AND deleted_at IS NULL`,
    [storyId, viewerId]
  );
  if (!rowCount) throw notFound('Story not found');
  emitToUser(viewerId, 'story:deleted', { id: storyId });
  return { deleted: true };
}

export async function reactToStory(viewerId: string, storyId: string, emoji: string) {
  const story = await getStory(viewerId, storyId);
  if (story.isOwner) throw badRequest('You cannot react to your own story');
  await query(
    `INSERT INTO story_reactions (story_id, user_id, emoji) VALUES ($1,$2,$3)
     ON CONFLICT (story_id,user_id) DO UPDATE SET emoji=EXCLUDED.emoji, created_at=now()`,
    [storyId, viewerId, emoji.slice(0, 8)]
  );
  await createNotification({
    userId: story.author.id,
    actorId: viewerId,
    type: 'story_reaction',
    entityType: 'story',
    entityId: storyId,
    data: { emoji },
  });
  emitToUser(story.author.id, 'story:reaction', { storyId, emoji });
  return { reacted: true, emoji };
}

export async function replyToStory(viewerId: string, storyId: string, body: string) {
  const story = await getStory(viewerId, storyId);
  if (story.isOwner) throw badRequest('You cannot reply to your own story');
  const conversation = await ensureDirectConversation(viewerId, story.author.id);
  const message = await insertMessage({
    conversationId: conversation.id,
    senderId: viewerId,
    body: body.trim(),
    kind: 'story_reply',
    storyId,
  });
  await createNotification({
    userId: story.author.id,
    actorId: viewerId,
    type: 'story_reply',
    entityType: 'story',
    entityId: storyId,
    data: { preview: body.slice(0, 120), conversationId: conversation.id },
  });
  return { message, conversationId: conversation.id };
}

export async function listStoryViewers(viewerId: string, storyId: string) {
  const { rows } = await query(`SELECT author_id FROM stories WHERE id=$1 AND deleted_at IS NULL`, [storyId]);
  if (!rows[0]) throw notFound('Story not found');
  if (rows[0].author_id !== viewerId) throw forbidden();
  const { rows: viewers } = await query(
    `SELECT u.id,u.username,p.display_name,p.avatar_media_id,p.is_private,sv.viewed_at
     FROM story_views sv JOIN users u ON u.id=sv.viewer_id JOIN profiles p ON p.user_id=u.id
     WHERE sv.story_id=$1 ORDER BY sv.viewed_at DESC`,
    [storyId]
  );
  return viewers.map((row) => ({
    ...userSummary(row, viewerId),
    viewedAt: row.viewed_at,
  }));
}

export async function activeStoriesForUser(username: string, viewerId: string) {
  const { rows } = await query(
    `SELECT u.id, p.is_private FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.username=$1`,
    [username]
  );
  if (!rows[0]) throw notFound('User not found');
  const author = rows[0];
  if (author.id !== viewerId) {
    if (author.is_private && !(await isFollowing(viewerId, author.id))) throw forbidden('This account is private');
    if (await isBlocked(viewerId, author.id)) throw notFound('User not found');
  }
  const { rows: stories } = await query(
    `SELECT ${storySelect} FROM stories s
     JOIN users u ON u.id=s.author_id JOIN profiles p ON p.user_id=s.author_id JOIN media m ON m.id=s.media_id
     WHERE s.author_id=$2 AND s.deleted_at IS NULL AND s.expires_at > now()
       AND (s.author_id=$1 OR s.privacy='everyone' OR EXISTS(SELECT 1 FROM follows f WHERE f.follower_id=$1 AND f.following_id=s.author_id))
     ORDER BY s.created_at ASC`,
    [viewerId, author.id]
  );
  return stories.map((row) => serialize(row, viewerId));
}
