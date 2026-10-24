export type UserSummary = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isPrivate?: boolean;
  isFollowing?: boolean;
  followRequested?: boolean;
  isBlocked?: boolean;
  isOnline?: boolean;
  role?: string;
  muted?: boolean;
  lastReadAt?: string | null;
  viewedAt?: string;
  blockedAt?: string;
  requestedAt?: string;
};

export type ProfileSettings = {
  showActivity: boolean;
  lastSeenVisibility: 'everyone' | 'followers' | 'nobody';
  storyPrivacy: 'everyone' | 'followers';
  messagePrivacy: 'everyone' | 'followers';
  aiEnabled: boolean;
  aiHistoryEnabled: boolean;
  notifyFollows: boolean;
  notifyLikes: boolean;
  notifyComments: boolean;
  notifyMessages: boolean;
  notifyCalls: boolean;
};

export type Profile = {
  id: string;
  username: string;
  email?: string;
  emailVerified?: boolean;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  isPrivate: boolean;
  isFollowing: boolean;
  followRequested: boolean;
  isBlocked: boolean;
  hasBlockedViewer: boolean;
  isOnline: boolean;
  lastSeenAt: string | null;
  createdAt: string;
  counts: { followers: number; following: number; posts: number };
  canViewContent: boolean;
  settings?: ProfileSettings;
};

export type MediaAsset = {
  id: string;
  type: 'image' | 'video' | 'audio';
  mimeType: string;
  width?: number | null;
  height?: number | null;
  duration?: number | string | null;
  url: string;
};

export type Post = {
  id: string;
  type: 'post' | 'reel';
  caption: string;
  location: string | null;
  visibility: 'public' | 'followers';
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  saved: boolean;
  hashtags: string[];
  media: MediaAsset[];
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    isPrivate?: boolean;
    isFollowing?: boolean;
  };
  suggested?: boolean;
};

export type Comment = {
  id: string;
  postId: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  isOwner: boolean;
  author: { id: string; username: string; displayName: string; avatarUrl: string | null };
};

export type Story = {
  id: string;
  caption: string;
  privacy: 'everyone' | 'followers';
  expiresAt: string;
  createdAt: string;
  seen: boolean;
  viewCount: number;
  reactionCount: number;
  media: MediaAsset;
  author: { id: string; username: string; displayName: string; avatarUrl: string | null; isPrivate: boolean };
  reactions?: { emoji: string; user_id: string; username: string }[];
  isOwner?: boolean;
};

export type StoryGroup = {
  author: UserSummary;
  stories: Story[];
  allSeen: boolean;
};

export type Message = {
  id: string;
  conversationId: string;
  body: string;
  kind: 'text' | 'image' | 'video' | 'voice' | 'snap' | 'story_reply' | 'system';
  createdAt: string;
  expiresAt: string | null;
  viewedAt: string | null;
  deleted: boolean;
  attachments: (MediaAsset & { mediaId: string; kind: string })[];
  storyId: string | null;
  status: 'sent' | 'delivered' | 'read';
  isMine: boolean;
  sender: { id: string; username: string; displayName: string; avatarUrl: string | null };
  replyTo: { id: string; body: string; senderName: string } | null;
};

export type Conversation = {
  id: string;
  type: 'direct' | 'group';
  title: string;
  avatarUrl: string | null;
  members: UserSummary[];
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  lastMessage: { preview: string; kind: string; createdAt: string } | null;
  unreadCount: number;
  muted: boolean;
};

export type Notification = {
  id: string;
  type:
    | 'follow'
    | 'follow_request'
    | 'follow_accepted'
    | 'like'
    | 'comment'
    | 'mention'
    | 'story_reply'
    | 'story_reaction'
    | 'message'
    | 'call';
  entityType: string | null;
  entityId: string | null;
  data: Record<string, string | number | boolean | undefined>;
  readAt: string | null;
  createdAt: string;
  actor: UserSummary | null;
};

export type CallRecord = {
  id: string;
  type: 'audio' | 'video';
  status: string;
  direction: 'incoming' | 'outgoing';
  startedAt: string;
  answeredAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  peer: { id: string; username: string; displayName: string; avatarUrl: string | null };
};

export type OnboardingProgress = {
  welcomeSeen: boolean;
  tourStep: number;
  tourCompleted: boolean;
  tourSkipped: boolean;
  completedSteps: number[];
  updatedAt?: string;
};

export type AiConversation = {
  id: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AiMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  pending?: boolean;
  error?: boolean;
};

export type Paged<T> = { items: T[]; nextCursor: string | null };
