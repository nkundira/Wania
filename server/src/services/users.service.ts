import { query, withTransaction } from '../db/pool.js';
import { isOnline } from '../sockets/hub.js';
import { badRequest, conflict, forbidden, notFound } from '../utils/errors.js';
import { clampInt, escapeLike, extractMentions } from '../utils/helpers.js';
import {
  assertNotBlocked,
  assertCanViewPost,
  hasPendingRequest,
  isBlocked,
  isFollowing,
} from './access.service.js';
import { signMediaUrl } from './media.service.js';
import { createNotification } from './notifications.service.js';
import { userSummary } from './serializers.js';

export type ProfileUpdate = {
  displayName?: string;
  bio?: string;
  isPrivate?: boolean;
  showActivity?: boolean;
  lastSeenVisibility?: 'everyone' | 'followers' | 'nobody';
  storyPrivacy?: 'everyone' | 'followers';
  messagePrivacy?: 'everyone' | 'followers';
  aiEnabled?: boolean;
  aiHistoryEnabled?: boolean;
  notifyFollows?: boolean;
  notifyLikes?: boolean;
  notifyComments?: boolean;
  notifyMessages?: boolean;
  notifyCalls?: boolean;
  avatarMediaId?: string | null;
  coverMediaId?: string | null;
};

export async function getProfile(username: string, viewerId: string | null) {
  const { rows } = await query(
    `SELECT u.id, u.username, u.email, u.email_verified, u.is_active, u.last_seen_at, u.created_at,
            p.display_name, p.bio, p.avatar_media_id, p.cover_media_id, p.is_private,
            p.show_activity, p.last_seen_visibility, p.story_privacy, p.message_privacy,
            p.ai_enabled, p.ai_history_enabled, p.notify_follows, p.notify_likes, p.notify_comments,
            p.notify_messages, p.notify_calls,
            (SELECT count(*)::int FROM follows WHERE following_id=u.id) AS followers_count,
            (SELECT count(*)::int FROM follows WHERE follower_id=u.id) AS following_count,
            (SELECT count(*)::int FROM posts WHERE author_id=u.id AND deleted_at IS NULL) AS posts_count,
            EXISTS(SELECT 1 FROM follows WHERE follower_id=$2 AND following_id=u.id) AS is_following,
            EXISTS(SELECT 1 FROM follow_requests WHERE requester_id=$2 AND target_id=u.id AND status='pending') AS follow_requested,
            EXISTS(SELECT 1 FROM blocks WHERE blocker_id=$2 AND blocked_id=u.id) AS is_blocked,
            EXISTS(SELECT 1 FROM blocks WHERE blocker_id=u.id AND blocked_id=$2) AS has_blocked_viewer
     FROM users u JOIN profiles p ON p.user_id=u.id
     WHERE u.username=$1 AND u.is_active=true`,
    [username.trim(), viewerId]
  );
  const row = rows[0];
  if (!row) throw notFound('Profile not found');
  const isSelf = viewerId === row.id;
  if (viewerId && (await isBlocked(viewerId, row.id)) && !isSelf) throw notFound('Profile not found');

  const following = await isFollowing(viewerId ?? '', row.id);
  const canViewContent = isSelf || !row.is_private || following;
  const lastSeenVisible =
    isSelf ||
    row.last_seen_visibility === 'everyone' ||
    (row.last_seen_visibility === 'followers' && following);

  return {
    id: row.id,
    username: row.username,
    email: isSelf ? row.email : undefined,
    emailVerified: isSelf ? row.email_verified : undefined,
    displayName: row.display_name,
    bio: row.bio,
    avatarUrl: row.avatar_media_id ? signMediaUrl(row.avatar_media_id, viewerId ?? 'anonymous') : null,
    coverUrl: row.cover_media_id ? signMediaUrl(row.cover_media_id, viewerId ?? 'anonymous') : null,
    isPrivate: row.is_private,
    isFollowing: following,
    followRequested: Boolean(row.follow_requested),
    isBlocked: Boolean(row.is_blocked),
    hasBlockedViewer: Boolean(row.has_blocked_viewer),
    isOnline: isOnline(row.id),
    lastSeenAt: lastSeenVisible ? row.last_seen_at : null,
    createdAt: row.created_at,
    counts: {
      followers: row.followers_count,
      following: row.following_count,
      posts: row.posts_count,
    },
    canViewContent,
    settings: isSelf
      ? {
          showActivity: row.show_activity,
          lastSeenVisibility: row.last_seen_visibility,
          storyPrivacy: row.story_privacy,
          messagePrivacy: row.message_privacy,
          aiEnabled: row.ai_enabled,
          aiHistoryEnabled: row.ai_history_enabled,
          notifyFollows: row.notify_follows,
          notifyLikes: row.notify_likes,
          notifyComments: row.notify_comments,
          notifyMessages: row.notify_messages,
          notifyCalls: row.notify_calls,
        }
      : undefined,
  };
}

