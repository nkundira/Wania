import { api } from '../lib/api';
import type {
  AiConversation,
  AiMessage,
  CallRecord,
  Comment,
  Conversation,
  MediaAsset,
  Message,
  Notification,
  OnboardingProgress,
  Paged,
  Post,
  Profile,
  ProfileSettings,
  Story,
  StoryGroup,
  UserSummary,
} from '../types';

type AuthResponse = { accessToken: string; user: Profile; onboarding: OnboardingProgress };

export const authApi = {
  register: (body: { username: string; email: string; password: string; displayName: string }) =>
    api.post<AuthResponse>('/auth/register', body).then((r) => r.data),
  login: (body: { identifier: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', body).then((r) => r.data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get<{ user: Profile; onboarding: OnboardingProgress }>('/auth/me').then((r) => r.data),
  forgotPassword: (email: string) =>
    api
      .post<{ message: string; emailConfigured: boolean; devToken?: string }>('/auth/forgot-password', { email })
      .then((r) => r.data),
  resetPassword: (token: string, password: string) =>
    api.post<{ message: string }>('/auth/reset-password', { token, password }).then((r) => r.data),
  verifyEmail: (token: string) => api.post('/auth/verify-email', { token }).then((r) => r.data),
  sendVerification: () =>
    api.post<{ message: string; devToken?: string }>('/auth/send-verification').then((r) => r.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.patch<{ message: string; accessToken: string }>('/auth/password', { currentPassword, newPassword }).then((r) => r.data),
  deactivate: (password: string) => api.post('/auth/deactivate', { password }).then((r) => r.data),
  reactivate: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/reactivate', { email, password }).then((r) => r.data),
  deleteAccount: (password: string) =>
    api.delete('/auth/account', { data: { password, confirm: 'DELETE' } }).then((r) => r.data),
};

export const usersApi = {
  get: (username: string) => api.get<{ profile: Profile }>(`/users/${username}`).then((r) => r.data.profile),
  updateMe: (body: Partial<Record<string, unknown>>) =>
    api.patch<{ user: Profile }>('/users/me', body).then((r) => r.data.user),
  search: (q: string, limit = 20) =>
    api.get<{ users: UserSummary[] }>('/users/search', { params: { q, limit } }).then((r) => r.data.users),
  follow: (id: string) => api.post<{ following: boolean; requested: boolean }>(`/users/${id}/follow`).then((r) => r.data),
  unfollow: (id: string) => api.delete<{ following: boolean }>(`/users/${id}/follow`).then((r) => r.data),
  followers: (username: string, cursor?: string) =>
    api
      .get<{ items: UserSummary[]; nextCursor: string | null; profile: { id: string; username: string; displayName: string; isMe: boolean } }>(
        `/users/${username}/followers`,
        { params: { cursor } }
      )
      .then((r) => r.data),
  following: (username: string, cursor?: string) =>
    api
      .get<{ items: UserSummary[]; nextCursor: string | null; profile: { id: string; username: string; displayName: string; isMe: boolean } }>(
        `/users/${username}/following`,
        { params: { cursor } }
      )
      .then((r) => r.data),
  followRequests: () =>
    api.get<{ requests: UserSummary[] }>('/users/me/follow-requests').then((r) => r.data.requests),
  respondRequest: (requesterId: string, action: 'accept' | 'decline') =>
    api.post(`/users/me/follow-requests/${requesterId}/${action}`).then((r) => r.data),
  blocked: () => api.get<{ users: UserSummary[] }>('/users/me/blocked').then((r) => r.data.users),
  block: (id: string) => api.post(`/users/${id}/block`).then((r) => r.data),
  unblock: (id: string) => api.delete(`/users/${id}/block`).then((r) => r.data),
  report: (body: { targetType: string; targetId: string; reason: string; details?: string }) =>
    api.post('/reports', body).then((r) => r.data),
};

export const postsApi = {
  feed: (cursor?: string) =>
    api.get<Paged<Post>>('/feed', { params: { cursor } }).then((r) => r.data),
  explore: (cursor?: string) =>
    api.get<Paged<Post>>('/explore', { params: { cursor } }).then((r) => r.data),
  reels: (cursor?: string) =>
    api.get<Paged<Post>>('/reels', { params: { cursor } }).then((r) => r.data),
  get: (id: string) => api.get<{ post: Post }>(`/posts/${id}`).then((r) => r.data.post),
  create: (body: {
    type: 'post' | 'reel';
    caption?: string;
    mediaIds: string[];
    location?: string;
    visibility?: 'public' | 'followers';
  }) => api.post<{ post: Post }>('/posts', body).then((r) => r.data.post),
  update: (id: string, caption: string) =>
    api.patch<{ post: Post }>(`/posts/${id}`, { caption }).then((r) => r.data.post),
  remove: (id: string) => api.delete(`/posts/${id}`).then((r) => r.data),
  like: (id: string) => api.post<{ liked: boolean; likeCount: number }>(`/posts/${id}/like`).then((r) => r.data),
  unlike: (id: string) => api.delete<{ liked: boolean; likeCount: number }>(`/posts/${id}/like`).then((r) => r.data),
  likes: (id: string) => api.get<{ users: UserSummary[] }>(`/posts/${id}/likes`).then((r) => r.data.users),
  comments: (id: string) => api.get<{ comments: Comment[] }>(`/posts/${id}/comments`).then((r) => r.data.comments),
  comment: (id: string, body: string, parentId?: string) =>
    api.post<{ comment: Comment }>(`/posts/${id}/comments`, { body, parentId }).then((r) => r.data.comment),
  deleteComment: (id: string) => api.delete(`/comments/${id}`).then((r) => r.data),
  save: (id: string) => api.post<{ saved: boolean }>(`/posts/${id}/save`).then((r) => r.data),
  unsave: (id: string) => api.delete<{ saved: boolean }>(`/posts/${id}/save`).then((r) => r.data),
  saved: (cursor?: string) => api.get<Paged<Post>>('/saved', { params: { cursor } }).then((r) => r.data),
  userPosts: (username: string, cursor?: string, type: 'post' | 'reel' | 'all' = 'all') =>
    api.get<Paged<Post>>(`/users/${username}/posts`, { params: { cursor, type } }).then((r) => r.data),
  search: (q: string) =>
    api
      .get<{ users: UserSummary[]; posts: Post[]; hashtags: { tag: string; posts: number }[]; query: string }>('/search', {
        params: { q },
      })
      .then((r) => r.data),
  trending: () => api.get<{ hashtags: { tag: string; posts: number }[] }>('/hashtags/trending').then((r) => r.data.hashtags),
  hashtag: (tag: string, cursor?: string) =>
    api.get<Paged<Post>>(`/hashtags/${encodeURIComponent(tag)}/posts`, { params: { cursor } }).then((r) => r.data),
};

export const storiesApi = {
  feed: () => api.get<{ groups: StoryGroup[] }>('/stories/feed').then((r) => r.data.groups),
  user: (username: string) => api.get<{ stories: Story[] }>(`/stories/user/${username}`).then((r) => r.data.stories),
  get: (id: string) => api.get<{ story: Story }>(`/stories/${id}`).then((r) => r.data.story),
  create: (body: { mediaId: string; caption?: string; privacy?: 'everyone' | 'followers'; hours?: number }) =>
    api.post<{ story: Story }>('/stories', body).then((r) => r.data.story),
  remove: (id: string) => api.delete(`/stories/${id}`).then((r) => r.data),
  react: (id: string, emoji: string) => api.post(`/stories/${id}/react`, { emoji }).then((r) => r.data),
  reply: (id: string, body: string) =>
    api.post<{ conversationId: string; message: Message }>(`/stories/${id}/reply`, { body }).then((r) => r.data),
  viewers: (id: string) => api.get<{ viewers: UserSummary[] }>(`/stories/${id}/viewers`).then((r) => r.data.viewers),
};

export const messagesApi = {
  list: () => api.get<{ conversations: Conversation[] }>('/conversations').then((r) => r.data.conversations),
  get: (id: string) => api.get<{ conversation: Conversation }>(`/conversations/${id}`).then((r) => r.data.conversation),
  create: (body: { type: 'direct' | 'group'; memberIds: string[]; title?: string }) =>
    api.post<{ conversation: Conversation }>('/conversations', body).then((r) => r.data.conversation),
  messages: (id: string, cursor?: string) =>
    api.get<Paged<Message>>(`/conversations/${id}/messages`, { params: { cursor } }).then((r) => r.data),
  send: (id: string, body: { body?: string; kind?: string; attachmentIds?: string[]; replyToId?: string; expiresAt?: string }) =>
    api.post<{ message: Message }>(`/conversations/${id}/messages`, body).then((r) => r.data.message),
  read: (id: string) => api.post(`/conversations/${id}/read`).then((r) => r.data),
  removeMessage: (id: string) => api.delete(`/messages/${id}`).then((r) => r.data),
  callHistory: () => api.get<{ calls: CallRecord[] }>('/calls').then((r) => r.data.calls),
  iceServers: () => api.get<{ iceServers: RTCIceServer[] }>('/calls/ice-servers').then((r) => r.data.iceServers),
};

export const notificationsApi = {
  list: (cursor?: string) =>
    api
      .get<{ items: Notification[]; nextCursor: string | null; unread: number }>('/notifications', { params: { cursor } })
      .then((r) => r.data),
  unread: () => api.get<{ unread: number }>('/notifications/unread-count').then((r) => r.data.unread),
  read: (id?: string) => api.post<{ unread: number }>('/notifications/read', { id }).then((r) => r.data.unread),
  preferences: (body: Partial<ProfileSettings>) =>
    api.patch<{ settings: ProfileSettings }>('/notifications/preferences', body).then((r) => r.data.settings),
};

export const aiApi = {
  status: () => api.get<{ configured: boolean; model: string | null }>('/ai/status').then((r) => r.data),
  chat: (body: { message: string; page?: string; conversationId?: string }) =>
    api
      .post<{ configured: boolean; answer: string; conversationId: string | null; historyEnabled?: boolean }>('/ai/chat', body)
      .then((r) => r.data),
  conversations: () =>
    api.get<{ conversations: AiConversation[] }>('/ai/conversations').then((r) => r.data.conversations),
  messages: (id: string) => api.get<{ messages: AiMessage[] }>(`/ai/conversations/${id}`).then((r) => r.data.messages),
  deleteConversation: (id: string) => api.delete(`/ai/conversations/${id}`).then((r) => r.data),
  clearHistory: () => api.delete('/ai/history').then((r) => r.data),
  progress: () => api.get<{ progress: OnboardingProgress }>('/onboarding/progress').then((r) => r.data.progress),
  updateProgress: (body: Partial<OnboardingProgress>) =>
    api.patch<{ progress: OnboardingProgress }>('/onboarding/progress', body).then((r) => r.data.progress),
  restartOnboarding: () => api.post<{ progress: OnboardingProgress }>('/onboarding/restart').then((r) => r.data.progress),
};

export type UploadResult = MediaAsset & { size: number };

export const mediaApi = {
  upload: async (file: File, purpose: string, onProgress?: (percent: number) => void) => {
    const form = new FormData();
    form.append('file', file);
    form.append('purpose', purpose);
    const { data } = await api.post<{ media: UploadResult }>('/media', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (event.total && onProgress) onProgress(Math.round((event.loaded / event.total) * 100));
      },
      timeout: 120000,
    });
    return data.media;
  },
};
