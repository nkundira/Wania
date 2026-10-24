import { useEffect, useState } from 'react';
import { Check, Clock3, UserPlus } from 'lucide-react';
import { getErrorMessage } from '../lib/api';
import { usersApi } from '../services/wania';
import { cn } from '../utils/format';
import { useToast } from '../contexts/ToastContext';
import { Spinner } from './ui';

type FollowButtonProps = {
  userId: string;
  isFollowing: boolean;
  followRequested?: boolean;
  isPrivate?: boolean;
  isMe?: boolean;
  isBlocked?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  onChange?: (state: { following: boolean; requested: boolean }) => void;
};

export function FollowButton({
  userId,
  isFollowing,
  followRequested = false,
  isPrivate = false,
  isMe = false,
  isBlocked = false,
  size = 'sm',
  className,
  onChange,
}: FollowButtonProps) {
  const [following, setFollowing] = useState(isFollowing);
  const [requested, setRequested] = useState(followRequested);
  const [loading, setLoading] = useState(false);
  const { error, success } = useToast();

  useEffect(() => {
    setFollowing(isFollowing);
    setRequested(followRequested);
  }, [isFollowing, followRequested]);

  if (isMe || isBlocked) return null;

  async function handleClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      if (following) {
        await usersApi.unfollow(userId);
        setFollowing(false);
        setRequested(false);
        onChange?.({ following: false, requested: false });
        success('Unfollowed');
      } else if (requested) {
        await usersApi.unfollow(userId);
        setRequested(false);
        onChange?.({ following: false, requested: false });
        success('Follow request cancelled');
      } else {
        const result = await usersApi.follow(userId);
        setFollowing(result.following);
        setRequested(result.requested);
        onChange?.(result);
        success(result.requested ? 'Follow request sent' : 'Following');
      }
    } catch (err) {
      error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const label = following ? 'Following' : requested ? 'Requested' : isPrivate ? 'Request' : 'Follow';
  const Icon = following ? Check : requested ? Clock3 : UserPlus;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={cn(
        'btn shrink-0',
        size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
        following || requested
          ? 'border border-white/10 bg-white/[0.04] text-zinc-300 hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300'
          : 'bg-grape-600 text-white hover:bg-grape-500',
        className
      )}
    >
      {loading ? <Spinner className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}
