import bcrypt from 'bcryptjs';
import { body } from 'express-validator';
import { query, queryOne, execute } from '../config/db.js';
import { generateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const isProd = process.env.NODE_ENV === 'production';
const cookieOpts = {
  httpOnly: true,
  secure: isProd,
  // Cross-site (Vercel frontend -> separate backend) requires SameSite=None + Secure.
  sameSite: isProd ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000
};

export const registerValidators = [
  body('username').isLength({ min: 3, max: 50 }).matches(/^[a-zA-Z0-9_]+$/).withMessage('Username must be 3-50 characters (letters, numbers, underscore)'),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('displayName').isLength({ min: 2, max: 100 }).withMessage('Display name 2-100 characters'),
  validate
];

export async function register(req, res, next) {
  try {
    const { username, email, password, displayName } = req.body;
    const existing = await queryOne('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existing) return res.status(409).json({ error: 'Username or email already taken' });
    const hash = await bcrypt.hash(password, 12);
    const result = await execute(
      'INSERT INTO users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)',
      [username, email, hash, displayName]
    );
    const user = { id: result.insertId, username, email, display_name: displayName, role: 'student' };
    const token = generateToken(user);
    res.cookie('token', token, cookieOpts);
    res.status(201).json({ user: { id: user.id, username, email, displayName, role: 'student' }, token });
  } catch (err) { next(err); }
}

export const loginValidators = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password required'),
  validate
];

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid email or password' });
    const token = generateToken(user);
    res.cookie('token', token, cookieOpts);
    await execute('UPDATE users SET is_online = 1, last_seen = NOW() WHERE id = ?', [user.id]);
    res.json({
      user: { id: user.id, username: user.username, email: user.email, displayName: user.display_name, bio: user.bio, interests: user.interests, profilePicture: user.profile_picture, role: user.role },
      token
    });
  } catch (err) { next(err); }
}

export async function logout(req, res) {
  res.clearCookie('token', cookieOpts);
  if (req.user) {
    await execute('UPDATE users SET is_online = 0, last_seen = NOW() WHERE id = ?', [req.user.id]).catch(() => {});
  }
  res.json({ message: 'Logged out' });
}

export async function me(req, res) {
  const u = req.user;
  res.json({
    user: {
      id: u.id, username: u.username, email: u.email, displayName: u.display_name,
      bio: u.bio, interests: u.interests, profilePicture: u.profile_picture,
      role: u.role, isOnline: u.is_online, lastSeen: u.last_seen, createdAt: u.created_at
    }
  });
}

export async function updateProfile(req, res, next) {
  try {
    const { displayName, bio, interests, profilePicture } = req.body;
    const sets = [];
    const params = [];
    if (displayName !== undefined) { sets.push('display_name = ?'); params.push(displayName); }
    if (bio !== undefined) { sets.push('bio = ?'); params.push(bio); }
    if (interests !== undefined) { sets.push('interests = ?'); params.push(interests); }
    if (profilePicture !== undefined) { sets.push('profile_picture = ?'); params.push(profilePicture); }
    if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update' });
    params.push(req.user.id);
    await execute(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
    const updated = await queryOne('SELECT id, username, email, display_name, bio, interests, profile_picture, role FROM users WHERE id = ?', [req.user.id]);
    res.json({ user: { id: updated.id, username: updated.username, email: updated.email, displayName: updated.display_name, bio: updated.bio, interests: updated.interests, profilePicture: updated.profile_picture, role: updated.role } });
  } catch (err) { next(err); }
}

export const changePasswordValidators = [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  validate
];

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await queryOne('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect' });
    const hash = await bcrypt.hash(newPassword, 12);
    await execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
    res.json({ message: 'Password updated' });
  } catch (err) { next(err); }
}
