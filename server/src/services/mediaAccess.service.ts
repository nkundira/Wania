import { query } from '../db/pool.js';
import { canViewStory, isFollowing } from './access.service.js';
import type { MediaRow } from './media.service.js';

export async function canAccessMedia(media: MediaRow, viewerId: string | null) {
  if (media.purpose === 'avatar' || media.purpose === 'cover') return true;
  if (!viewerId || viewerId === 'anonymous') return false;
  if (media.owner_id === viewerId) return true;

  const { rows: postRows } = await query(
    `SELECT p.author_id, p.visibility, p.deleted_at, pr.is_private
     FROM post_media pm JOIN posts p ON p.id=pm.post_id JOIN profiles pr ON pr.user_id=p.author_id
     WHERE pm.media_id=$1 LIMIT 1`,
    [media.id]
  );
  if (postRows[0]) {
    const post = postRows[0];
    if (post.deleted_at) return false;
    if (post.author_id === viewerId) return true;
    if (!post.is_private && post.visibility === 'public') return true;
    if (!post.is_private && post.visibility === 'followers') return isFollowing(viewerId, post.author_id);
    if (post.is_private) return isFollowing(viewerId, post.author_id);
  }

  const { rows: storyRows } = await query(
    `SELECT author_id, privacy, expires_at, deleted_at FROM stories WHERE media_id=$1 LIMIT 1`,
    [media.id]
  );
  if (storyRows[0]) {
    const story = storyRows[0];
    if (story.deleted_at || new Date(story.expires_at).getTime() <= Date.now()) return false;
    return canViewStory(viewerId, story.author_id, story.privacy);
  }

  const { rows: messageRows } = await query(
    `SELECT m.id, m.sender_id, m.kind, m.expires_at, m.viewed_at, m.deleted_at,
            EXISTS(SELECT 1 FROM conversation_members cm WHERE cm.conversation_id=m.conversation_id AND cm.user_id=$2) AS is_member
     FROM message_attachments ma JOIN messages m ON m.id=ma.message_id
     WHERE ma.media_id=$1 LIMIT 1`,
    [media.id, viewerId]
  );
  if (messageRows[0]) {
    const message = messageRows[0];
    if (!message.is_member || message.deleted_at) return false;
    if (message.expires_at && new Date(message.expires_at).getTime() <= Date.now()) return false;
    if (message.kind === 'snap' && message.sender_id !== viewerId) {
      if (message.viewed_at && Date.now() - new Date(message.viewed_at).getTime() > 5 * 60 * 1000) return false;
    }
    return true;
  }

  return false;
}

export async function mediaMessageContext(mediaId: string) {
  const { rows } = await query(
    `SELECT m.id, m.sender_id, m.kind, m.viewed_at FROM message_attachments ma
     JOIN messages m ON m.id=ma.message_id WHERE ma.media_id=$1 LIMIT 1`,
    [mediaId]
  );
  return rows[0] ?? null;
}
