import { query } from '../db/pool.js';
import { forbidden, notFound } from '../utils/errors.js';

export async function isFollowing(followerId: string, followingId: string) {
  const { rowCount } = await query(`SELECT 1 FROM follows WHERE follower_id=$1 AND following_id=$2`, [
    followerId,
    followingId,
  ]);
  return Boolean(rowCount);
}

export async function hasPendingRequest(requesterId: string, targetId: string) {
  const { rowCount } = await query(
    `SELECT 1 FROM follow_requests WHERE requester_id=$1 AND target_id=$2 AND status='pending'`,
    [requesterId, targetId]
  );
  return Boolean(rowCount);
}

export async function isBlocked(a: string, b: string) {
  if (a === b) return false;
  const { rowCount } = await query(
    `SELECT 1 FROM blocks WHERE (blocker_id=$1 AND blocked_id=$2) OR (blocker_id=$2 AND blocked_id=$1)`,
    [a, b]
  );
  return Boolean(rowCount);
}

export async function assertNotBlocked(a: string, b: string) {
  if (await isBlocked(a, b)) throw forbidden('This interaction is unavailable');
}

export async function canViewAuthorContent(viewerId: string | null, authorId: string, isPrivate: boolean) {
  if (viewerId && viewerId === authorId) return true;
  if (!viewerId) return !isPrivate;
  if (!isPrivate) return true;
  return isFollowing(viewerId, authorId);
}

export async function canViewStory(viewerId: string, authorId: string, privacy: 'everyone' | 'followers') {
  if (viewerId === authorId) return true;
  if (privacy === 'everyone') return true;
  return isFollowing(viewerId, authorId);
}

export type PostAccessRow = {
  id: string;
  author_id: string;
  visibility: 'public' | 'followers';
  is_private: boolean;
  deleted_at: string | null;
};

export async function getPostAccess(postId: string) {
  const { rows } = await query<PostAccessRow>(
    `SELECT p.id, p.author_id, p.visibility, pr.is_private, p.deleted_at
     FROM posts p JOIN profiles pr ON pr.user_id = p.author_id
     WHERE p.id = $1`,
    [postId]
  );
  return rows[0] ?? null;
}

export async function assertCanViewPost(viewerId: string | null, postId: string) {
  const post = await getPostAccess(postId);
  if (!post || post.deleted_at) throw notFound('Post not found');
  if (viewerId && (await isBlocked(viewerId, post.author_id))) throw notFound('Post not found');
  if (viewerId === post.author_id) return post;
  const allowed = await canViewAuthorContent(viewerId, post.author_id, post.is_private);
  if (!allowed || (post.visibility === 'followers' && (!viewerId || !(await isFollowing(viewerId, post.author_id))))) {
    if (viewerId === post.author_id) return post;
    throw forbidden('This account is private');
  }
  return post;
}

export async function getConversationMember(conversationId: string, userId: string) {
  const { rows } = await query(
    `SELECT cm.*, c.type, c.title FROM conversation_members cm
     JOIN conversations c ON c.id = cm.conversation_id
     WHERE cm.conversation_id=$1 AND cm.user_id=$2`,
    [conversationId, userId]
  );
  return rows[0] ?? null;
}

export async function assertConversationMember(conversationId: string, userId: string) {
  const member = await getConversationMember(conversationId, userId);
  if (!member) throw forbidden('You are not part of this conversation');
  return member;
}
