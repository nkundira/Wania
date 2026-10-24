import { signMediaUrl } from './media.service.js';

export type UserSummaryRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_media_id: string | null;
  is_private?: boolean;
  is_following?: boolean;
  follow_requested?: boolean;
  is_blocked?: boolean;
  is_online?: boolean;
};

export function userSummary(row: UserSummaryRow, viewerId?: string | null) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_media_id ? signMediaUrl(row.avatar_media_id, viewerId ?? 'anonymous') : null,
    isPrivate: Boolean(row.is_private),
    isFollowing: Boolean(row.is_following),
    followRequested: Boolean(row.follow_requested),
    isBlocked: Boolean(row.is_blocked),
    isOnline: Boolean(row.is_online),
  };
}

export function titleCase(value: string) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}
