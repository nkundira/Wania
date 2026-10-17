import { query, queryOne, execute } from '../config/db.js';

export async function createPost(req, res, next) {
  try {
    const { content, imageUrl } = req.body;
    if (!content?.trim() && !imageUrl) return res.status(400).json({ error: 'Post must have content or an image' });
    if (content && content.length > 5000) return res.status(400).json({ error: 'Post too long (max 5000 chars)' });
    const result = await execute('INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)', [req.user.id, content || null, imageUrl || null]);
    const post = await queryOne(
      `SELECT p.*, u.username, u.display_name, u.profile_picture FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?`,
      [result.insertId]
    );
    res.status(201).json({ post });
  } catch (err) { next(err); }
}

export async function listPosts(req, res, next) {
  try {
    const { page = 1, limit = 20, userId } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    let sql = `
      SELECT p.*, u.username, u.display_name, u.profile_picture,
        (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count,
        (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ?) as liked_by_me
      FROM posts p JOIN users u ON p.user_id = u.id`;
    const params = [req.userId || 0];
    if (userId) { sql += ' WHERE p.user_id = ?'; params.push(userId); }
    sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    const posts = await query(sql, params);
    res.json({ posts, page: parseInt(page) });
  } catch (err) { next(err); }
}

export async function getPost(req, res, next) {
  try {
    const post = await queryOne(
      `SELECT p.*, u.username, u.display_name, u.profile_picture,
        (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count,
        (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ?) as liked_by_me
       FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?`,
      [req.userId || 0, req.params.postId]
    );
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json({ post });
  } catch (err) { next(err); }
}

export async function deletePost(req, res, next) {
  try {
    const post = await queryOne('SELECT user_id FROM posts WHERE id = ?', [req.params.postId]);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.user_id !== req.user.id && !['moderator', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await execute('DELETE FROM posts WHERE id = ?', [req.params.postId]);
    res.json({ message: 'Post deleted' });
  } catch (err) { next(err); }
}

export async function likePost(req, res, next) {
  try {
    const { postId } = req.params;
    const post = await queryOne('SELECT id, user_id FROM posts WHERE id = ?', [postId]);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const existing = await queryOne('SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?', [postId, req.user.id]);
    if (existing) {
      await execute('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', [postId, req.user.id]);
      return res.json({ liked: false });
    }
    await execute('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)', [postId, req.user.id]);
    if (post.user_id !== req.user.id) {
      await execute(
        'INSERT INTO notifications (user_id, actor_id, type, title, body, link) VALUES (?, ?, "like", ?, ?, ?)',
        [post.user_id, req.user.id, 'New like', `${req.user.display_name} liked your post`, `/community/post/${postId}`]
      );
    }
    res.json({ liked: true });
  } catch (err) { next(err); }
}

export async function addComment(req, res, next) {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Comment content required' });
    const post = await queryOne('SELECT id, user_id FROM posts WHERE id = ?', [postId]);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const result = await execute('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)', [postId, req.user.id, content]);
    if (post.user_id !== req.user.id) {
      await execute(
        'INSERT INTO notifications (user_id, actor_id, type, title, body, link) VALUES (?, ?, "comment", ?, ?, ?)',
        [post.user_id, req.user.id, 'New comment', `${req.user.display_name} commented on your post`, `/community/post/${postId}`]
      );
    }
    const comment = await queryOne(
      'SELECT c.*, u.username, u.display_name, u.profile_picture FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?',
      [result.insertId]
    );
    res.status(201).json({ comment });
  } catch (err) { next(err); }
}

export async function listComments(req, res, next) {
  try {
    const comments = await query(
      'SELECT c.*, u.username, u.display_name, u.profile_picture FROM comments c JOIN users u ON c.user_id = u.id WHERE c.post_id = ? ORDER BY c.created_at ASC',
      [req.params.postId]
    );
    res.json({ comments });
  } catch (err) { next(err); }
}