export async function getUserBasic(id: string, viewerId?: string | null) {
  const { rows } = await query(
    `SELECT u.id,u.username,p.display_name,p.avatar_media_id,p.is_private
     FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.id=$1`,
    [id]
  );
  if (!rows[0]) throw notFound('User not found');
  return userSummary(rows[0], viewerId);
}

export async function updateProfile(userId: string, input: ProfileUpdate) {
  if (input.avatarMediaId) {
    const { rowCount } = await query(`SELECT 1 FROM media WHERE id=$1 AND owner_id=$2`, [input.avatarMediaId, userId]);
    if (!rowCount) throw badRequest('Invalid avatar upload');
  }
  if (input.coverMediaId) {
    const { rowCount } = await query(`SELECT 1 FROM media WHERE id=$1 AND owner_id=$2`, [input.coverMediaId, userId]);
    if (!rowCount) throw badRequest('Invalid cover upload');
  }
  const map: Record<string, string> = {
    displayName: 'display_name',
    bio: 'bio',
    isPrivate: 'is_private',
    showActivity: 'show_activity',
    lastSeenVisibility: 'last_seen_visibility',
    storyPrivacy: 'story_privacy',
    messagePrivacy: 'message_privacy',
    aiEnabled: 'ai_enabled',
    aiHistoryEnabled: 'ai_history_enabled',
    notifyFollows: 'notify_follows',
    notifyLikes: 'notify_likes',
    notifyComments: 'notify_comments',
    notifyMessages: 'notify_messages',
    notifyCalls: 'notify_calls',
    avatarMediaId: 'avatar_media_id',
    coverMediaId: 'cover_media_id',
  };
  const sets: string[] = [];
  const values: unknown[] = [userId];
  for (const [key, column] of Object.entries(map)) {
    const value = input[key as keyof ProfileUpdate];
    if (value !== undefined) {
      values.push(value);
      sets.push(`${column}=$${values.length}`);
    }
  }
  if (!sets.length) throw badRequest('No changes provided');
  sets.push('updated_at=now()');
  await query(`UPDATE profiles SET ${sets.join(', ')} WHERE user_id=$1`, values);
  return getProfileById(userId, userId);
}

export async function getProfileById(id: string, viewerId: string | null) {
  const { rows } = await query(`SELECT username FROM users WHERE id=$1`, [id]);
  if (!rows[0]) throw notFound('User not found');
  return getProfile(rows[0].username, viewerId);
}

export async function followUser(viewerId: string, targetId: string) {
  if (viewerId === targetId) throw badRequest('You cannot follow yourself');
  await assertNotBlocked(viewerId, targetId);
  const { rows } = await query(
    `SELECT u.id, p.is_private, p.display_name FROM users u JOIN profiles p ON p.user_id=u.id
     WHERE u.id=$1 AND u.is_active=true`,
    [targetId]
  );
  const target = rows[0];
  if (!target) throw notFound('User not found');
  if (await isFollowing(viewerId, targetId)) return { following: true, requested: false };

  if (target.is_private) {
    await query(
      `INSERT INTO follow_requests (requester_id, target_id, status) VALUES ($1,$2,'pending')
       ON CONFLICT (requester_id, target_id) DO UPDATE SET status='pending', created_at=now(), responded_at=NULL`,
      [viewerId, targetId]
    );
    const actor = await getUserBasic(viewerId);
    await createNotification({
      userId: targetId,
      actorId: viewerId,
      type: 'follow_request',
      entityType: 'user',
      entityId: viewerId,
      data: { username: actor.username, displayName: actor.displayName },
    });
    return { following: false, requested: true };
  }

  await withTransaction(async (client) => {
    await client.query(`INSERT INTO follows (follower_id, following_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [
      viewerId,
      targetId,
    ]);
    await client.query(`DELETE FROM follow_requests WHERE requester_id=$1 AND target_id=$2`, [viewerId, targetId]);
  });
  const actor = await getUserBasic(viewerId);
  await createNotification({
    userId: targetId,
    actorId: viewerId,
    type: 'follow',
    entityType: 'user',
    entityId: viewerId,
    data: { username: actor.username, displayName: actor.displayName },
  });
  return { following: true, requested: false };
}

export async function unfollowUser(viewerId: string, targetId: string) {
  await query(`DELETE FROM follows WHERE follower_id=$1 AND following_id=$2`, [viewerId, targetId]);
  await query(`DELETE FROM follow_requests WHERE requester_id=$1 AND target_id=$2`, [viewerId, targetId]);
  return { following: false, requested: false };
}

export async function listFollowRequests(userId: string) {
  const { rows } = await query(
    `SELECT u.id,u.username,p.display_name,p.avatar_media_id,p.is_private,fr.created_at
     FROM follow_requests fr
     JOIN users u ON u.id=fr.requester_id
     JOIN profiles p ON p.user_id=u.id
     WHERE fr.target_id=$1 AND fr.status='pending'
     ORDER BY fr.created_at DESC`,
    [userId]
  );
  return rows.map((row) => ({ ...userSummary(row, userId), requestedAt: row.created_at }));
}

export async function respondFollowRequest(viewerId: string, requesterId: string, accept: boolean) {
  const result = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `UPDATE follow_requests SET status=$3, responded_at=now()
       WHERE requester_id=$1 AND target_id=$2 AND status='pending' RETURNING *`,
      [requesterId, viewerId, accept ? 'accepted' : 'declined']
    );
    if (!rows[0]) return null;
    if (accept) {
      await client.query(`INSERT INTO follows (follower_id, following_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [
        requesterId,
        viewerId,
      ]);
    }
    return rows[0];
  });
  if (!result) throw notFound('Follow request not found');
  if (accept) {
    const actor = await getUserBasic(viewerId);
    await createNotification({
      userId: requesterId,
      actorId: viewerId,
      type: 'follow_accepted',
      entityType: 'user',
      entityId: viewerId,
      data: { username: actor.username, displayName: actor.displayName },
    });
  }
  return { accepted: accept };
}

