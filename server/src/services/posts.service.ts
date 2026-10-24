import { query, withTransaction } from '../db/pool.js';
import { badRequest, forbidden, notFound } from '../utils/errors.js';
import { clampInt, extractHashtags, makeCursor, parseCursor } from '../utils/helpers.js';
import { assertCanViewPost, canViewAuthorContent, getPostAccess, isBlocked } from './access.service.js';
import { signMediaUrl } from './media.service.js';
import { createNotification } from './notifications.service.js';
import { notifyMentions } from './users.service.js';

type PostRow = Record<string, any>;

const postSelect = `
  p.id, p.author_id, p.type, p.caption, p.location, p.visibility, p.created_at, p.updated_at,
  u.username, u.is_active AS author_active, pr.display_name, pr.avatar_media_id, pr.is_private,
  (SELECT count(*)::int FROM likes l WHERE l.post_id=p.id) AS like_count,
  (SELECT count(*)::int FROM comments c WHERE c.post_id=p.id AND c.deleted_at IS NULL) AS comment_count,
  EXISTS(SELECT 1 FROM likes l WHERE l.post_id=p.id AND l.user_id=$VIEWER) AS liked,
  EXISTS(SELECT 1 FROM saved_posts sp WHERE sp.post_id=p.id AND sp.user_id=$VIEWER) AS saved,
  EXISTS(SELECT 1 FROM follows f WHERE f.follower_id=$VIEWER AND f.following_id=p.author_id) AS author_is_following,
  COALESCE((SELECT json_agg(json_build_object(
      'id', m.id, 'mediaType', m.media_type, 'mimeType', m.mime_type,
      'width', m.width, 'height', m.height, 'duration', m.duration_seconds
    ) ORDER BY pm.position)
    FROM post_media pm JOIN media m ON m.id=pm.media_id WHERE pm.post_id=p.id), '[]'::json) AS media,
  COALESCE((SELECT json_agg(h.tag ORDER BY h.tag)
    FROM post_hashtags ph JOIN hashtags h ON h.id=ph.hashtag_id WHERE ph.post_id=p.id), '[]'::json) AS hashtags
`;

function serialized(row: PostRow, viewerId: string | null) {
  const media = (row.media ?? []).map((m: Record<string, unknown>) => ({
    id: m.id,
    type: m.mediaType,
    mimeType: m.mimeType,
    width: m.width,
    height: m.height,
    duration: m.duration,
    url: signMediaUrl(String(m.id), viewerId ?? 'anonymous'),
  }));
  return {
    id: row.id,
    type: row.type,
    caption: row.caption,
    location: row.location,
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    likeCount: row.like_count,
    commentCount: row.comment_count,
    liked: Boolean(row.liked),
    saved: Boolean(row.saved),
    hashtags: row.hashtags ?? [],
    media,
    author: {
      id: row.author_id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_media_id ? signMediaUrl(row.avatar_media_id, viewerId ?? 'anonymous') : null,
      isPrivate: Boolean(row.is_private),
      isFollowing: Boolean(row.author_is_following),
    },
  };
}

function viewerSub(queryText: string, viewerId: string | null) {
  return queryText.replaceAll('$VIEWER', viewerId ? '$1' : 'NULL');
}

export async function feedPosts(viewerId: string, cursor?: string, limit?: number) {
  const take = clampInt(limit, 1, 30, 10);
  const parsed = parseCursor(cursor);
  const base = viewerSub(`SELECT ${postSelect}
    FROM posts p
    JOIN users u ON u.id=p.author_id
    JOIN profiles pr ON pr.user_id=p.author_id
    WHERE p.deleted_at IS NULL AND p.type='post' AND u.is_active=true
      AND (p.author_id=$1 OR EXISTS(SELECT 1 FROM follows f WHERE f.follower_id=$1 AND f.following_id=p.author_id))
      AND (p.visibility='public' OR p.author_id=$1 OR EXISTS(SELECT 1 FROM follows f WHERE f.follower_id=$1 AND f.following_id=p.author_id))
      AND NOT EXISTS(SELECT 1 FROM blocks b WHERE (b.blocker_id=$1 AND b.blocked_id=p.author_id) OR (b.blocker_id=p.author_id AND b.blocked_id=$1))`, viewerId);

  const params: unknown[] = [viewerId];
  let where = '';
  if (parsed) {
    params.push(parsed.createdAt, parsed.id);
    where = ` AND (p.created_at, p.id) < ($2::timestamptz, $3::uuid)`;
  }
  params.push(take + 1);
  const { rows } = await query(
    `${base}${where} ORDER BY p.created_at DESC, p.id DESC LIMIT $${params.length}`,
    params
  );
  const items = rows.slice(0, take).map((r) => serialized(r, viewerId));
  const last = rows[take - 1];

  if (!items.length && !cursor) {
    const suggested = await explorePosts(viewerId, undefined, take);
    return { items: suggested.items.map((p) => ({ ...p, suggested: true })), nextCursor: suggested.nextCursor };
  }
  return {
    items,
    nextCursor: rows.length > take && last ? makeCursor(last.created_at, last.id) : null,
  };
}

