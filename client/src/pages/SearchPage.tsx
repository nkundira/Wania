import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Compass, Hash, Search, TrendingUp, X } from 'lucide-react';
import { getErrorMessage } from '../lib/api';
import { postsApi } from '../services/wania';
import type { Post, UserSummary } from '../types';
import { cn } from '../utils/format';
import { PostGrid } from '../components/PostGrid';
import { UserRow } from '../components/UserRow';
import { EmptyState, ErrorState, PageHeader, Spinner } from '../components/ui';

type SearchResults = {
  users: UserSummary[];
  posts: Post[];
  hashtags: { tag: string; posts: number }[];
  query: string;
};

const TABS = [
  { value: 'top', label: 'Top' },
  { value: 'people', label: 'People' },
  { value: 'posts', label: 'Posts' },
  { value: 'tags', label: 'Tags' },
] as const;

type Tab = (typeof TABS)[number]['value'];
const RECENT_KEY = 'wania:recent-searches';

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const [input, setInput] = useState(query);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [retry, setRetry] = useState(0);
  const [tab, setTab] = useState<Tab>('top');
  const [trending, setTrending] = useState<{ tag: string; posts: number }[]>([]);
  const [discover, setDiscover] = useState<Post[]>([]);
  const [recent, setRecent] = useState<string[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
      return Array.isArray(stored) ? stored.slice(0, 6) : [];
    } catch {
      return [];
    }
  });
  const requestId = useRef(0);

  useEffect(() => {
    setInput(query);
  }, [query]);

  useEffect(() => {
    if (query.trim() === input.trim()) return;
    const timer = window.setTimeout(() => {
      if (input.trim()) {
        setParams({ q: input.trim() }, { replace: true });
      } else {
        setParams({}, { replace: true });
      }
    }, 380);
    return () => window.clearTimeout(timer);
  }, [input, query, setParams]);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setFetchError('');
      return;
    }
    const current = ++requestId.current;
    setLoading(true);
    setFetchError('');
    postsApi
      .search(query.trim())
      .then((data) => {
        if (current === requestId.current) setResults(data);
      })
      .catch((err) => {
        if (current === requestId.current) setFetchError(getErrorMessage(err));
      })
      .finally(() => {
        if (current === requestId.current) setLoading(false);
      });
  }, [query, retry]);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([postsApi.trending(), postsApi.explore()]).then(([tagsResult, postsResult]) => {
      if (cancelled) return;
      if (tagsResult.status === 'fulfilled') setTrending(tagsResult.value.slice(0, 8));
      if (postsResult.status === 'fulfilled') setDiscover(postsResult.value.items.slice(0, 9));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function remember(value: string) {
    const next = [value, ...recent.filter((item) => item !== value)].slice(0, 6);
    setRecent(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      // Recent searches are a convenience only.
    }
  }

  function choose(value: string) {
    const next = value.trim();
    if (!next) return;
    remember(next);
    setInput(next);
    setParams({ q: next });
  }

  function clearRecent() {
    setRecent([]);
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {
      // Ignore storage failures.
    }
  }

  const hasResults = Boolean(results && (results.users.length || results.posts.length || results.hashtags.length));
  const topUsers = useMemo(() => results?.users.slice(0, 5) ?? [], [results]);
  const topTags = useMemo(() => results?.hashtags.slice(0, 6) ?? [], [results]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Search" subtitle="Find your people, posts and ideas." />

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
        <input
          autoFocus
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && input.trim()) choose(input);
            if (event.key === 'Escape') {
              setInput('');
              setParams({});
            }
          }}
          className="input h-12 pl-12 pr-11 text-base"
          placeholder="Search people, captions or #hashtags"
          aria-label="Search"
        />
        {input && (
          <button
            onClick={() => {
              setInput('');
              setParams({});
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-500 hover:bg-white/10 hover:text-white"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {query && (
        <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
          {TABS.map((item) => (
            <button key={item.value} onClick={() => setTab(item.value)} className={cn('chip shrink-0', tab === item.value && 'chip-active')}>
              {item.label}
            </button>
          ))}
        </div>
      )}

      {!query ? (
        <div className="space-y-8">
          {recent.length > 0 && (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-bold text-white">Recent</h2>
                <button onClick={clearRecent} className="text-xs font-semibold text-grape-300 hover:text-grape-200">
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recent.map((item) => (
                  <button key={item} onClick={() => choose(item)} className="chip">
                    <Search className="h-3 w-3" /> {item}
                  </button>
                ))}
              </div>
            </section>
          )}

          {trending.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-grape-300" />
                <h2 className="text-sm font-bold text-white">Trending now</h2>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {trending.map((tag, index) => (
                  <button
                    key={tag.tag}
                    onClick={() => choose(`#${tag.tag}`)}
                    className="card flex items-center gap-3 p-3 text-left transition hover:border-grape-500/30"
                  >
                    <span className="font-display text-lg font-extrabold text-white/20">{String(index + 1).padStart(2, '0')}</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-grape-600/15 text-grape-300">
                      <Hash className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">#{tag.tag}</p>
                      <p className="text-[11px] text-zinc-500">{tag.posts.toLocaleString()} posts</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="mb-3 flex items-center gap-2">
              <Compass className="h-4 w-4 text-grape-300" />
              <h2 className="text-sm font-bold text-white">Discover</h2>
            </div>
            {discover.length ? (
              <div className="overflow-hidden rounded-xl">
                <PostGrid posts={discover} />
              </div>
            ) : (
              <div className="card">
                <EmptyState icon={Compass} title="Nothing to discover yet" description="Follow a few people and their moments will start appearing here." />
              </div>
            )}
          </section>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-7 w-7 text-grape-400" />
        </div>
      ) : fetchError ? (
        <div className="card">
          <ErrorState message={fetchError} onRetry={() => setRetry((value) => value + 1)} />
        </div>
      ) : !hasResults ? (
        <div className="card">
          <EmptyState
            icon={Search}
            title={`No results for “${query}”`}
            description="Try a different spelling, a username, a caption keyword or a hashtag."
          />
        </div>
      ) : (
        <div className="space-y-8">
          {(tab === 'top' || tab === 'people') && results!.users.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-bold text-white">People</h2>
              <div className="card divide-y divide-white/[0.05] px-4">
                {(tab === 'people' ? results!.users : topUsers).map((user) => (
                  <UserRow key={user.id} user={user} />
                ))}
              </div>
            </section>
          )}

          {(tab === 'top' || tab === 'tags') && results!.hashtags.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-bold text-white">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {(tab === 'tags' ? results!.hashtags : topTags).map((tag) => (
                  <button
                    key={tag.tag}
                    onClick={() => choose(`#${tag.tag}`)}
                    className="card flex items-center gap-2 px-3 py-2 text-sm transition hover:border-grape-500/30"
                  >
                    <Hash className="h-4 w-4 text-grape-300" />
                    <span className="font-semibold text-white">{tag.tag}</span>
                    <span className="text-[11px] text-zinc-500">{tag.posts}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {(tab === 'top' || tab === 'posts') && results!.posts.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-bold text-white">Posts</h2>
              <div className="overflow-hidden rounded-xl">
                <PostGrid posts={results!.posts} />
              </div>
            </section>
          )}

          {results!.hashtags.length === 0 && results!.users.length === 0 && results!.posts.length === 0 && (
            <EmptyState icon={Search} title="No matches" description="Try a broader search." />
          )}

        </div>
      )}
    </div>
  );
}
