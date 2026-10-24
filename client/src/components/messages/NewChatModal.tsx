import { useEffect, useState } from 'react';
import { Check, Search, Users } from 'lucide-react';
import { getErrorMessage } from '../../lib/api';
import { messagesApi, usersApi } from '../../services/wania';
import type { Conversation, UserSummary } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { cn, initials } from '../../utils/format';
import { Avatar } from '../Avatar';
import { Modal } from '../Modal';
import { Spinner } from '../ui';

export function NewChatModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (conversation: Conversation) => void;
}) {
  const { user } = useAuth();
  const { error } = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<UserSummary[]>([]);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setSelected([]);
      setTitle('');
    }
  }, [open]);

  useEffect(() => {
    if (!open || query.trim().length < 1) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = window.setTimeout(() => {
      usersApi
        .search(query.trim(), 20)
        .then((data) => {
          if (!cancelled) setResults(data);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, open]);

  function toggle(userItem: UserSummary) {
    setSelected((current) =>
      current.some((item) => item.id === userItem.id) ? current.filter((item) => item.id !== userItem.id) : [...current, userItem]
    );
  }

  async function create() {
    if (!selected.length) return;
    setCreating(true);
    try {
      const conversation = await messagesApi.create({
        type: selected.length > 1 ? 'group' : 'direct',
        memberIds: selected.map((item) => item.id),
        title: selected.length > 1 ? title.trim() || undefined : undefined,
      });
      onCreated(conversation);
      onClose();
    } catch (err) {
      error(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New message" description="Start a private chat or gather your people in a group." size="sm">
      {selected.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
          {selected.map((item) => (
            <button
              key={item.id}
              onClick={() => toggle(item)}
              className="flex items-center gap-1.5 rounded-full bg-grape-600/20 py-1 pl-1 pr-2.5 text-xs font-medium text-grape-200"
              title="Remove"
            >
              <Avatar user={item} size={22} />
              {item.username}
              <span className="text-grape-300">×</span>
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          className="input pl-9"
          placeholder="Search people by name or username…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoFocus
        />
        {searching && <Spinner className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />}
      </div>

      <div className="mt-3 max-h-[42vh] min-h-[120px] overflow-y-auto">
        {!query.trim() ? (
          <p className="px-1 py-8 text-center text-sm text-zinc-500">Search for someone to start a conversation.</p>
        ) : results.length === 0 && !searching ? (
          <p className="px-1 py-8 text-center text-sm text-zinc-500">No people found for “{query}”.</p>
        ) : (
          <div className="space-y-1">
            {results
              .filter((item) => item.id !== user?.id)
              .map((item) => {
                const active = selected.some((entry) => entry.id === item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggle(item)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition',
                      active ? 'bg-grape-600/10' : 'hover:bg-white/[0.04]'
                    )}
                  >
                    <Avatar user={item} size={38} online={item.isOnline} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{item.displayName}</p>
                      <p className="truncate text-xs text-zinc-500">@{item.username}</p>
                    </div>
                    <span className={cn('flex h-5 w-5 items-center justify-center rounded-full border', active ? 'border-grape-500 bg-grape-600 text-white' : 'border-white/20')}>
                      {active && <Check className="h-3 w-3" />}
                    </span>
                  </button>
                );
              })}
          </div>
        )}
      </div>

      {selected.length > 1 && (
        <div className="mt-3">
          <label htmlFor="group-title" className="label">
            Group name (optional)
          </label>
          <div className="relative">
            <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              id="group-title"
              className="input pl-9"
              value={title}
              maxLength={80}
              placeholder={selected.map((item) => initials(item.displayName)).slice(0, 3).join(' ')}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
        </div>
      )}

      <button className="btn-primary mt-4 w-full" onClick={() => void create()} disabled={!selected.length || creating}>
        {creating && <Spinner className="h-4 w-4" />}
        {selected.length > 1 ? `Create group with ${selected.length} people` : 'Start conversation'}
      </button>
    </Modal>
  );
}
