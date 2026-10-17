import { query, queryOne, execute } from '../config/db.js';

export async function listConversations(req, res, next) {
  try {
    const conversations = await query(
      `SELECT c.id, c.type, c.title, c.updated_at,
        cp.last_read_at,
        (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01') AND m.sender_id != ?) as unread_count,
        u2.id as other_id, u2.username as other_username, u2.display_name as other_name,
        u2.profile_picture as other_picture, u2.is_online as other_online,
        (SELECT m.content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
        (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message_at
       FROM conversation_participants cp
       JOIN conversations c ON cp.conversation_id = c.id
       LEFT JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id != cp.user_id
       LEFT JOIN users u2 ON cp2.user_id = u2.id
       WHERE cp.user_id = ?
       ORDER BY COALESCE(last_message_at, c.updated_at) DESC`,
      [req.user.id, req.user.id]
    );
    res.json({ conversations });
  } catch (err) { next(err); }
}

export async function getOrCreatePrivateConversation(req, res, next) {
  try {
    const { userId } = req.body;
    if (parseInt(userId) === req.user.id) return res.status(400).json({ error: 'Cannot message yourself' });
    const target = await queryOne('SELECT id FROM users WHERE id = ?', [userId]);
    if (!target) return res.status(404).json({ error: 'User not found' });
    let conv = await queryOne(
      `SELECT c.id FROM conversations c
       JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = ?
       JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = ?
       WHERE c.type = 'private' AND (SELECT COUNT(*) FROM conversation_participants WHERE conversation_id = c.id) = 2
       LIMIT 1`,
      [req.user.id, userId]
    );
    if (!conv) {
      const result = await execute("INSERT INTO conversations (type) VALUES ('private')");
      const convId = Number(result.insertId);
      await execute('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?), (?, ?)', [convId, req.user.id, convId, userId]);
      conv = { id: convId };
    }
    res.json({ conversationId: conv.id });
  } catch (err) { next(err); }
}

export async function getMessages(req, res, next) {
  try {
    const { conversationId } = req.params;
    const { before, limit = 50 } = req.query;
    const participant = await queryOne(
      'SELECT id FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
      [conversationId, req.user.id]
    );
    if (!participant) return res.status(403).json({ error: 'Not a participant of this conversation' });
    let sql = `SELECT m.*, u.username as sender_username, u.display_name as sender_name, u.profile_picture as sender_picture
               FROM messages m JOIN users u ON m.sender_id = u.id
               WHERE m.conversation_id = ?`;
    const params = [conversationId];
    if (before) { sql += ' AND m.id < ?'; params.push(before); }
    sql += ' ORDER BY m.created_at DESC LIMIT ?';
    params.push(parseInt(limit));
    const messages = await query(sql, params);
    messages.reverse();
    await execute('UPDATE conversation_participants SET last_read_at = NOW() WHERE conversation_id = ? AND user_id = ?', [conversationId, req.user.id]);
    res.json({ messages });
  } catch (err) { next(err); }
}

export async function sendMessage(req, res, next) {
  try {
    const { conversationId } = req.params;
    const { content, messageType = 'text', imageUrl } = req.body;
    const participant = await queryOne(
      'SELECT id FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
      [conversationId, req.user.id]
    );
    if (!participant) return res.status(403).json({ error: 'Not a participant' });
    if (!content?.trim() && !imageUrl) return res.status(400).json({ error: 'Message content required' });
    if (content && content.length > 5000) return res.status(400).json({ error: 'Message too long' });
    const result = await execute(
      'INSERT INTO messages (conversation_id, sender_id, content, message_type, image_url) VALUES (?, ?, ?, ?, ?)',
      [conversationId, req.user.id, content || '', messageType, imageUrl || null]
    );
    await execute('UPDATE conversations SET updated_at = NOW() WHERE id = ?', [conversationId]);
    const message = await queryOne(
      'SELECT m.*, u.username as sender_username, u.display_name as sender_name, u.profile_picture as sender_picture FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?',
      [result.insertId]
    );
    res.status(201).json({ message });
  } catch (err) { next(err); }
}

export async function blockUser(req, res, next) {
  try {
    const { userId } = req.params;
    if (parseInt(userId) === req.user.id) return res.status(400).json({ error: 'Cannot block yourself' });
    await execute('INSERT IGNORE INTO blocked_users (blocker_id, blocked_id) VALUES (?, ?)', [req.user.id, userId]);
    res.json({ message: 'User blocked' });
  } catch (err) { next(err); }
}

export async function unblockUser(req, res, next) {
  try {
    const { userId } = req.params;
    await execute('DELETE FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?', [req.user.id, userId]);
    res.json({ message: 'User unblocked' });
  } catch (err) { next(err); }
}

export async function getCallHistory(req, res, next) {
  try {
    const calls = await query(
      `SELECT cr.*, u1.username as caller_username, u1.display_name as caller_name, u1.profile_picture as caller_picture,
              u2.username as callee_username, u2.display_name as callee_name, u2.profile_picture as callee_picture
       FROM call_records cr
       JOIN users u1 ON cr.caller_id = u1.id
       JOIN users u2 ON cr.callee_id = u2.id
       WHERE cr.caller_id = ? OR cr.callee_id = ?
       ORDER BY cr.created_at DESC LIMIT 50`,
      [req.user.id, req.user.id]
    );
    res.json({ calls });
  } catch (err) { next(err); }
}
