import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Compass, Search, TrendingUp } from 'lucide-react';
import { getErrorMessage } from '../lib/api';
import { postsApi } from '../services/wania';
import type { Post } from '../types';
import { useToast } from '../contexts/ToastContext';
import { PostGrid } from '../components/PostGrid';
import { EmptyState, ErrorState, PageHeader, Spinner } from '../components/ui';

type Hashtag = { tag: string; posts: number };

export function ExplorePage() {
  const { error } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await postsApi.explore();
      setPosts(data.items);
      setCursor(data.nextCursor);
    } catch (err) {
      setLoadError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    postsApi.trending().then(setHashtags).catch(() => setHashtags([]));
  }, [load]);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await postsApi.explore(cursor);
      setPosts((current) => [...current, ...data.items.filter((item) => !current.some((post) => post.id === item.id))]);
      setCursor(data.nextCursor);
    } catch (err) {
      error(getErrorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Explore"
        subtitle="Fresh moments, new creators, and ideas worth following."
        action={
          <Link to="/search" className="btn-secondary">
            <Search className="h-4 w-4" /> Search
          </Link>
        }
      />

      <Link
        to="/search"
        className="mb-4 flex h-11 items-center gap-3 rounded-xl border border-white/[0.07] bg-ink-850 px-4 text-sm text-zinc-500 transition hover:border-white/15 hover:text-zinc-300"
      >
        <Search className="h-4 w-4" />
        Search people, posts, and hashtags
      </Link>

      {hashtags.length > 0 && (
        <div className="no-scrollbar mb-5 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-amber-300">
            <TrendingUp className="h-3.5 w-3.5" /> Trending
          </span>
          {hashtags.slice(0, 8).map((tag) => (
            <Link key={tag.tag} to={`/hashtag/${encodeURIComponent(tag.tag)}`} className="chip shrink-0">
              #{tag.tag}
            </Link>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-3 gap-1 sm:gap-2">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="skeleton aspect-square" />
          ))}
        </div>
      ) : loadError ? (
        <div className="card">
          <ErrorState message={loadError} onRetry={() => void load()} />
        </div>
      ) : posts.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Compass}
            title="Nothing to explore yet"
            description="When people share public posts and reels, they’ll show up here. Be the first to post something."
            action={
              <Link to="/create" className="btn-primary">
                Create a post
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <PostGrid posts={posts} />
          {cursor && (
            <div className="mt-6 flex justify-center">
              <button className="btn-secondary" onClick={() => void loadMore()} disabled={loadingMore}>
                {loadingMore && <Spinner className="h-4 w-4" />}
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