export async function explorePosts(viewerId: string, cursor?: string, limit?: number, hashtag?: string) {
  const take = clampInt(limit, 1, 40, 18);
  const offset = cursor ? Math.max(0, Number(Buffer.from(cursor, 'base64url').toString()) || 0) : 0;
  const params: unknown[] = [viewerId];
  let tagJoin = '';
  if (hashtag) {
    params.push(hashtag.toLowerCase());
    tagJoin = ` JOIN post_hashtags ph ON ph.post_id=p.id JOIN hashtags h ON h.id=ph.hashtag_id AND h.tag=$2`;
  }
  params.push(offset, take + 1);
  const { rows } = await query(
    `SELECT ${viewerSub(postSelect, viewerId)}
     FROM posts p ${tagJoin}
     JOIN users u ON u.id=p.author_id
     JOIN profiles pr ON pr.user_id=p.author_id
     WHERE p.deleted_at IS NULL AND u.is_active=true AND p.visibility='public' AND pr.is_private=false
       AND NOT EXISTS(SELECT 1 FROM blocks b WHERE (b.blocker_id=$1 AND b.blocked_id=p.author_id) OR (b.blocker_id=p.author_id AND b.blocked_id=$1))
     ORDER BY (SELECT count(*) FROM likes l WHERE l.post_id=p.id) DESC, p.created_at DESC
     OFFSET $${params.length - 1} LIMIT $${params.length}`,
    params
  );
  const items = rows.slice(0, take).map((r) => serialized(r, viewerId));
  return {
    items,
    nextCursor: rows.length > take ? Buffer.from(String(offset + take)).toString('base64url') : null,
  };
}

export async function reelsFeed(viewerId: string, cursor?: string, limit?: number) {
  const take = clampInt(limit, 1, 20, 6);
  const offset = cursor ? Math.max(0, Number(Buffer.from(cursor, 'base64url').toString()) || 0) : 0;
  const { rows } = await query(
    `SELECT ${viewerSub(postSelect, viewerId)}
     FROM posts p
     JOIN users u ON u.id=p.author_id
     JOIN profiles pr ON pr.user_id=p.author_id
     WHERE p.deleted_at IS NULL AND p.type='reel' AND u.is_active=true
       AND (pr.is_private=false OR p.author_id=$1 OR EXISTS(SELECT 1 FROM follows f WHERE f.follower_id=$1 AND f.following_id=p.author_id))
       AND NOT EXISTS(SELECT 1 FROM blocks b WHERE (b.blocker_id=$1 AND b.blocked_id=p.author_id) OR (b.blocker_id=p.author_id AND b.blocked_id=$1))
     ORDER BY p.created_at DESC
     OFFSET $2 LIMIT $3`,
    [viewerId, offset, take + 1]
  );
  const items = rows.slice(0, take).map((r) => serialized(r, viewerId));
  return {
    items,
    nextCursor: rows.length > take ? Buffer.from(String(offset + take)).toString('base64url') : null,
  };
}

export async function getPost(viewerId: string | null, postId: string) {
  await assertCanViewPost(viewerId, postId);
  const params: unknown[] = viewerId ? [viewerId, postId] : [postId];
  const select = viewerSub(postSelect, viewerId).replace('p.id=$2', viewerId ? 'p.id=$2' : 'p.id=$1');
  const { rows } = await query(
    `SELECT ${select} FROM posts p
     JOIN users u ON u.id=p.author_id
     JOIN profiles pr ON pr.user_id=p.author_id
     WHERE p.id=${viewerId ? '$2' : '$1'} AND p.deleted_at IS NULL`,
    params
  );
  if (!rows[0]) throw notFound('Post not found');
  return serialized(rows[0], viewerId);
}

