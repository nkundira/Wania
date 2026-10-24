import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Bookmark,
  Film,
  Flag,
  Grid3X3,
  Lock,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Settings,
  Share2,
  ShieldOff,
  Video,
} from 'lucide-react';
import { assetUrl, getErrorMessage } from '../lib/api';
import { messagesApi, postsApi, storiesApi, usersApi } from '../services/wania';
import type { Post, Profile } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useCall } from '../contexts/CallContext';
import { useToast } from '../contexts/ToastContext';
import { cn, fullDate } from '../utils/format';
import { Avatar } from '../components/Avatar';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FollowButton } from '../components/FollowButton';
import { Modal } from '../components/Modal';
import { PostGrid } from '../components/PostGrid';
import { ReportModal } from '../components/ReportModal';
import { EmptyState, ErrorState, LoadingScreen, Spinner } from '../components/ui';

type Tab = 'posts' | 'reels' | 'saved';

export function ProfilePage() {
  const { username = '' } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const { startCall } = useCall();
  const { success, error } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState<Tab>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState('');
  const [postsReload, setPostsReload] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasStory, setHasStory] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const isMe = Boolean(me && profile && me.id === profile.id);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    setProfile(null);
    usersApi
      .get(username)
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [username]);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    storiesApi
      .user(profile.username)
      .then((data) => {
        if (!cancelled) setHasStory(data.length > 0);
      })
      .catch(() => {
        if (!cancelled) setHasStory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profile?.id, profile?.username]);

  useEffect(() => {
    if (!profile) return;
    if (!isMe && !profile.canViewContent) return;
    let cancelled = false;
    setPostsLoading(true);
    setPostsError('');
    setPosts([]);
    setCursor(null);
    const request =
      tab === 'saved'
        ? postsApi.saved()
        : postsApi.userPosts(profile.username, undefined, tab === 'reels' ? 'reel' : 'post');
    request
      .then((data) => {
        if (cancelled) return;
        setPosts(data.items);
        setCursor(data.nextCursor);
      })
      .catch((err) => {
        if (!cancelled) setPostsError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setPostsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profile?.id, profile?.canViewContent, isMe, tab, postsReload]);

  async function loadMore() {
    if (!profile || !cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data =
        tab === 'saved'
          ? await postsApi.saved(cursor)
          : await postsApi.userPosts(profile.username, cursor, tab === 'reels' ? 'reel' : 'post');
      setPosts((current) => [...current, ...data.items.filter((item) => !current.some((entry) => entry.id === item.id))]);
      setCursor(data.nextCursor);
    } catch (err) {
      error(getErrorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  }

  async function shareProfile() {
    if (!profile) return;
    const url = `${window.location.origin}/u/${profile.username}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${profile.displayName} on WANIA`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      success('Profile link copied');
    } catch (err) {
      if ((err as DOMException)?.name !== 'AbortError') error('Could not share this profile');
    }
  }

  async function openMessage() {
    if (!profile) return;
    setBusy(true);
    try {
      const conversation = await messagesApi.create({ type: 'direct', memberIds: [profile.id] });
      navigate(`/messages/${conversation.id}`);
    } catch (err) {
      error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function call(type: 'audio' | 'video') {
    if (!profile) return;
    try {
      await startCall(profile, type);
    } catch (err) {
      error(getErrorMessage(err));
    }
  }

  async function toggleBlock(): Promise<boolean> {
    if (!profile) return false;
    try {
      if (profile.isBlocked) {
        await usersApi.unblock(profile.id);
        setProfile({ ...profile, isBlocked: false });
        success('Unblocked');
      } else {
        await usersApi.block(profile.id);
        setProfile({ ...profile, isBlocked: true, isFollowing: false, canViewContent: false });
        success('Blocked');
      }
      setMenuOpen(false);
      return true;
    } catch (err) {
      error(getErrorMessage(err));
      return false;
    }
  }

  const tabs = useMemo(() => {
    const base: { value: Tab; label: string; icon: typeof Grid3X3 }[] = [
      { value: 'posts', label: 'Posts', icon: Grid3X3 },
      { value: 'reels', label: 'Reels', icon: Film },
    ];
    if (isMe) base.push({ value: 'saved', label: 'Saved', icon: Bookmark });
    return base;
  }, [isMe]);

  if (loading) return <LoadingScreen label="Loading profile…" />;
  if (loadError || !profile) {
    return (
      <div className="card mx-auto max-w-lg">
        <ErrorState message={loadError || 'This profile could not be found.'} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  const cover = assetUrl(profile.coverUrl);
  const avatarNode = (
    <span className={cn('inline-block rounded-full p-[3px]', hasStory ? 'bg-gradient-to-tr from-grape-600 via-fuchsia-500 to-amber-400' : 'bg-ink-900')}>
      <Avatar user={profile} size={92} ring />
    </span>
  );

  return (
    <div className="mx-auto max-w-4xl">
      <div className="card overflow-hidden">
        <div className="relative h-36 bg-gradient-to-r from-grape-900 via-ink-800 to-fuchsia-900/60 sm:h-48">
          {cover && <img src={cover} alt="" className="h-full w-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900/60 to-transparent" />
        </div>

        <div className="px-4 pb-4 sm:px-6">
          <div className="-mt-12 flex items-end justify-between gap-3 sm:-mt-14">
            {hasStory ? (
              <button onClick={() => navigate(`/stories/${profile.username}`)} aria-label="View story" className="shrink-0">
                {avatarNode}
              </button>
            ) : (
              <div className="shrink-0">{avatarNode}</div>
            )}

            <div className="mb-1 flex flex-wrap items-center justify-end gap-2">
              {isMe ? (
                <>
                  <Link to="/settings/profile" className="btn-secondary text-xs">
                    <Settings className="h-4 w-4" /> Edit profile
                  </Link>
                  <button onClick={() => void shareProfile()} className="icon-btn" aria-label="Share profile">
                    <Share2 className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <FollowButton
                    userId={profile.id}
                    isFollowing={profile.isFollowing}
                    followRequested={profile.followRequested}
                    isPrivate={profile.isPrivate}
                    isMe={isMe}
                    isBlocked={profile.isBlocked}
                    size="md"
                    onChange={(state) => setProfile({ ...profile, ...state })}
                  />
                  <button className="icon-btn" onClick={() => void openMessage()} disabled={busy || profile.isBlocked} aria-label="Message">
                    <MessageCircle className="h-4 w-4" />
                  </button>
                  <button className="icon-btn" onClick={() => void call('audio')} disabled={profile.isBlocked} aria-label="Audio call">
                    <Phone className="h-4 w-4" />
                  </button>
                  <button className="icon-btn" onClick={() => void call('video')} disabled={profile.isBlocked} aria-label="Video call">
                    <Video className="h-4 w-4" />
                  </button>
                  <button className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="More options">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-extrabold tracking-tight text-white sm:text-2xl">{profile.displayName}</h1>
              {profile.isPrivate && <Lock className="h-4 w-4 text-zinc-500" aria-label="Private account" />}
              {profile.isOnline && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-500">@{profile.username}</p>
            {profile.bio && <p className="mt-3 max-w-xl whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{profile.bio}</p>}
            <p className="mt-2 text-[11px] text-zinc-600">Joined {fullDate(profile.createdAt)}</p>

            <div className="mt-4 flex gap-6">
              <div>
                <span className="font-display text-lg font-bold text-white">{profile.counts.posts.toLocaleString()}</span>
                <span className="ml-1.5 text-xs text-zinc-500">posts</span>
              </div>
              <Link to={`/u/${profile.username}/followers`} className="hover:opacity-80">
                <span className="font-display text-lg font-bold text-white">{profile.counts.followers.toLocaleString()}</span>
                <span className="ml-1.5 text-xs text-zinc-500">followers</span>
              </Link>
              <Link to={`/u/${profile.username}/following`} className="hover:opacity-80">
                <span className="font-display text-lg font-bold text-white">{profile.counts.following.toLocaleString()}</span>
                <span className="ml-1.5 text-xs text-zinc-500">following</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {profile.isBlocked ? (
        <div className="card mt-4">
          <EmptyState
            icon={ShieldOff}
            title={`You blocked @${profile.username}`}
            description="They can’t find your profile, message you or call you. Unblock them to reconnect."
            action={
              <button className="btn-secondary" onClick={() => void toggleBlock()}>
                Unblock
              </button>
            }
          />
        </div>
      ) : profile.hasBlockedViewer ? (
        <div className="card mt-4">
          <EmptyState icon={Lock} title="Content unavailable" description="This account has restricted how you can interact with it." />
        </div>
      ) : !profile.canViewContent ? (
        <div className="card mt-4">
          <EmptyState
            icon={Lock}
            title="This account is private"
            description="Follow this account to see their posts, reels and stories."
            action={
              <FollowButton
                userId={profile.id}
                isFollowing={profile.isFollowing}
                followRequested={profile.followRequested}
                isPrivate
                onChange={(state) => setProfile({ ...profile, ...state })}
              />
            }
          />
        </div>
      ) : (
        <div className="mt-4">
          <div className="mb-3 flex gap-2">
            {tabs.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.value}
                  onClick={() => setTab(item.value)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition',
                    tab === item.value ? 'bg-white/10 text-white' : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300'
                  )}
                >
                  <Icon className="h-4 w-4" /> {item.label}
                </button>
              );
            })}
          </div>

          {postsLoading ? (
            <div className="flex justify-center py-16">
              <Spinner className="h-7 w-7 text-grape-400" />
            </div>
          ) : postsError ? (
            <div className="card">
              <ErrorState message={postsError} onRetry={() => setPostsReload((current) => current + 1)} />
            </div>
          ) : posts.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={tab === 'saved' ? Bookmark : tab === 'reels' ? Film : Grid3X3}
                title={tab === 'saved' ? 'No saved posts yet' : tab === 'reels' ? 'No reels yet' : 'No posts yet'}
                description={
                  isMe
                    ? tab === 'saved'
                      ? 'Save posts you love and find them here.'
                      : 'Share your first moment with the world.'
                    : 'When there’s something to see, it will show up here.'
                }
                action={
                  isMe && tab === 'posts' ? (
                    <Link to="/create" className="btn-primary">
                      Create a post
                    </Link>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-xl">
                <PostGrid posts={posts} />
              </div>
              {cursor && (
                <div className="mt-4 flex justify-center">
                  <button className="btn-secondary" onClick={() => void loadMore()} disabled={loadingMore}>
                    {loadingMore && <Spinner className="h-4 w-4" />}
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} title={`@${profile.username}`} size="sm">
        <div className="space-y-1">
          <button
            onClick={() => {
              setMenuOpen(false);
              void shareProfile();
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-zinc-300 hover:bg-white/[0.05]"
          >
            <Share2 className="h-4 w-4" /> Share profile
          </button>
          <button
            onClick={() => {
              setMenuOpen(false);
              setReportOpen(true);
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-amber-300 hover:bg-amber-500/10"
          >
            <Flag className="h-4 w-4" /> Report account
          </button>
          <button
            onClick={() => {
              setMenuOpen(false);
              setBlockOpen(true);
            }}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm hover:bg-white/[0.05]',
              profile.isBlocked ? 'text-emerald-300' : 'text-rose-300'
            )}
          >
            <ShieldOff className="h-4 w-4" /> {profile.isBlocked ? 'Unblock account' : 'Block account'}
          </button>
        </div>
      </Modal>

      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} targetType="user" targetId={profile.id} />

      <ConfirmDialog
        open={blockOpen}
        onClose={() => setBlockOpen(false)}
        title={profile.isBlocked ? `Unblock @${profile.username}?` : `Block @${profile.username}?`}
        description={
          profile.isBlocked
            ? 'They will be able to follow you and message you again.'
            : 'They won’t be able to find your profile, message you or call you.'
        }
        confirmLabel={profile.isBlocked ? 'Unblock' : 'Block'}
        destructive={!profile.isBlocked}
        onConfirm={async () => {
          if (!(await toggleBlock())) throw new Error('Could not update block status');
        }}
      />
    </div>
  );
}
