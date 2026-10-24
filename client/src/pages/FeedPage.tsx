import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bot, Camera, Compass, ImagePlus, RefreshCw, Sparkles, TrendingUp, UserPlus, Video } from 'lucide-react';
import { getErrorMessage } from '../lib/api';
import { postsApi } from '../services/wania';
import type { Post } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useUi } from '../contexts/UiContext';
import { useToast } from '../contexts/ToastContext';
import { Avatar } from '../components/Avatar';
import { PostCard } from '../components/PostCard';
import { StoryBar } from '../components/StoryBar';
import { EmptyState, ErrorState, PageHeader, PostSkeleton, Spinner } from '../components/ui';

export function FeedPage() {
  const { user } = useAuth();
  const { openAssistant } = useUi();
  const { error } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [hashtags, setHashtags] = useState<{ tag: string; posts: number }[]>([]);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await postsApi.feed();
      setPosts(data.items);
      setCursor(data.nextCursor);
    } catch (err) {
      setLoadError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFeed();
    postsApi
      .trending()
      .then(setHashtags)
      .catch(() => setHashtags([]));
  }, [loadFeed]);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await postsApi.feed(cursor);
      setPosts((current) => [...current, ...data.items.filter((item) => !current.some((post) => post.id === item.id))]);
      setCursor(data.nextCursor);
    } catch (err) {
      error(getErrorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  }

  function updatePost(next: Post) {
    setPosts((current) => current.map((post) => (post.id === next.id ? next : post)));
  }

  function removePost(id: string) {
    setPosts((current) => current.filter((post) => post.id !== id));
  }

  return (
    <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_290px]">
      <div className="min-w-0">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-white">Home</h1>
            <p className="mt-0.5 text-xs text-zinc-500">A little slice of your world.</p>
          </div>
          <button className="icon-btn" onClick={() => void loadFeed()} aria-label="Refresh feed" title="Refresh">
            <RefreshCw className="h-[18px] w-[18px]" />
          </button>
        </div>

        <section className="card mb-4 p-4" aria-label="Stories">
          <StoryBar />
        </section>

        <div className="card mb-4 flex items-center gap-3 p-3">
          {user && (
            <Link to={`/u/${user.username}`} className="shrink-0">
              <Avatar user={user} size={42} />
            </Link>
          )}
          <Link
            to="/create"
            className="flex h-10 flex-1 items-center rounded-full border border-white/[0.07] bg-ink-900/80 px-4 text-sm text-zinc-500 transition hover:border-white/15 hover:text-zinc-300"
          >
            What’s happening in your world, {user?.displayName?.split(' ')[0]}?
          </Link>
          <Link to="/create?type=post" className="icon-btn text-emerald-400" aria-label="Create a photo post" title="Photo post">
            <ImagePlus className="h-5 w-5" />
          </Link>
          <Link to="/create?type=reel" className="icon-btn text-rose-400" aria-label="Create a reel" title="Reel">
            <Video className="h-5 w-5" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            <PostSkeleton />
            <PostSkeleton />
          </div>
        ) : loadError ? (
          <div className="card">
            <ErrorState message={loadError} onRetry={() => void loadFeed()} />
          </div>
        ) : posts.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={Camera}
              title="Your feed is quiet"
              description="Follow a few people or explore what’s happening around WANIA. New moments will show up here."
              action={
                <div className="flex gap-2">
                  <Link to="/explore" className="btn-primary">
                    <Compass className="h-4 w-4" /> Explore
                  </Link>
                  <Link to="/search" className="btn-secondary">
                    <UserPlus className="h-4 w-4" /> Find people
                  </Link>
                </div>
              }
            />
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} onChange={updatePost} onDeleted={removePost} />
              ))}
            </div>

            <div className="mt-6 flex justify-center">
              {cursor ? (
                <button className="btn-secondary" onClick={() => void loadMore()} disabled={loadingMore}>
                  {loadingMore && <Spinner className="h-4 w-4" />}
                  {loadingMore ? 'Loading…' : 'Load more moments'}
                </button>
              ) : (
                <p className="py-3 text-xs text-zinc-600">You’re all caught up. Go make something.</p>
              )}
            </div>
          </>
        )}
      </div>

      <aside className="hidden space-y-4 lg:block">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            {user && <Avatar user={user} size={44} online />}
            <div className="min-w-0 flex-1">
              <Link to={user ? `/u/${user.username}` : '/'} className="block truncate text-sm font-semibold text-white hover:underline">
                {user?.displayName}
              </Link>
              <p className="truncate text-xs text-zinc-500">@{user?.username}</p>
            </div>
            <Link to="/settings/profile" className="text-xs font-semibold text-grape-300 hover:underline">
              Edit
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-white/[0.03] p-2.5 text-center">
            <div>
              <p className="font-display text-base font-bold text-white">{user?.counts.posts ?? 0}</p>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Posts</p>
            </div>
            <div>
              <p className="font-display text-base font-bold text-white">{user?.counts.followers ?? 0}</p>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Followers</p>
            </div>
            <div>
              <p className="font-display text-base font-bold text-white">{user?.counts.following ?? 0}</p>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Following</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-300" />
            <h2 className="text-sm font-semibold text-white">Trending now</h2>
          </div>
          {hashtags.length === 0 ? (
            <p className="mt-3 text-xs leading-relaxed text-zinc-500">Trending hashtags will appear as the community starts posting.</p>
          ) : (
            <div className="mt-3 space-y-2.5">
              {hashtags.slice(0, 6).map((tag) => (
                <Link key={tag.tag} to={`/hashtag/${encodeURIComponent(tag.tag)}`} className="group flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-200 group-hover:text-white">#{tag.tag}</p>
                    <p className="text-[10px] text-zinc-600">{tag.posts} {tag.posts === 1 ? 'post' : 'posts'}</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-grape-300" />
                </Link>
              ))}
            </div>
          )}
          <Link to="/explore" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-grape-300 hover:underline">
            See more <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-grape-500/20 bg-gradient-to-br from-grape-700/25 via-ink-850 to-ink-850 p-4">
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-fuchsia-500/20 blur-2xl" />
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-grape-500 to-fuchsia-600 text-white">
            <Bot className="h-5 w-5" />
          </span>
          <h2 className="mt-3 font-display text-sm font-bold text-white">Need a hand?</h2>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">WANIA AI can help with your profile, features, and anything else in the app.</p>
          <button onClick={openAssistant} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-grape-300 hover:underline">
            <Sparkles className="h-3.5 w-3.5" /> Ask WANIA AI
          </button>
        </div>

        <div className="px-2 text-[10px] leading-relaxed text-zinc-700">
          <p>WANIA · Your moments. Your people. Your world.</p>
          <p className="mt-1">© {new Date().getFullYear()} WANIA</p>
        </div>
      </aside>
    </div>
  );
}
