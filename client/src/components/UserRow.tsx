import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { UserSummary } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/format';
import { Avatar } from './Avatar';
import { FollowButton } from './FollowButton';

type UserRowProps = {
  user: UserSummary;
  subtitle?: ReactNode;
  action?: ReactNode;
  showFollow?: boolean;
  isMe?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onFollowChange?: (state: { following: boolean; requested: boolean }) => void;
};

export function UserRow({ user, subtitle, action, showFollow = true, isMe, size = 'md', className, onFollowChange }: UserRowProps) {
  const { user: currentUser } = useAuth();
  const avatarSize = size === 'lg' ? 56 : size === 'sm' ? 36 : 44;
  const self = isMe ?? currentUser?.id === user.id;
  return (
    <div className={cn('flex items-center gap-3 py-2', className)}>
      <Link to={`/u/${user.username}`} className="shrink-0" aria-label={`View ${user.displayName}`}>
        <Avatar user={user} size={avatarSize} online={user.isOnline} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link to={`/u/${user.username}`} className="block truncate text-sm font-semibold text-white hover:underline">
          {user.displayName}
          {user.isOnline && <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 align-middle" />}
        </Link>
        <p className="truncate text-xs text-zinc-500">
          @{user.username}
          {subtitle ? <span className="text-zinc-400"> · {subtitle}</span> : null}
        </p>
      </div>
      {action ??
        (showFollow && (
          <FollowButton
            userId={user.id}
            isFollowing={Boolean(user.isFollowing)}
            followRequested={Boolean(user.followRequested)}
            isPrivate={user.isPrivate}
            isMe={self}
            isBlocked={user.isBlocked}
            onChange={onFollowChange}
          />
        ))}
    </div>
  );
}
