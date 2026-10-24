import { io } from 'socket.io-client';

const BASE = process.env.BASE_URL || 'http://localhost:4000';
const suffix = Date.now().toString(36).slice(-6);
let failures = 0;

function check(name, condition, detail = '') {
  if (condition) console.log(`  ok   ${name}`);
  else {
    failures++;
    console.error(`  FAIL ${name}${detail ? ` - ${detail}` : ''}`);
  }
}

async function api(path, { token, method = 'GET', body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: form ?? (body ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
  return data;
}

async function register(name) {
  return api('/api/auth/register', {
    method: 'POST',
    body: {
      username: `${name}_${suffix}`,
      email: `${name}_${suffix}@example.com`,
      password: 'password123',
      displayName: `${name} Tester`,
    },
  });
}

function connect(token) {
  return new Promise((resolve, reject) => {
    const socket = io(BASE, { auth: { token }, transports: ['websocket'] });
    socket.once('ready', () => resolve(socket));
    socket.once('connect_error', reject);
    setTimeout(() => reject(new Error('socket connect timeout')), 5000);
  });
}

function waitFor(socket, event, timeout = 5000, predicate = () => true) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`timeout waiting for ${event}`));
    }, timeout);
    const handler = (payload) => {
      if (!predicate(payload)) return;
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(payload);
    };
    socket.on(event, handler);
  });
}

function emitAck(socket, event, payload) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`ack timeout for ${event}`)), 5000);
    socket.emit(event, payload, (result) => {
      clearTimeout(timer);
      if (!result?.ok) reject(new Error(result?.error || `${event} failed`));
      else resolve(result);
    });
  });
}

async function main() {
  console.log(`WANIA smoke test against ${BASE}`);
  const health = await fetch(`${BASE}/api/health`).then((r) => r.json());
  check('health endpoint', health.ok === true);

  const alice = await register('alice');
  const bob = await register('bob');
  check('register two users', Boolean(alice.accessToken && bob.accessToken));
  const A = alice.accessToken;
  const B = bob.accessToken;

  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  const form = new FormData();
  form.append('file', new Blob([png], { type: 'image/png' }), 'pixel.png');
  form.append('purpose', 'post');
  const uploaded = await api('/api/media', { token: A, method: 'POST', form });
  check('media upload', Boolean(uploaded.media?.id));
  const mediaId = uploaded.media.id;
  const mediaUrl = uploaded.media.url;

  const mediaRes = await fetch(`${BASE}${mediaUrl}`);
  check('signed media access', mediaRes.status === 200);
  const noTokenRes = await fetch(`${BASE}/api/media/${mediaId}`);
  check('media without token denied', noTokenRes.status === 403 || noTokenRes.status === 401);

  const post = (await api('/api/posts', {
    token: A,
    method: 'POST',
    body: { type: 'post', caption: 'Smoke test #wania', mediaIds: [mediaId] },
  })).post;
  check('create post', Boolean(post.id));

  await api(`/api/users/${bob.user.id}/follow`, { token: A, method: 'POST' });
  const bobProfile = (await api('/api/users/bob_' + suffix, { token: A })).profile;
  check('follow creates relationship', bobProfile.isFollowing === true);

  const feed = await api('/api/feed', { token: B });
  check('follower sees post in feed', feed.items.some((p) => p.id === post.id));

  const liked = await api(`/api/posts/${post.id}/like`, { token: B, method: 'POST' });
  check('like post', liked.liked === true && liked.likeCount === 1);
  const likedAgain = await api(`/api/posts/${post.id}/like`, { token: B, method: 'POST' });
  check('duplicate like prevented', likedAgain.likeCount === 1);

  const comment = (await api(`/api/posts/${post.id}/comments`, {
    token: B,
    method: 'POST',
    body: { body: 'Great post!' },
  })).comment;
  check('comment created', Boolean(comment.id));
  const saved = await api(`/api/posts/${post.id}/save`, { token: B, method: 'POST' });
  check('save post', saved.saved === true);

  const story = (await api('/api/stories', {
    token: A,
    method: 'POST',
    body: { mediaId, caption: 'Smoke story', privacy: 'everyone' },
  })).story;
  check('create story', Boolean(story.id));
  const storyFeed = await api('/api/stories/feed', { token: B });
  check('story visible in feed', storyFeed.groups.some((g) => g.stories.some((s) => s.id === story.id)));
  await api(`/api/stories/${story.id}/react`, { token: B, method: 'POST', body: { emoji: '🔥' } });
  check('story reaction', true);

  const conversation = (await api('/api/conversations', {
    token: A,
    method: 'POST',
    body: { type: 'direct', memberIds: [bob.user.id] },
  })).conversation;
  check('create direct conversation', Boolean(conversation.id));

  const restMessage = (await api(`/api/conversations/${conversation.id}/messages`, {
    token: A,
    method: 'POST',
    body: { body: 'Hello from REST' },
  })).message;
  check('send REST message', restMessage.body === 'Hello from REST');

  const notifications = await api('/api/notifications', { token: B });
  check('notifications delivered', notifications.items.length > 0);

  const aiStatus = await api('/api/ai/status', { token: A });
  check('AI status endpoint', typeof aiStatus.configured === 'boolean');
  const ai = await api('/api/ai/chat', {
    token: A,
    method: 'POST',
    body: { message: 'How do I create a story?', page: 'home' },
  });
  check('AI chat responds safely', Boolean(ai.answer));

  const s1 = await connect(A);
  const s2 = await connect(B);
  check('socket auth for both users', s1.connected && s2.connected);

  await emitAck(s2, 'conversation:join', { conversationId: conversation.id });
  const incoming = waitFor(s2, 'message:new', 5000, (m) => m.conversationId === conversation.id);
  await emitAck(s1, 'message:send', { conversationId: conversation.id, body: 'Hello over Socket.IO' });
  const received = await incoming;
  check('socket message delivery', received.body === 'Hello over Socket.IO');
  check('message attachments/media serialized', Array.isArray(received.attachments));

  const readEvent = waitFor(s1, 'message:read', 5000, (e) => e.conversationId === conversation.id);
  await emitAck(s2, 'message:read', { conversationId: conversation.id });
  check('read receipt event', Boolean((await readEvent).userId));

  const callIncoming = waitFor(s2, 'call:incoming', 5000);
  const invite = await emitAck(s1, 'call:invite', { calleeId: bob.user.id, type: 'audio' });
  const incomingCall = await callIncoming;
  check('call invite delivered', incomingCall.call.id === invite.call.id);
  const accepted = waitFor(s1, 'call:accepted', 5000);
  await emitAck(s2, 'call:accept', { callId: invite.call.id });
  await accepted;
  check('call accepted', true);

  const offerReceived = waitFor(s2, 'call:offer', 5000);
  s1.emit('call:offer', { callId: invite.call.id, sdp: { type: 'offer', sdp: 'v=0 test' } });
  const offer = await offerReceived;
  check('WebRTC offer relayed', offer.sdp.sdp === 'v=0 test');

  const ended = waitFor(s2, 'call:ended', 5000);
  await emitAck(s1, 'call:end', { callId: invite.call.id });
  await ended;
  check('call ended', true);
  const history = await api('/api/calls', { token: A });
  check('call history stored', history.calls.length > 0);

  s1.close();
  s2.close();

  console.log(failures ? `\n${failures} check(s) failed` : '\nAll smoke checks passed');
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error('\nSmoke test crashed:', err.message);
  process.exit(1);
});
