import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Search, Users } from 'lucide-react';
import { getErrorMessage } from '../lib/api';
import { usersApi } from '../services/wania';
import type { UserSummary } from '../types';
import { useToast } from '../contexts/ToastContext';
import { UserRow } from '../components/UserRow';
import { EmptyState, ErrorState, LoadingScreen, Spinner } from '../components/ui';

type ProfileHead = { id: string; username: string; displayName: string; isMe: boolean };

export function ConnectionsPage({ mode }: { mode: 'followers' | 'following' }) {
  const { username = '' } = useParams<{ username: string }>();
  const { error } = useToast();
  const [head, setHead] = useState<ProfileHead | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    setUsers([]);
    const request = mode === 'followers' ? usersApi.followers(username) : usersApi.following(username);
    request
      .then((data) => {
        if (cancelled) return;
        setHead(data.profile);
        setUsers(data.items);
        setCursor(data.nextCursor);
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
  }, [username, mode]);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = mode === 'followers' ? await usersApi.followers(username, cursor) : await usersApi.following(username, cursor);
      setUsers((current) => [...current, ...data.items.filter((item) => !current.some((entry) => entry.id === item.id))]);
      setCursor(data.nextCursor);
    } catch (err) {
      error(getErrorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  }

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return users;
    return users.filter((user) => user.username.toLowerCase().includes(value) || user.displayName.toLowerCase().includes(value));
  }, [users, query]);

  if (loading) return <LoadingScreen label={`Loading ${mode}…`} />;
  if (loadError) {
    return (
      <div className="card mx-auto max-w-lg">
        <ErrorState message={loadError} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 flex items-center gap-3">
        <Link to={`/u/${username}`} className="icon-btn" aria-label="Back to profile">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="font-display text-xl font-extrabold tracking-tight text-white">
            {mode === 'followers' ? 'Followers' : 'Following'}
          </h1>
          <p className="truncate text-xs text-zinc-500">
            @{head?.username ?? username} · {users.length} {mode}
          </p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="input h-10 pl-9 text-sm"
          placeholder="Search this list"
          aria-label="Search this list"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Users}
            title={query ? 'No matches' : mode === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
            description={
              query
                ? 'Try a different name or username.'
                : mode === 'followers'
                  ? 'When people follow this account, they’ll appear here.'
                  : 'When this account follows people, they’ll appear here.'
            }
          />
        </div>
      ) : (
        <div className="card divide-y divide-white/[0.05] px-4">
          {filtered.map((user) => (
            <UserRow key={user.id} user={user} size="md" />
          ))}
        </div>
      )}

      {cursor && (
        <div className="mt-4 flex justify-center">
          <button className="btn-secondary" onClick={() => void loadMore()} disabled={loadingMore}>
            {loadingMore && <Spinner className="h-4 w-4" />}
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}

export function FollowersPage() {
  return <ConnectionsPage mode="followers" />;
}

export function FollowingPage() {
  return <ConnectionsPage mode="following" />;
}
