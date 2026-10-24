import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, ShieldOff } from 'lucide-react';
import { getErrorMessage } from '../lib/api';
import { usersApi } from '../services/wania';
import type { UserSummary } from '../types';
import { useToast } from '../contexts/ToastContext';
import { Avatar } from '../components/Avatar';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState, ErrorState, LoadingScreen, PageHeader, Spinner } from '../components/ui';

export function SettingsBlockedPage() {
  const navigate = useNavigate();
  const { success, error } = useToast();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<UserSummary | null>(null);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    usersApi
      .blocked()
      .then((data) => {
        if (!cancelled) setUsers(data);
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
  }, []);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return users;
    return users.filter((user) => user.username.toLowerCase().includes(value) || user.displayName.toLowerCase().includes(value));
  }, [users, query]);

  async function unblock(user: UserSummary) {
    setUnblocking(user.id);
    try {
      await usersApi.unblock(user.id);
      setUsers((current) => current.filter((item) => item.id !== user.id));
      success(`Unblocked @${user.username}`);
    } catch (err) {
      error(getErrorMessage(err));
      throw err;
    } finally {
      setUnblocking(null);
    }
  }

  if (loading) return <LoadingScreen label="Loading blocked accounts…" />;

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="icon-btn" aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <PageHeader title="Blocked accounts" subtitle="People who can’t interact with you." className="mb-0" />
      </div>

      {loadError ? (
        <div className="card">
          <ErrorState message={loadError} onRetry={() => window.location.reload()} />
        </div>
      ) : (
        <>
          {users.length > 0 && (
            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                className="input h-10 pl-9 text-sm"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search blocked accounts"
                aria-label="Search blocked accounts"
              />
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={ShieldOff}
                title={query ? 'No matches' : 'No blocked accounts'}
                description={
                  query
                    ? 'Try a different name or username.'
                    : 'People you block will appear here. Blocking stops them from finding you, messaging you or calling you.'
                }
              />
            </div>
          ) : (
            <div className="card divide-y divide-white/[0.05] px-4">
              {filtered.map((user) => (
                <div key={user.id} className="flex items-center gap-3 py-3">
                  <button onClick={() => navigate(`/u/${user.username}`)} className="shrink-0" aria-label={`View ${user.displayName}`}>
                    <Avatar user={user} size={42} />
                  </button>
                  <button onClick={() => navigate(`/u/${user.username}`)} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-semibold text-white">{user.displayName}</p>
                    <p className="truncate text-xs text-zinc-500">@{user.username}</p>
                  </button>
                  <button
                    className="btn-secondary shrink-0 px-3 py-1.5 text-xs"
                    onClick={() => setSelected(user)}
                    disabled={unblocking === user.id}
                  >
                    {unblocking === user.id ? <Spinner className="h-3.5 w-3.5" /> : 'Unblock'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `Unblock @${selected.username}?` : 'Unblock account?'}
        description="They will be able to find your profile, follow you, message you and call you again."
        confirmLabel="Unblock"
        onConfirm={async () => {
          if (selected) await unblock(selected);
        }}
      />
    </div>
  );
}