export async function createPost(
  viewerId: string,
  input: { type: 'post' | 'reel'; caption?: string; mediaIds: string[]; location?: string; visibility?: 'public' | 'followers' }
) {
  if (!input.mediaIds.length) throw badRequest('Add at least one photo or video');
  if (input.type === 'reel') {
    if (input.mediaIds.length !== 1) throw badRequest('A reel needs exactly one video');
  }
  const { rows: mediaRows } = await query(
    `SELECT id, media_type, purpose FROM media WHERE id = ANY($1::uuid[]) AND owner_id=$2`,
    [input.mediaIds, viewerId]
  );
  if (mediaRows.length !== input.mediaIds.length) throw badRequest('Some media uploads were not found');
  if (input.type === 'reel' && !mediaRows.some((m) => m.media_type === 'video')) {
    throw badRequest('Reels must be a video');
  }

  const post = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO posts (author_id, type, caption, location, visibility)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [viewerId, input.type, input.caption?.trim() ?? '', input.location?.trim() || null, input.visibility ?? 'public']
    );
    const created = rows[0];
    for (let i = 0; i < input.mediaIds.length; i++) {
      await client.query(`INSERT INTO post_media (post_id, media_id, position) VALUES ($1,$2,$3)`, [
        created.id,
        input.mediaIds[i],
        i,
      ]);
    }
    const tags = extractHashtags(input.caption ?? '');
    for (const tag of tags) {
      const { rows: tagRows } = await client.query(
        `INSERT INTO hashtags (tag) VALUES ($1) ON CONFLICT (tag) DO UPDATE SET tag=EXCLUDED.tag RETURNING id`,
        [tag]
      );
      await client.query(`INSERT INTO post_hashtags (post_id,hashtag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [
        created.id,
        tagRows[0].id,
      ]);
    }
    return created;
  });
  await notifyMentions(input.caption ?? '', viewerId, 'post', post.id);
  return getPost(viewerId, post.id);
}

export async function updatePost(viewerId: string, postId: string, caption: string) {
  const { rowCount } = await query(
    `UPDATE posts SET caption=$3, updated_at=now() WHERE id=$1 AND author_id=$2 AND deleted_at IS NULL`,
    [postId, viewerId, caption]
  );
  if (!rowCount) throw notFound('Post not found');
  await query(`DELETE FROM post_hashtags WHERE post_id=$1`, [postId]);
  for (const tag of extractHashtags(caption)) {
    const { rows } = await query(
      `INSERT INTO hashtags (tag) VALUES ($1) ON CONFLICT (tag) DO UPDATE SET tag=EXCLUDED.tag RETURNING id`,
      [tag]
    );
    await query(`INSERT INTO post_hashtags (post_id,hashtag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [postId, rows[0].id]);
  }
  return getPost(viewerId, postId);
}

export async function deletePost(viewerId: string, postId: string) {
  const { rowCount } = await query(
    `UPDATE posts SET deleted_at=now() WHERE id=$1 AND author_id=$2 AND deleted_at IS NULL`,
    [postId, viewerId]
  );
  if (!rowCount) throw notFound('Post not found');
  return { deleted: true };
}