export async function followUser(req, res, next) {
  try {
    const { userId } = req.params;
    if (parseInt(userId) === req.user.id) return res.status(400).json({ error: 'Cannot follow yourself' });
    const target = await queryOne('SELECT id, display_name FROM users WHERE id = ?', [userId]);
    if (!target) return res.status(404).json({ error: 'User not found' });
    const existing = await queryOne('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?', [req.user.id, userId]);
    if (existing) {
      await execute('DELETE FROM follows WHERE follower_id = ? AND following_id = ?', [req.user.id, userId]);
      return res.json({ following: false });
    }
    await execute('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)', [req.user.id, userId]);
    await execute(
      'INSERT INTO notifications (user_id, actor_id, type, title, body, link) VALUES (?, ?, "follow", ?, ?, ?)',
      [userId, req.user.id, 'New follower', `${req.user.display_name} started following you`, `/profile/${req.user.username}`]
    );
    res.json({ following: true });
  } catch (err) { next(err); }
}

export async function getUserProfile(req, res, next) {
  try {
    const user = await queryOne(
      'SELECT id, username, display_name, bio, interests, profile_picture, is_online, last_seen, created_at FROM users WHERE username = ?',
      [req.params.username]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    const followerCount = await queryOne('SELECT COUNT(*) as c FROM follows WHERE following_id = ?', [user.id]);
    const followingCount = await queryOne('SELECT COUNT(*) as c FROM follows WHERE follower_id = ?', [user.id]);
    const postCount = await queryOne('SELECT COUNT(*) as c FROM posts WHERE user_id = ?', [user.id]);
    let isFollowing = false;
    if (req.userId) {
      const f = await queryOne('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?', [req.userId, user.id]);
      isFollowing = !!f;
    }
    const completedCourses = await query(
      `SELECT c.title, c.slug, c.category FROM course_certificates cc JOIN courses c ON cc.course_id = c.id WHERE cc.user_id = ?`,
      [user.id]
    );
    res.json({
      profile: {
        id: user.id, username: user.username, displayName: user.display_name,
        bio: user.bio, interests: user.interests, profilePicture: user.profile_picture,
        isOnline: user.is_online, lastSeen: user.last_seen, createdAt: user.created_at,
        followerCount: followerCount.c, followingCount: followingCount.c, postCount: postCount.c,
        isFollowing, completedCourses, isMe: req.userId === user.id
      }
    });
  } catch (err) { next(err); }
}

export async function searchUsers(req, res, next) {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ users: [] });
    const users = await query(
      'SELECT id, username, display_name, profile_picture, is_online FROM users WHERE (username LIKE ? OR display_name LIKE ?) AND id != ? LIMIT 20',
      [`%${q}%`, `%${q}%`, req.userId || 0]
    );
    res.json({ users });
  } catch (err) { next(err); }
}

export async function suggestedUsers(req, res, next) {
  try {
    const users = await query(
      `SELECT u.id, u.username, u.display_name, u.profile_picture, u.is_online
       FROM users u WHERE u.id != ? AND u.id NOT IN (SELECT following_id FROM follows WHERE follower_id = ?)
       ORDER BY u.created_at DESC LIMIT 6`,
      [req.userId || 0, req.userId || 0]
    );
    res.json({ users });
  } catch (err) { next(err); }
}

export async function getNotifications(req, res, next) {
  try {
    const notifications = await query(
      `SELECT n.*, u.username as actor_username, u.display_name as actor_name, u.profile_picture as actor_picture
       FROM notifications n LEFT JOIN users u ON n.actor_id = u.id
       WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT 50`,
      [req.user.id]
    );
    const unread = await queryOne('SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0', [req.user.id]);
    res.json({ notifications, unreadCount: unread.c });
  } catch (err) { next(err); }
}

export async function markNotificationsRead(req, res, next) {
  try {
    await execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    res.json({ message: 'All marked read' });
  } catch (err) { next(err); }
}

export async function reportContent(req, res, next) {
  try {
    const { reason, reportedUserId, postId } = req.body;
    if (!reason?.trim()) return res.status(400).json({ error: 'Reason required' });
    await execute(
      'INSERT INTO reports (reporter_id, reported_user_id, post_id, reason) VALUES (?, ?, ?, ?)',
      [req.user.id, reportedUserId || null, postId || null, reason]
    );
    res.status(201).json({ message: 'Report submitted' });
  } catch (err) { next(err); }
}
