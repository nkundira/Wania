import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, History, MessageSquarePlus, Send, Sparkles, Trash2 } from 'lucide-react';
import { getErrorMessage } from '../lib/api';
import { aiApi } from '../services/wania';
import type { AiConversation, AiMessage } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useUi } from '../contexts/UiContext';
import { useToast } from '../contexts/ToastContext';
import { cn, timeAgo } from '../utils/format';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { EmptyState, PageHeader, Spinner } from '../components/ui';

const PROMPTS = [
  'How do I create a story?',
  'Tips for a better profile',
  'How do video calls work?',
  'Explain my privacy settings',
  'How do I grow my audience?',
];

function greeting(name?: string): AiMessage {
  const firstName = name?.split(' ')[0] || 'there';
  return {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: `Hi ${firstName}! I’m WANIA AI, your guide to everything here. Ask me about posting, stories, messages, calls, privacy or making your profile shine. I can also walk you through the app with a tour.`,
    createdAt: new Date().toISOString(),
  };
}

export function AiPage() {
  const { user } = useAuth();
  const { startTour } = useUi();
  const { error, success } = useToast();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>(() => [greeting(user?.displayName)]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [deleting, setDeleting] = useState<AiConversation | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    aiApi
      .status()
      .then((status) => setConfigured(status.configured))
      .catch(() => setConfigured(false));
    aiApi
      .conversations()
      .then(setConversations)
      .catch(() => setConversations([]));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  function newChat() {
    setConversationId(null);
    setMessages([greeting(user?.displayName)]);
    setInput('');
    inputRef.current?.focus();
  }

  async function openConversation(conversation: AiConversation) {
    if (conversation.id === conversationId) return;
    setHistoryOpen(false);
    setConversationId(conversation.id);
    setHistoryLoading(true);
    try {
      const history = await aiApi.messages(conversation.id);
      setMessages(history.length ? history : [greeting(user?.displayName)]);
    } catch (err) {
      error(getErrorMessage(err));
      setMessages([greeting(user?.displayName)]);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function send(text: string) {
    const value = text.trim();
    if (!value || sending || !user) return;
    if (user.settings && !user.settings.aiEnabled) {
      error('The assistant is disabled in your settings');
      return;
    }
    setInput('');
    setSending(true);
    const pendingId = crypto.randomUUID();
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: 'user', content: value, createdAt: new Date().toISOString() },
      { id: pendingId, role: 'assistant', content: '', createdAt: new Date().toISOString(), pending: true },
    ]);
    try {
      const result = await aiApi.chat({ message: value, page: '/ai', conversationId: conversationId ?? undefined });
      setConfigured(result.configured);
      if (result.conversationId && result.conversationId !== conversationId) {
        setConversationId(result.conversationId);
        aiApi.conversations().then(setConversations).catch(() => undefined);
      }
      setMessages((current) =>
        current.map((item) =>
          item.id === pendingId
            ? { ...item, content: result.answer || 'I don’t have an answer for that yet.', pending: false, createdAt: new Date().toISOString() }
            : item
        )
      );
    } catch (err) {
      error(getErrorMessage(err));
      setMessages((current) =>
        current.map((item) =>
          item.id === pendingId
            ? {
                ...item,
                content: 'I could not answer that just now. Check your connection and try again.',
                pending: false,
                error: true,
              }
            : item
        )
      );
    } finally {
      setSending(false);
    }
  }

  async function deleteConversation(conversation: AiConversation) {
    try {
      await aiApi.deleteConversation(conversation.id);
      setConversations((current) => current.filter((item) => item.id !== conversation.id));
      if (conversation.id === conversationId) newChat();
      success('Conversation deleted');
    } catch (err) {
      error(getErrorMessage(err));
      throw err;
    }
  }

  async function clearHistory() {
    try {
      await aiApi.clearHistory();
      setConversations([]);
      newChat();
      success('Assistant history cleared');
    } catch (err) {
      error(getErrorMessage(err));
      throw err;
    }
  }

  const aiDisabled = Boolean(user?.settings && !user.settings.aiEnabled);

  if (aiDisabled) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="WANIA AI" subtitle="Your in-app guide." />
        <div className="card">
          <EmptyState
            icon={Bot}
            title="The assistant is turned off"
            description="Enable the AI assistant in Settings to ask questions and get help navigating WANIA."
            action={
              <Link to="/settings" className="btn-primary">
                Open settings
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="WANIA AI"
        subtitle="A guide, a brainstorm partner and a friendly hand."
        action={
          <div className="flex gap-2">
            <button className="btn-secondary text-xs" onClick={() => setConfirmClear(true)} disabled={!conversations.length}>
              <Trash2 className="h-4 w-4" /> Clear history
            </button>
            <button className="btn-primary text-xs" onClick={newChat}>
              <MessageSquarePlus className="h-4 w-4" /> New chat
            </button>
          </div>
        }
      />

      {configured === false && (
        <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-xs leading-relaxed text-amber-200/80">
          The server has no AI key configured, so replies use WANIA’s built-in guidance. Add an OpenAI-compatible key on the server
          to unlock full conversational AI.
        </div>
      )}

      <div className="card flex h-[calc(100dvh-220px)] min-h-[520px] overflow-hidden">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-white/[0.07] md:flex">
          <div className="px-4 pb-2 pt-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Conversations</h2>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
            {conversations.length === 0 ? (
              <p className="px-3 py-6 text-xs leading-relaxed text-zinc-600">
                Your saved assistant conversations will appear here.
              </p>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={cn(
                    'group flex items-center gap-1 rounded-lg px-2 transition',
                    conversation.id === conversationId ? 'bg-grape-600/15' : 'hover:bg-white/[0.04]'
                  )}
                >
                  <button onClick={() => void openConversation(conversation)} className="min-w-0 flex-1 py-2.5 text-left">
                    <p className="truncate text-xs font-medium text-zinc-200">{conversation.title || 'New conversation'}</p>
                    <p className="mt-0.5 text-[10px] text-zinc-600">
                      {conversation.messageCount} messages · {timeAgo(conversation.updatedAt)}
                    </p>
                  </button>
                  <button
                    onClick={() => setDeleting(conversation)}
                    className="rounded p-1 text-zinc-600 opacity-0 transition hover:bg-rose-500/10 hover:text-rose-300 group-hover:opacity-100"
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-white/[0.06] p-3">
            <button onClick={() => startTour(0)} className="btn-secondary w-full text-xs">
              <Sparkles className="h-4 w-4" /> Take the tour
            </button>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-grape-500 to-fuchsia-600 text-white">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-sm font-bold text-white">WANIA AI</h2>
              <p className="truncate text-[11px] text-zinc-500">
                {configured === null ? 'Checking…' : configured ? 'Connected to your AI guide' : 'Guided mode · built-in WANIA help'}
              </p>
            </div>
            <button onClick={() => setHistoryOpen(true)} className="icon-btn md:hidden" aria-label="Conversation history">
              <History className="h-5 w-5" />
            </button>
            <button onClick={newChat} className="icon-btn md:hidden" aria-label="New chat">
              <MessageSquarePlus className="h-5 w-5" />
            </button>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {historyLoading ? (
              <div className="flex justify-center py-10">
                <Spinner className="h-6 w-6 text-grape-400" />
              </div>
            ) : (
              messages.map((item) => (
                <div key={item.id} className={cn('flex', item.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                      item.role === 'user'
                        ? 'rounded-br-md bg-grape-600 text-white'
                        : item.error
                          ? 'rounded-bl-md border border-rose-500/20 bg-rose-500/10 text-rose-200'
                          : 'rounded-bl-md border border-white/[0.06] bg-ink-800 text-zinc-200'
                    )}
                  >
                    {item.pending ? (
                      <span className="flex items-center gap-1 py-1">
                        {[0, 1, 2].map((dot) => (
                          <span
                            key={dot}
                            className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400"
                            style={{ animationDelay: `${dot * 120}ms` }}
                          />
                        ))}
                      </span>
                    ) : (
                      item.content
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {messages.length <= 1 && (
            <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3">
              {PROMPTS.map((prompt) => (
                <button key={prompt} onClick={() => void send(prompt)} className="chip shrink-0">
                  {prompt}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send(input);
            }}
            className="border-t border-white/[0.07] p-3"
          >
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask anything about WANIA…"
                className="input"
                maxLength={2000}
                disabled={sending}
                aria-label="Message the assistant"
              />
              <button type="submit" className="btn-primary h-10 w-10 shrink-0 p-0" disabled={!input.trim() || sending} aria-label="Send">
                {sending ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] text-zinc-600">
              WANIA AI can make mistakes. Never share passwords or private keys.
            </p>
          </form>
        </section>
      </div>

      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title="Conversation history" size="sm">
        {conversations.length === 0 ? (
          <p className="py-6 text-center text-xs leading-relaxed text-zinc-500">
            Your saved assistant conversations will appear here.
          </p>
        ) : (
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={cn(
                  'flex items-center gap-1 rounded-lg px-2 transition',
                  conversation.id === conversationId ? 'bg-grape-600/15' : 'hover:bg-white/[0.04]'
                )}
              >
                <button onClick={() => void openConversation(conversation)} className="min-w-0 flex-1 py-3 text-left">
                  <p className="truncate text-sm font-medium text-zinc-200">{conversation.title || 'New conversation'}</p>
                  <p className="mt-0.5 text-[10px] text-zinc-600">
                    {conversation.messageCount} messages · {timeAgo(conversation.updatedAt)}
                  </p>
                </button>
                <button
                  onClick={() => setDeleting(conversation)}
                  className="rounded p-2 text-zinc-600 transition hover:bg-rose-500/10 hover:text-rose-300"
                  aria-label="Delete conversation"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear assistant history?"
        description="This deletes all assistant conversations. Your posts and messages are not affected."
        confirmLabel="Clear history"
        destructive
        onConfirm={clearHistory}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete this conversation?"
        description="This assistant conversation will be permanently removed."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (deleting) await deleteConversation(deleting);
        }}
      />
    </div>
  );
}
