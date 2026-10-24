import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { Bot, Send, Sparkles, Trash2, X } from 'lucide-react';
import { getErrorMessage } from '../../lib/api';
import { aiApi } from '../../services/wania';
import type { AiMessage } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useUi } from '../../contexts/UiContext';
import { useToast } from '../../contexts/ToastContext';
import { cn } from '../../utils/format';
import { Spinner } from '../ui';

function message(role: 'user' | 'assistant', content: string): AiMessage {
  return { id: crypto.randomUUID(), role, content, createdAt: new Date().toISOString() };
}

const QUICK_PROMPTS = ['How do stories work?', 'Tips for my profile', 'How do calls work?', 'Show me around'];

export function AiAssistant() {
  const { user } = useAuth();
  const { assistantOpen, openAssistant, closeAssistant, startTour } = useUi();
  const { error } = useToast();
  const location = useLocation();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!assistantOpen) return;
    setMessages((current) =>
      current.length
        ? current
        : [
            message(
              'assistant',
              `Hi ${user?.displayName?.split(' ')[0] || 'there'}! I'm WANIA AI, your guide to everything here. Ask me about posting, stories, messages, calls, privacy, or making your profile shine.`
            ),
          ]
    );
    if (configured === null) {
      aiApi
        .status()
        .then((status) => setConfigured(status.configured))
        .catch(() => setConfigured(false));
    }
    window.setTimeout(() => inputRef.current?.focus(), 150);
  }, [assistantOpen, configured, user?.displayName]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  if (!user) return null;

  async function send(text: string) {
    const value = text.trim();
    if (!value || sending) return;
    setInput('');
    setSending(true);
    setMessages((current) => [...current, message('user', value)]);
    const pendingId = crypto.randomUUID();
    setMessages((current) => [
      ...current,
      { id: pendingId, role: 'assistant', content: '', createdAt: new Date().toISOString(), pending: true },
    ]);
    try {
      const result = await aiApi.chat({
        message: value,
        page: location.pathname,
        conversationId: conversationId ?? undefined,
      });
      setConfigured(result.configured);
      if (result.conversationId) setConversationId(result.conversationId);
      setMessages((current) =>
        current.map((item) =>
          item.id === pendingId
            ? { ...item, content: result.answer, pending: false, createdAt: new Date().toISOString() }
            : item
        )
      );
    } catch (err) {
      const text = getErrorMessage(err);
      error(text);
      setMessages((current) =>
        current.map((item) =>
          item.id === pendingId
            ? { ...item, content: 'I could not answer that just now. Please try again.', pending: false, error: true }
            : item
        )
      );
    } finally {
      setSending(false);
    }
  }

  async function clearHistory() {
    setClearing(true);
    try {
      await aiApi.clearHistory();
      setConversationId(null);
      setMessages([
        message('assistant', `Fresh start. What would you like to know about WANIA, ${user?.displayName?.split(' ')[0] || 'friend'}?`),
      ]);
    } catch (err) {
      error(getErrorMessage(err));
    } finally {
      setClearing(false);
    }
  }

  if (!assistantOpen) {
    return createPortal(
      <button
        onClick={openAssistant}
        className="fixed bottom-[82px] right-4 z-[90] flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-grape-500 to-fuchsia-600 text-white shadow-glow transition hover:scale-105 active:scale-95 md:bottom-6 md:right-6"
        aria-label="Open WANIA AI assistant"
        data-tour="assistant"
      >
        <Bot className="h-6 w-6" />
        <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-ink-950 bg-emerald-400" />
      </button>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] bg-ink-950 md:inset-auto md:bottom-5 md:right-5 md:h-[min(640px,calc(100dvh-40px))] md:w-[400px] md:rounded-2xl md:border md:border-white/10 md:shadow-2xl">
      <div className="flex h-full flex-col overflow-hidden bg-ink-900 md:rounded-2xl">
        <header className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-grape-500 to-fuchsia-600 text-white">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-sm font-bold text-white">WANIA AI</h2>
            <p className="text-[11px] text-zinc-500">
              {configured ? 'Your in-app guide' : configured === false ? 'Guided mode · connect an AI key for full chat' : 'Connecting…'}
            </p>
          </div>
          <button
            onClick={() => void clearHistory()}
            className="icon-btn"
            aria-label="Clear AI history"
            disabled={clearing || sending}
            title="Clear conversation"
          >
            {clearing ? <Spinner className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
          </button>
          <button onClick={closeAssistant} className="icon-btn" aria-label="Close AI assistant">
            <X className="h-5 w-5" />
          </button>
        </header>

        {configured === false && (
          <div className="border-b border-amber-500/15 bg-amber-500/[0.06] px-4 py-2 text-[11px] leading-relaxed text-amber-200/80">
            The server has no AI key configured, so I’m answering with built-in WANIA guidance.
          </div>
        )}

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {messages.map((item) => (
            <div key={item.id} className={cn('flex', item.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
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
          ))}
          <div ref={bottomRef} />
        </div>

        {messages.length <= 2 && (
          <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3">
            <button
              onClick={() => {
                closeAssistant();
                startTour(0);
              }}
              className="chip shrink-0"
            >
              <Sparkles className="h-3.5 w-3.5" /> Show me around
            </button>
            {QUICK_PROMPTS.map((prompt) => (
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
          className="safe-bottom border-t border-white/[0.07] p-3"
        >
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about WANIA…"
              className="input"
              maxLength={2000}
              disabled={sending}
            />
            <button type="submit" className="btn-primary h-10 w-10 shrink-0 p-0" disabled={!input.trim() || sending} aria-label="Send">
              {sending ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] text-zinc-600">
            WANIA AI can make mistakes. Never share passwords or private keys. <Link to="/settings" onClick={closeAssistant} className="underline">Privacy</Link>
          </p>
        </form>
      </div>
    </div>,
    document.body
  );
}