export async function likePost(viewerId: string, postId: string) {
  await assertCanViewPost(viewerId, postId);
  const post = await getPostAccess(postId);
  await query(`INSERT INTO likes (user_id, post_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [viewerId, postId]);
  if (post) {
    await createNotification({
      userId: post.author_id,
      actorId: viewerId,
      type: 'like',
      entityType: 'post',
      entityId: postId,
    });
  }
  return { liked: true, likeCount: await likeCount(postId) };
}

export async function unlikePost(viewerId: string, postId: string) {
  await query(`DELETE FROM likes WHERE user_id=$1 AND post_id=$2`, [viewerId, postId]);
  return { liked: false, likeCount: await likeCount(postId) };
}

async function likeCount(postId: string) {
  const { rows } = await query(`SELECT count(*)::int AS count FROM likes WHERE post_id=$1`, [postId]);
  return rows[0].count as number;
}

export async function listLikes(postId: string, viewerId: string) {
  await assertCanViewPost(viewerId, postId);
  const { rows } = await query(
    `SELECT u.id,u.username,p.display_name,p.avatar_media_id,p.is_private
     FROM likes l JOIN users u ON u.id=l.user_id JOIN profiles p ON p.user_id=u.id
     WHERE l.post_id=$1 ORDER BY l.created_at DESC LIMIT 100`,
    [postId]
  );
  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_media_id ? signMediaUrl(row.avatar_media_id, viewerId) : null,
    isPrivate: row.is_private,
  }));
}

export async function listComments(postId: string, viewerId: string) {
  await assertCanViewPost(viewerId, postId);
  const { rows } = await query(
    `SELECT c.id, c.post_id, c.parent_id, c.body, c.created_at, c.author_id,
            u.username, p.display_name, p.avatar_media_id
     FROM comments c
     JOIN users u ON u.id=c.author_id
     JOIN profiles p ON p.user_id=c.author_id
     WHERE c.post_id=$1 AND c.deleted_at IS NULL
     ORDER BY c.created_at ASC`,
    [postId]
  );
  return rows.map((row) => ({
    id: row.id,
    postId: row.post_id,
    parentId: row.parent_id,
    body: row.body,
    createdAt: row.created_at,
    isOwner: row.author_id === viewerId,
    author: {
      id: row.author_id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_media_id ? signMediaUrl(row.avatar_media_id, viewerId) : null,
    },
  }));
}

export async function createComment(viewerId: string, postId: string, body: string, parentId?: string) {
  await assertCanViewPost(viewerId, postId);
  const post = await getPostAccess(postId);
  if (parentId) {
    const { rows } = await query(`SELECT id, author_id FROM comments WHERE id=$1 AND post_id=$2 AND deleted_at IS NULL`, [
      parentId,
      postId,
    ]);
    if (!rows[0]) throw notFound('Comment not found');
  }
  const { rows } = await query(
    `INSERT INTO comments (post_id, author_id, parent_id, body) VALUES ($1,$2,$3,$4) RETURNING *`,
    [postId, viewerId, parentId ?? null, body.trim()]
  );
  if (post) {
    await createNotification({
      userId: post.author_id,
      actorId: viewerId,
      type: 'comment',
      entityType: 'post',
      entityId: postId,
      data: { preview: body.slice(0, 120) },
    });
  }
  if (parentId) {
    const { rows: parentRows } = await query(`SELECT author_id FROM comments WHERE id=$1`, [parentId]);
    if (parentRows[0] && parentRows[0].author_id !== post?.author_id) {
      await createNotification({
        userId: parentRows[0].author_id,
        actorId: viewerId,
        type: 'comment',
        entityType: 'post',
        entityId: postId,
        data: { preview: body.slice(0, 120), reply: true },
      });
    }
  }
  await notifyMentions(body, viewerId, 'post', postId);
  const comments = await listComments(postId, viewerId);
  return comments.find((c) => c.id === rows[0].id);
}

export async function deleteComment(viewerId: string, commentId: string) {
  const { rows } = await query(
    `SELECT c.author_id, p.author_id AS post_author
     FROM comments c JOIN posts p ON p.id=c.post_id WHERE c.id=$1`,
    [commentId]
  );
  if (!rows[0]) throw notFound('Comment not found');
  if (rows[0].author_id !== viewerId && rows[0].post_author !== viewerId) throw forbidden();
  await query(`UPDATE comments SET deleted_at=now(), body='' WHERE id=$1`, [commentId]);
  return { deleted: true };
}

export async function savePost(viewerId: string, postId: string) {
  await assertCanViewPost(viewerId, postId);
  await query(`INSERT INTO saved_posts (user_id, post_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [viewerId, postId]);
  return { saved: true };
}

export async function unsavePost(viewerId: string, postId: string) {
  await query(`DELETE FROM saved_posts WHERE user_id=$1 AND post_id=$2`, [viewerId, postId]);
  return { saved: false };
}

export async function savedPosts(viewerId: string, cursor?: string, limit?: number) {
  const take = clampInt(limit, 1, 30, 12);
  const offset = cursor ? Math.max(0, Number(Buffer.from(cursor, 'base64url').toString()) || 0) : 0;
  const { rows } = await query(
    `SELECT ${viewerSub(postSelect, viewerId)} FROM saved_posts sp
     JOIN posts p ON p.id=sp.post_id
     JOIN users u ON u.id=p.author_id
     JOIN profiles pr ON pr.user_id=p.author_id
     WHERE sp.user_id=$1 AND p.deleted_at IS NULL
     ORDER BY sp.created_at DESC OFFSET $2 LIMIT $3`,
    [viewerId, offset, take + 1]
  );
  return {
    items: rows.slice(0, take).map((r) => serialized(r, viewerId)),
    nextCursor: rows.length > take ? Buffer.from(String(offset + take)).toString('base64url') : null,
  };
}

export async function userPosts(
  username: string,
  viewerId: string | null,
  options: { cursor?: string; limit?: number; type?: 'post' | 'reel' | 'all' } = {}
) {
  const { rows: userRows } = await query(
    `SELECT u.id, u.is_active, p.is_private FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.username=$1`,
    [username]
  );
  const user = userRows[0];
  if (!user || !user.is_active) throw notFound('Profile not found');
  const allowed = viewerId === user.id || (await canViewAuthorContent(viewerId, user.id, user.is_private));
  if (!allowed) throw forbidden('This account is private');
  const take = clampInt(options.limit, 1, 30, 12);
  const offset = options.cursor ? Math.max(0, Number(Buffer.from(options.cursor, 'base64url').toString()) || 0) : 0;
  const typeFilter = options.type && options.type !== 'all' ? ` AND p.type='${options.type}'` : '';
  if (viewerId && (await isBlocked(viewerId, user.id)) && viewerId !== user.id) throw notFound('Profile not found');
  const params: unknown[] = [user.id, offset, take + 1];
  let select = postSelect;
  if (viewerId) {
    params.push(viewerId);
    select = postSelect.replaceAll('$VIEWER', '$4');
  } else {
    select = postSelect.replaceAll('$VIEWER', 'NULL');
  }
  const { rows } = await query(
    `SELECT ${select} FROM posts p
     JOIN users u ON u.id=p.author_id
     JOIN profiles pr ON pr.user_id=p.author_id
     WHERE p.author_id=$1 AND p.deleted_at IS NULL${typeFilter}
     ORDER BY p.created_at DESC OFFSET $2 LIMIT $3`,
    params
  );
  return {
    items: rows.slice(0, take).map((r) => serialized(r, viewerId)),
    nextCursor: rows.length > take ? Buffer.from(String(offset + take)).toString('base64url') : null,
  };
}

export async function popularHashtags(limit = 8) {
  const { rows } = await query(
    `SELECT h.tag, count(ph.post_id)::int AS posts
     FROM hashtags h JOIN post_hashtags ph ON ph.hashtag_id=h.id
     JOIN posts p ON p.id=ph.post_id AND p.deleted_at IS NULL
     GROUP BY h.id ORDER BY posts DESC LIMIT $1`,
    [clampInt(limit, 1, 30, 8)]
  );
  return rows;
}

export async function searchPosts(viewerId: string, q: string, limit = 12) {
  const take = clampInt(limit, 1, 30, 12);
  const { rows } = await query(
    `SELECT ${viewerSub(postSelect, viewerId)}
     FROM posts p
     JOIN users u ON u.id=p.author_id
     JOIN profiles pr ON pr.user_id=p.author_id
     WHERE p.deleted_at IS NULL AND u.is_active=true AND p.visibility='public' AND pr.is_private=false
       AND (p.caption ILIKE $2 OR u.username ILIKE $2 OR pr.display_name ILIKE $2)
       AND NOT EXISTS(SELECT 1 FROM blocks b WHERE (b.blocker_id=$1 AND b.blocked_id=p.author_id) OR (b.blocker_id=p.author_id AND b.blocked_id=$1))
     ORDER BY p.created_at DESC LIMIT $3`,
    [viewerId, `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`, take]
  );
  return rows.map((r) => serialized(r, viewerId));
}

export async function searchHashtags(q: string, limit = 8) {
  const { rows } = await query(
    `SELECT h.tag, count(ph.post_id)::int AS posts FROM hashtags h
     LEFT JOIN post_hashtags ph ON ph.hashtag_id=h.id
     WHERE h.tag ILIKE $1 GROUP BY h.id ORDER BY posts DESC LIMIT $2`,
    [`%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`, clampInt(limit, 1, 20, 8)]
  );
  return rows;
}