export async function listFollowers(username: string, viewerId: string | null, cursor?: string, limit?: number) {
  const profile = await getProfile(username, viewerId);
  if (!profile.canViewContent) throw forbidden('This account is private');
  const take = clampInt(limit, 1, 50, 30);
  const offset = cursor ? Math.max(0, Number(Buffer.from(cursor, 'base64url').toString()) || 0) : 0;
  const isMe = viewerId === profile.id;
  const { rows } = await query(
    `SELECT u.id,u.username,p.display_name,p.avatar_media_id,p.is_private,
       EXISTS(SELECT 1 FROM follows f WHERE f.follower_id=$2 AND f.following_id=u.id) AS is_following
     FROM follows f
     JOIN users u ON u.id=f.follower_id
     JOIN profiles p ON p.user_id=u.id
     WHERE f.following_id=$1 AND u.is_active=true
     ORDER BY f.created_at DESC OFFSET $3 LIMIT $4`,
    [profile.id, viewerId, offset, take + 1]
  );
  const items = rows.slice(0, take).map((row) => userSummary(row, viewerId));
  return {
    items,
    nextCursor: rows.length > take ? Buffer.from(String(offset + take)).toString('base64url') : null,
    profile: { id: profile.id, username: profile.username, displayName: profile.displayName, isMe },
  };
}

export async function listFollowing(username: string, viewerId: string | null, cursor?: string, limit?: number) {
  const profile = await getProfile(username, viewerId);
  if (!profile.canViewContent) throw forbidden('This account is private');
  const take = clampInt(limit, 1, 50, 30);
  const offset = cursor ? Math.max(0, Number(Buffer.from(cursor, 'base64url').toString()) || 0) : 0;
  const { rows } = await query(
    `SELECT u.id,u.username,p.display_name,p.avatar_media_id,p.is_private,
       EXISTS(SELECT 1 FROM follows f2 WHERE f2.follower_id=$2 AND f2.following_id=u.id) AS is_following
     FROM follows f
     JOIN users u ON u.id=f.following_id
     JOIN profiles p ON p.user_id=u.id
     WHERE f.follower_id=$1 AND u.is_active=true
     ORDER BY f.created_at DESC OFFSET $3 LIMIT $4`,
    [profile.id, viewerId, offset, take + 1]
  );
  const items = rows.slice(0, take).map((row) => userSummary(row, viewerId));
  return {
    items,
    nextCursor: rows.length > take ? Buffer.from(String(offset + take)).toString('base64url') : null,
    profile: { id: profile.id, username: profile.username, displayName: profile.displayName, isMe: viewerId === profile.id },
  };
}

