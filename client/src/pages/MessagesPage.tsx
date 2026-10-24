import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MessageCircle, Plus, Search } from 'lucide-react';
import { getErrorMessage } from '../lib/api';
import { messagesApi } from '../services/wania';
import type { Conversation } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useToast } from '../contexts/ToastContext';
import { cn, timeAgo } from '../utils/format';
import { Avatar } from '../components/Avatar';
import { ChatPanel } from '../components/messages/ChatPanel';
import { NewChatModal } from '../components/messages/NewChatModal';
import { EmptyState, Spinner } from '../components/ui';

function conversationPreview(conversation: Conversation) {
  if (!conversation.lastMessage) return 'Start the conversation';
  if (conversation.lastMessage.kind === 'snap') return 'Snap';
  if (conversation.lastMessage.kind === 'voice') return 'Voice note';
  return conversation.lastMessage.preview;
}

export function MessagesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();
  const { error } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [newChatOpen, setNewChatOpen] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      setConversations(await messagesApi.list());
    } catch (err) {
      error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => void loadConversations();
    socket.on('message:new', refresh);
    socket.on('conversation:updated', refresh);
    socket.on('conversation:created', refresh);
    socket.on('message:read', refresh);
    return () => {
      socket.off('message:new', refresh);
      socket.off('conversation:updated', refresh);
      socket.off('conversation:created', refresh);
      socket.off('message:read', refresh);
    };
  }, [socket, loadConversations]);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return conversations;
    return conversations.filter(
      (conversation) =>
        conversation.title.toLowerCase().includes(value) ||
        conversation.members.some((member) => member.username.toLowerCase().includes(value) || member.displayName.toLowerCase().includes(value))
    );
  }, [conversations, query]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between md:hidden">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-white">Messages</h1>
          <p className="mt-0.5 text-xs text-zinc-500">Your people, close by.</p>
        </div>
        <button className="btn-primary h-9 px-3" onClick={() => setNewChatOpen(true)} aria-label="New message">
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="card flex h-[calc(100dvh-160px)] min-h-[480px] overflow-hidden md:h-[calc(100dvh-120px)]">
        <section className={cn('w-full shrink-0 flex-col border-white/[0.07] md:flex md:w-[320px] md:border-r', id ? 'hidden' : 'flex')}>
          <div className="hidden items-center justify-between px-4 pb-2 pt-4 md:flex">
            <div>
              <h1 className="font-display text-xl font-extrabold tracking-tight text-white">Messages</h1>
              <p className="mt-0.5 text-[11px] text-zinc-500">Your people, close by.</p>
            </div>
            <button className="icon-btn" onClick={() => setNewChatOpen(true)} aria-label="New message">
              <Plus className="h-5 w-5" />
            </button>
          </div>

          <div className="px-3 pb-2 pt-3 md:pt-1">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                className="input h-9 py-1.5 pl-9 text-xs"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search conversations"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
            {loading ? (
              <div className="flex justify-center py-10">
                <Spinner className="text-grape-400" />
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={MessageCircle}
                title={query ? 'No matches' : 'No messages yet'}
                description={query ? 'Try another name or username.' : 'Start a private chat or bring your people into a group.'}
                action={
                  !query && (
                    <button className="btn-secondary" onClick={() => setNewChatOpen(true)}>
                      <Plus className="h-4 w-4" /> New message
                    </button>
                  )
                }
                className="py-10"
              />
            ) : (
              filtered.map((conversation) => {
                const active = conversation.id === id;
                const peer = conversation.members.find((member) => member.id !== user?.id) ?? conversation.members[0];
                return (
                  <Link
                    key={conversation.id}
                    to={`/messages/${conversation.id}`}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition',
                      active ? 'bg-grape-600/15' : 'hover:bg-white/[0.04]'
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar
                        user={{
                          displayName: conversation.title,
                          avatarUrl: conversation.avatarUrl,
                          isOnline: conversation.type === 'direct' ? peer?.isOnline : false,
                        }}
                        size={42}
                      />
                      {conversation.type === 'group' && (
                        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-ink-850 bg-ink-600 text-white">
                          <Plus className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={cn('truncate text-sm', conversation.unreadCount ? 'font-bold text-white' : 'font-medium text-zinc-200')}>
                          {conversation.title}
                        </p>
                        {conversation.lastMessageAt && <span className="shrink-0 text-[10px] text-zinc-600">{timeAgo(conversation.lastMessageAt)}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className={cn('truncate text-xs', conversation.unreadCount ? 'text-zinc-300' : 'text-zinc-500')}>
                          {conversationPreview(conversation)}
                        </p>
                        {conversation.unreadCount > 0 && (
                          <span className="ml-auto flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-grape-500 px-1 text-[9px] font-bold text-white">
                            {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </section>

        <section className={cn('min-w-0 flex-1 flex-col', id ? 'flex' : 'hidden md:flex')}>
          {id ? (
            <ChatPanel
              key={id}
              conversationId={id}
              showBack
              onBack={() => navigate('/messages')}
              onActivity={loadConversations}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-grape-300">
                <MessageCircle className="h-8 w-8" />
              </span>
              <h2 className="mt-4 font-display text-lg font-bold text-white">Your messages</h2>
              <p className="mt-1 max-w-xs text-sm leading-relaxed text-zinc-500">
                Choose a conversation, or start a new one with someone you care about.
              </p>
              <button className="btn-primary mt-5" onClick={() => setNewChatOpen(true)}>
                <Plus className="h-4 w-4" /> New message
              </button>
            </div>
          )}
        </section>
      </div>

      <NewChatModal
        open={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onCreated={(conversation) => {
          setConversations((current) => [conversation, ...current.filter((item) => item.id !== conversation.id)]);
          navigate(`/messages/${conversation.id}`);
        }}
      />
    </div>
  );
}