export async function searchUsers(viewerId: string, q: string, limit = 20) {
  const term = `%${escapeLike(q.trim())}%`;
  const { rows } = await query(
    `SELECT u.id,u.username,p.display_name,p.avatar_media_id,p.is_private,
       EXISTS(SELECT 1 FROM follows f WHERE f.follower_id=$1 AND f.following_id=u.id) AS is_following,
       EXISTS(SELECT 1 FROM follow_requests fr WHERE fr.requester_id=$1 AND fr.target_id=u.id AND fr.status='pending') AS follow_requested
     FROM users u JOIN profiles p ON p.user_id=u.id
     WHERE u.is_active=true AND u.id<>$1
       AND (u.username ILIKE $2 OR p.display_name ILIKE $2)
       AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id=$1 AND b.blocked_id=u.id) OR (b.blocker_id=u.id AND b.blocked_id=$1))
     ORDER BY (u.username ILIKE $3) DESC, p.display_name ASC
     LIMIT $4`,
    [viewerId, term, `${escapeLike(q.trim())}%`, clampInt(limit, 1, 50, 20)]
  );
  return rows.map((row) => userSummary(row, viewerId));
}

export async function blockUser(viewerId: string, targetId: string) {
  if (viewerId === targetId) throw badRequest('You cannot block yourself');
  await withTransaction(async (client) => {
    await client.query(`INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [
      viewerId,
      targetId,
    ]);
    await client.query(
      `DELETE FROM follows WHERE (follower_id=$1 AND following_id=$2) OR (follower_id=$2 AND following_id=$1)`,
      [viewerId, targetId]
    );
    await client.query(
      `DELETE FROM follow_requests WHERE (requester_id=$1 AND target_id=$2) OR (requester_id=$2 AND target_id=$1)`,
      [viewerId, targetId]
    );
  });
  return { blocked: true };
}

export async function unblockUser(viewerId: string, targetId: string) {
  await query(`DELETE FROM blocks WHERE blocker_id=$1 AND blocked_id=$2`, [viewerId, targetId]);
  return { blocked: false };
}

export async function listBlockedUsers(viewerId: string) {
  const { rows } = await query(
    `SELECT u.id,u.username,p.display_name,p.avatar_media_id,p.is_private,b.created_at
     FROM blocks b JOIN users u ON u.id=b.blocked_id JOIN profiles p ON p.user_id=u.id
     WHERE b.blocker_id=$1 ORDER BY b.created_at DESC`,
    [viewerId]
  );
  return rows.map((row) => ({ ...userSummary(row, viewerId), blockedAt: row.created_at }));
}

export async function createReport(
  viewerId: string,
  input: { targetType: 'user' | 'post' | 'comment' | 'story' | 'message'; targetId: string; reason: string; details?: string }
) {
  if (input.targetType === 'post') {
    await assertCanViewPost(viewerId, input.targetId).catch(() => undefined);
  }
  const { rows } = await query(
    `INSERT INTO reports (reporter_id, target_type, target_id, reason, details)
     VALUES ($1,$2,$3,$4,$5) RETURNING id,status,created_at`,
    [viewerId, input.targetType, input.targetId, input.reason, input.details ?? null]
  );
  return { id: rows[0].id, status: rows[0].status, createdAt: rows[0].created_at };
}

export async function notifyMentions(text: string, actorId: string, entityType: string, entityId: string) {
  const usernames = extractMentions(text);
  if (!usernames.length) return;
  const { rows } = await query(
    `SELECT u.id, u.username, p.display_name FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.username = ANY($1)`,
    [usernames]
  );
  const actor = await getUserBasic(actorId);
  for (const row of rows) {
    if (row.id === actorId) continue;
    await createNotification({
      userId: row.id,
      actorId,
      type: 'mention',
      entityType,
      entityId,
      data: { username: actor.username, displayName: actor.displayName },
    });
  }
}

export async function deactivateAccount(userId: string) {
  await withTransaction(async (client) => {
    await client.query(`UPDATE users SET is_active=false, updated_at=now() WHERE id=$1`, [userId]);
    await client.query(`UPDATE refresh_tokens SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL`, [userId]);
  });
}

export async function reactivateAccount(email: string, password: string) {
  const { rows } = await query(`SELECT * FROM users WHERE email=$1`, [email.toLowerCase()]);
  const user = rows[0];
  if (!user) throw notFound('Account not found');
  if (user.is_active) throw conflict('Account is already active');
  const bcrypt = await import('bcrypt');
  if (!(await bcrypt.compare(password, user.password_hash))) throw forbidden('Incorrect password');
  await query(`UPDATE users SET is_active=true, updated_at=now() WHERE id=$1`, [user.id]);
  return user.id as string;
}

export async function deleteAccount(userId: string) {
  await query(`DELETE FROM users WHERE id=$1`, [userId]);
}
