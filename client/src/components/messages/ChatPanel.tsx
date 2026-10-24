import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Eye,
  Flame,
  ImagePlus,
  MessageCircle,
  Mic,
  Phone,
  Send,
  Smile,
  Square,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import { assetUrl, getErrorMessage } from '../../lib/api';
import { mediaApi, messagesApi } from '../../services/wania';
import type { Conversation, Message } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useCall } from '../../contexts/CallContext';
import { useSocket } from '../../contexts/SocketContext';
import { useToast } from '../../contexts/ToastContext';
import { cn, expiresIn, formatDuration, timeAgo } from '../../utils/format';
import { Avatar } from '../Avatar';
import { EmptyState, Spinner } from '../ui';

const EMOJIS = ['❤️', '😂', '🔥', '👍', '🙌', '😮', '😢', '🎉'];

export function ChatPanel({
  conversationId,
  onBack,
  onActivity,
  showBack = false,
}: {
  conversationId: string;
  onBack?: () => void;
  onActivity?: () => void;
  showBack?: boolean;
}) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { startCall } = useCall();
  const { error, success } = useToast();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [peerOnline, setPeerOnline] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const snapRef = useRef<HTMLInputElement>(null);
  const typingActiveRef = useRef(false);
  const typingStopRef = useRef<number | null>(null);
  const typingTimersRef = useRef<Record<string, number>>({});
  const nearBottomRef = useRef(true);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordStreamRef = useRef<MediaStream | null>(null);
  const recordTimerRef = useRef<number | null>(null);
  const recordSecondsRef = useRef(0);
  const cancelRecordingRef = useRef(false);

  const peer = conversation?.members.find((member) => member.id !== user?.id) ?? null;
  const peerId = peer?.id;
  const isDirect = conversation?.type === 'direct';

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    window.requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior, block: 'end' }));
  }, []);

  const markRead = useCallback(() => {
    if (!socket?.connected) {
      void messagesApi.read(conversationId).catch(() => undefined);
      return;
    }
    socket.emit('message:read', { conversationId });
  }, [conversationId, socket]);

  const loadConversation = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [conv, page] = await Promise.all([messagesApi.get(conversationId), messagesApi.messages(conversationId)]);
      setConversation(conv);
      setMessages(page.items);
      setCursor(page.nextCursor);
      setPeerOnline(Boolean(conv.members.find((member) => member.id !== user?.id)?.isOnline));
      window.setTimeout(() => scrollToBottom('instant'), 80);
      markRead();
    } catch (err) {
      setLoadError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [conversationId, markRead, scrollToBottom, user?.id]);

  useEffect(() => {
    void loadConversation();
    setMessages([]);
    setReplyTo(null);
    setInput('');
    setEmojiOpen(false);
  }, [loadConversation]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('conversation:join', { conversationId });

    const onMessage = (message: Message) => {
      if (message.conversationId !== conversationId) return;
      setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]));
      nearBottomRef.current = true;
      window.setTimeout(() => scrollToBottom(), 50);
      if (document.hasFocus() && !message.isMine) markRead();
      onActivity?.();
    };

    const onRead = (payload: { conversationId: string; userId: string }) => {
      if (payload.conversationId !== conversationId || payload.userId === user?.id) return;
      setMessages((current) => current.map((message) => (message.isMine ? { ...message, status: 'read' as const } : message)));
    };

    const onDeleted = (payload: { messageId: string; conversationId: string }) => {
      if (payload.conversationId !== conversationId) return;
      setMessages((current) => current.filter((message) => message.id !== payload.messageId));
    };

    const onTypingStart = (payload: { conversationId: string; user: { id: string; displayName: string } }) => {
      if (payload.conversationId !== conversationId) return;
      setTypingUsers((current) => ({ ...current, [payload.user.id]: payload.user.displayName }));
      window.clearTimeout(typingTimersRef.current[payload.user.id]);
      typingTimersRef.current[payload.user.id] = window.setTimeout(() => {
        setTypingUsers((current) => {
          const next = { ...current };
          delete next[payload.user.id];
          return next;
        });
      }, 3500);
    };

    const onTypingStop = (payload: { conversationId: string; userId: string }) => {
      if (payload.conversationId !== conversationId) return;
      setTypingUsers((current) => {
        const next = { ...current };
        delete next[payload.userId];
        return next;
      });
    };

    const onPresence = (payload: { userId: string; online: boolean }) => {
      if (peerId && payload.userId === peerId) setPeerOnline(payload.online);
    };

    const onSnapViewed = (payload: { messageId: string; conversationId: string }) => {
      if (payload.conversationId !== conversationId) return;
      setMessages((current) =>
        current.map((message) => (message.id === payload.messageId ? { ...message, viewedAt: new Date().toISOString() } : message))
      );
    };

    const onConversationUpdated = (payload: { id: string }) => {
      if (payload.id === conversationId) onActivity?.();
    };

    socket.on('message:new', onMessage);
    socket.on('message:read', onRead);
    socket.on('message:deleted', onDeleted);
    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop', onTypingStop);
    socket.on('presence:update', onPresence);
    socket.on('snap:viewed', onSnapViewed);
    socket.on('conversation:updated', onConversationUpdated);

    return () => {
      socket.emit('conversation:leave', { conversationId });
      socket.off('message:new', onMessage);
      socket.off('message:read', onRead);
      socket.off('message:deleted', onDeleted);
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop', onTypingStop);
      socket.off('presence:update', onPresence);
      socket.off('snap:viewed', onSnapViewed);
      socket.off('conversation:updated', onConversationUpdated);
      Object.values(typingTimersRef.current).forEach((timer) => window.clearTimeout(timer));
      typingTimersRef.current = {};
    };
  }, [socket, conversationId, markRead, onActivity, peerId, scrollToBottom, user?.id]);

  useEffect(() => {
    const onFocus = () => markRead();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [markRead]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const onScroll = () => {
      nearBottomRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 120;
      if (node.scrollTop < 60 && cursor && !loadingOlder) void loadOlder();
    };
    node.addEventListener('scroll', onScroll, { passive: true });
    return () => node.removeEventListener('scroll', onScroll);
  }); // rebinds with the current cursor

  async function loadOlder() {
    if (!cursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await messagesApi.messages(conversationId, cursor);
      setMessages((current) => [...page.items.filter((item) => !current.some((message) => message.id === item.id)), ...current]);
      setCursor(page.nextCursor);
    } catch (err) {
      error(getErrorMessage(err));
    } finally {
      setLoadingOlder(false);
    }
  }

  function stopTyping() {
    if (typingStopRef.current) window.clearTimeout(typingStopRef.current);
    typingStopRef.current = null;
    if (typingActiveRef.current && socket) {
      socket.emit('typing:stop', { conversationId });
      typingActiveRef.current = false;
    }
  }

  function handleInput(value: string) {
    setInput(value);
    if (!socket) return;
    if (!typingActiveRef.current) {
      typingActiveRef.current = true;
      socket.emit('typing:start', { conversationId });
    }
    if (typingStopRef.current) window.clearTimeout(typingStopRef.current);
    typingStopRef.current = window.setTimeout(stopTyping, 1800);
  }

  async function appendSent(message: Message) {
    setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]));
    setConversation((current) =>
      current
        ? {
            ...current,
            lastMessageAt: message.createdAt,
            lastMessage: {
              preview: message.kind === 'snap' ? 'Snap' : message.kind === 'voice' ? 'Voice note' : message.body || 'Attachment',
              kind: message.kind,
              createdAt: message.createdAt,
            },
          }
        : current
    );
    nearBottomRef.current = true;
    window.setTimeout(() => scrollToBottom(), 40);
    onActivity?.();
  }

  async function sendText(event?: React.FormEvent) {
    event?.preventDefault();
    const body = input.trim();
    if (!body || sending) return;
    setSending(true);
    setInput('');
    setEmojiOpen(false);
    stopTyping();
    try {
      const message = await messagesApi.send(conversationId, { body, kind: 'text', replyToId: replyTo?.id });
      await appendSent(message);
      setReplyTo(null);
    } catch (err) {
      setInput(body);
      error(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  async function uploadAndSend(file: File, snap = false) {
    if (file.size > 50 * 1024 * 1024) {
      error('Files must be 50 MB or smaller.');
      return;
    }
    const kind = snap ? 'snap' : file.type.startsWith('video/') ? 'video' : 'image';
    setUploading(snap ? 'Uploading snap…' : 'Uploading attachment…');
    try {
      const uploaded = await mediaApi.upload(file, snap ? 'snap' : 'message');
      const message = await messagesApi.send(conversationId, {
        kind,
        attachmentIds: [uploaded.id],
        replyToId: replyTo?.id,
        expiresAt: snap ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : undefined,
      });
      await appendSent(message);
      setReplyTo(null);
    } catch (err) {
      error(getErrorMessage(err));
    } finally {
      setUploading('');
      if (fileRef.current) fileRef.current.value = '';
      if (snapRef.current) snapRef.current.value = '';
    }
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      error('Voice recording is not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      recordStreamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      cancelRecordingRef.current = false;
      recordSecondsRef.current = 0;
      setRecordSeconds(0);
      setRecording(true);
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const cancelled = cancelRecordingRef.current;
        const seconds = recordSecondsRef.current;
        recordStreamRef.current?.getTracks().forEach((track) => track.stop());
        recordStreamRef.current = null;
        recorderRef.current = null;
        if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
        setRecording(false);
        if (cancelled || seconds < 1) {
          chunksRef.current = [];
          return;
        }
        const blob = new Blob(chunksRef.current, { type: mimeType.split(';')[0] });
        chunksRef.current = [];
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type });
        void uploadVoice(file, seconds);
      };
      recorder.start(250);
      recordTimerRef.current = window.setInterval(() => {
        recordSecondsRef.current += 1;
        setRecordSeconds(recordSecondsRef.current);
        if (recordSecondsRef.current >= 120) stopRecording(false);
      }, 1000);
    } catch {
      error('Microphone permission was denied or no microphone was found.');
    }
  }

  function stopRecording(cancel: boolean) {
    cancelRecordingRef.current = cancel;
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }

  async function uploadVoice(file: File, seconds: number) {
    setUploading('Sending voice note…');
    try {
      const uploaded = await mediaApi.upload(file, 'voice');
      const message = await messagesApi.send(conversationId, {
        kind: 'voice',
        attachmentIds: [uploaded.id],
        replyToId: replyTo?.id,
      });
      await appendSent({ ...message, body: message.body || formatDuration(seconds) });
      setReplyTo(null);
    } catch (err) {
      error(getErrorMessage(err));
    } finally {
      setUploading('');
    }
  }

  async function deleteMessage(id: string) {
    try {
      await messagesApi.removeMessage(id);
      setMessages((current) => current.filter((message) => message.id !== id));
      onActivity?.();
    } catch (err) {
      error(getErrorMessage(err));
    }
  }

  function call(type: 'audio' | 'video') {
    if (!peer) {
      error('Group calls are not available yet.');
      return;
    }
    void startCall(peer, type);
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-6 w-6 text-grape-400" />
      </div>
    );
  }

  if (loadError || !conversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <EmptyState icon={MessageCircle} title="Conversation unavailable" description={loadError || 'This chat could not be opened.'} />
      </div>
    );
  }

  const typingNames = Object.values(typingUsers);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-2.5 border-b border-white/[0.07] px-3 py-2.5">
        {showBack && (
          <button onClick={onBack} className="icon-btn -ml-1 md:hidden" aria-label="Back to conversations">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <Link to={peer && isDirect ? `/u/${peer.username}` : '#'} onClick={(event) => !isDirect && event.preventDefault()} className="shrink-0">
          <Avatar user={peer ?? { displayName: conversation.title, avatarUrl: conversation.avatarUrl }} size={38} online={isDirect && peerOnline} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{conversation.title}</p>
          <p className="truncate text-[11px] text-zinc-500">
            {typingNames.length
              ? `${typingNames.slice(0, 2).join(', ')} ${typingNames.length === 1 ? 'is' : 'are'} typing…`
              : isDirect
                ? peerOnline
                  ? 'Online'
                  : 'Offline'
                : `${conversation.members.length} members`}
          </p>
        </div>
        {isDirect && peer && (
          <>
            <button className="icon-btn text-emerald-300" onClick={() => call('audio')} aria-label="Start audio call">
              <Phone className="h-[19px] w-[19px]" />
            </button>
            <button className="icon-btn text-grape-300" onClick={() => call('video')} aria-label="Start video call">
              <Video className="h-[20px] w-[20px]" />
            </button>
          </>
        )}
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {cursor && (
          <div className="mb-3 flex justify-center">
            <button className="text-[11px] font-medium text-grape-300 hover:underline" onClick={() => void loadOlder()} disabled={loadingOlder}>
              {loadingOlder ? 'Loading earlier messages…' : 'Load earlier messages'}
            </button>
          </div>
        )}

        {messages.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="Say hi"
            description={isDirect ? `This is the beginning of your conversation with ${conversation.title}.` : 'Start the group conversation.'}
            className="py-12"
          />
        ) : (
          <div className="space-y-1">
            {messages.map((message, index) => {
              const previous = messages[index - 1];
              const date = new Date(message.createdAt).toDateString();
              const showDate = !previous || new Date(previous.createdAt).toDateString() !== date;
              return (
                <div key={message.id}>
                  {showDate && (
                    <div className="my-3 flex items-center gap-3">
                      <span className="h-px flex-1 bg-white/[0.06]" />
                      <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                        {new Date(message.createdAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                      <span className="h-px flex-1 bg-white/[0.06]" />
                    </div>
                  )}
                  <MessageBubble
                    message={message}
                    showSender={conversation.type === 'group' && !message.isMine}
                    onReply={() => {
                      setReplyTo(message);
                      inputRef.current?.focus();
                    }}
                    onDelete={() => void deleteMessage(message.id)}
                  />
                </div>
              );
            })}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {replyTo && (
        <div className="mx-3 mb-1 flex items-center gap-2 rounded-lg border-l-2 border-grape-500 bg-white/[0.03] px-3 py-1.5 text-xs">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-grape-300">Replying to {replyTo.isMine ? 'yourself' : replyTo.sender.displayName}</p>
            <p className="truncate text-zinc-500">{replyTo.body || (replyTo.kind === 'snap' ? 'Snap' : 'Attachment')}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="icon-btn h-6 w-6" aria-label="Cancel reply">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {uploading && (
        <div className="mx-3 mb-1 flex items-center gap-2 rounded-lg bg-grape-600/10 px-3 py-1.5 text-xs text-grape-200">
          <Spinner className="h-3.5 w-3.5" /> {uploading}
        </div>
      )}

      {recording ? (
        <div className="flex items-center gap-3 border-t border-white/[0.07] px-3 py-3">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" />
          <span className="text-sm font-medium text-rose-300">Recording {formatDuration(recordSeconds)}</span>
          <span className="text-[11px] text-zinc-500">Up to 2 minutes</span>
          <div className="ml-auto flex items-center gap-2">
            <button className="btn-ghost px-2 text-xs text-zinc-400" onClick={() => stopRecording(true)}>
              Cancel
            </button>
            <button className="btn-primary h-9 w-9 p-0" onClick={() => stopRecording(false)} aria-label="Send voice note">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={sendText} className="shrink-0 border-t border-white/[0.07] px-2 py-2">
          <div className="relative flex items-end gap-1">
            <div className="relative">
              <button type="button" className="icon-btn" onClick={() => setEmojiOpen((open) => !open)} aria-label="Add emoji">
                <Smile className="h-5 w-5" />
              </button>
              {emojiOpen && (
                <div className="absolute bottom-11 left-0 z-20 grid w-52 grid-cols-4 gap-1 rounded-xl border border-white/10 bg-ink-800 p-2 shadow-xl animate-pop-in">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="rounded-lg py-1.5 text-lg hover:bg-white/10"
                      onClick={() => {
                        handleInput(input + emoji);
                        setEmojiOpen(false);
                        inputRef.current?.focus();
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" className="icon-btn" onClick={() => fileRef.current?.click()} aria-label="Attach photo or video">
              <ImagePlus className="h-5 w-5" />
            </button>
            <button type="button" className="icon-btn text-amber-300" onClick={() => snapRef.current?.click()} aria-label="Send a snap">
              <Flame className="h-5 w-5" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadAndSend(file, false);
              }}
            />
            <input
              ref={snapRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadAndSend(file, true);
              }}
            />
            <input
              ref={inputRef}
              className="input min-w-0 flex-1 py-2.5"
              value={input}
              onChange={(event) => handleInput(event.target.value)}
              placeholder={`Message ${conversation.title}…`}
              maxLength={4000}
              disabled={sending || Boolean(uploading)}
            />
            {input.trim() ? (
              <button type="submit" className="btn-primary h-10 w-10 shrink-0 p-0" disabled={sending} aria-label="Send message">
                {sending ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              </button>
            ) : (
              <button type="button" className="icon-btn h-10 w-10 text-grape-300" onClick={() => void startRecording()} aria-label="Record voice note">
                <Mic className="h-5 w-5" />
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

function MessageBubble({
  message,
  showSender,
  onReply,
  onDelete,
}: {
  message: Message;
  showSender: boolean;
  onReply: () => void;
  onDelete: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const attachment = message.attachments[0];
  const src = attachment ? assetUrl(attachment.url) : null;

  if (message.kind === 'system') {
    return <p className="py-2 text-center text-[11px] text-zinc-600">{message.body}</p>;
  }

  return (
    <div className={cn('group flex w-full gap-2 py-0.5', message.isMine ? 'justify-end' : 'justify-start')}>
      {!message.isMine && showSender && (
        <Link to={`/u/${message.sender.username}`} className="mt-auto shrink-0">
          <Avatar user={message.sender} size={26} />
        </Link>
      )}
      <div className={cn('max-w-[82%] sm:max-w-[72%]', message.isMine ? 'items-end' : 'items-start')}>
        {showSender && !message.isMine && (
          <p className="mb-0.5 ml-1 text-[11px] font-medium text-zinc-500">{message.sender.displayName}</p>
        )}
        <div
          onDoubleClick={onReply}
          className={cn(
            'relative rounded-2xl px-3 py-2 text-sm',
            message.isMine
              ? 'rounded-br-md bg-grape-600 text-white'
              : 'rounded-bl-md border border-white/[0.06] bg-ink-800 text-zinc-200'
          )}
        >
          {message.replyTo && (
            <div className={cn('mb-1.5 rounded-lg border-l-2 px-2 py-1 text-[11px]', message.isMine ? 'border-white/40 bg-black/15 text-white/75' : 'border-grape-500/60 bg-black/15 text-zinc-400')}>
              <p className="font-semibold">{message.replyTo.senderName}</p>
              <p className="truncate">{message.replyTo.body}</p>
            </div>
          )}

          {message.kind === 'snap' ? (
            <SnapBubble message={message} src={src} revealed={revealed} onReveal={() => setRevealed(true)} />
          ) : attachment && ['image', 'video'].includes(message.kind) ? (
            attachment.type === 'video' || attachment.kind === 'video' ? (
              <video src={src ?? undefined} controls playsInline className="max-h-[320px] w-full min-w-[180px] rounded-xl object-contain" />
            ) : (
              <a href={src ?? '#'} target="_blank" rel="noreferrer">
                <img src={src ?? ''} alt="" className="max-h-[320px] w-full min-w-[160px] rounded-xl object-cover" />
              </a>
            )
          ) : attachment && message.kind === 'voice' ? (
            <div className="min-w-[220px]">
              <audio src={src ?? undefined} controls className="h-9 w-full" />
              <p className={cn('mt-0.5 text-[10px]', message.isMine ? 'text-white/60' : 'text-zinc-500')}>Voice note</p>
            </div>
          ) : null}

          {message.body && message.kind !== 'voice' && (
            <p className={cn('whitespace-pre-wrap break-words leading-relaxed', attachment ? 'mt-1.5' : '')}>{message.body}</p>
          )}

          <div className={cn('mt-1 flex items-center justify-end gap-1.5 text-[10px]', message.isMine ? 'text-white/60' : 'text-zinc-500')}>
            {message.expiresAt && <span>· {expiresIn(message.expiresAt)}</span>}
            <span>{timeAgo(message.createdAt)}</span>
            {message.isMine &&
              (message.status === 'read' ? (
                <CheckCheck className="h-3.5 w-3.5" />
              ) : message.status === 'delivered' ? (
                <CheckCheck className="h-3.5 w-3.5 opacity-60" />
              ) : (
                <Check className="h-3.5 w-3.5 opacity-60" />
              ))}
          </div>

          <div className={cn('absolute -top-3 hidden gap-1 rounded-full border border-white/10 bg-ink-900/95 px-1 py-0.5 shadow group-hover:flex', message.isMine ? 'right-1' : 'left-1')}>
            <button onClick={onReply} className="rounded-full p-1 text-zinc-400 hover:text-white" aria-label="Reply">
              <MessageCircle className="h-3 w-3" />
            </button>
            {message.isMine && (
              <button onClick={onDelete} className="rounded-full p-1 text-zinc-500 hover:text-rose-400" aria-label="Delete message">
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SnapBubble({
  message,
  src,
  revealed,
  onReveal,
}: {
  message: Message;
  src: string | null;
  revealed: boolean;
  onReveal: () => void;
}) {
  const attachment = message.attachments[0];
  const opened = Boolean(message.viewedAt);
  if (message.isMine) {
    return (
      <div className="flex min-w-[180px] items-center gap-2 rounded-xl bg-black/20 p-2">
        <Flame className="h-5 w-5 text-amber-300" />
        <div>
          <p className="text-xs font-semibold">Snap sent</p>
          <p className="text-[10px] text-white/60">{opened ? `Opened ${timeAgo(message.viewedAt)}` : 'Waiting to be opened'}</p>
        </div>
      </div>
    );
  }
  if (!revealed) {
    return (
      <button onClick={onReveal} className="flex min-w-[190px] items-center gap-2.5 rounded-xl bg-black/25 p-3 text-left transition hover:bg-black/35">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400/20 text-amber-300">
          <Flame className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-xs font-semibold text-white">Tap to view snap</span>
          <span className="block text-[10px] text-white/60">Expires in 24 hours</span>
        </span>
        <Eye className="ml-auto h-4 w-4 text-white/50" />
      </button>
    );
  }
  if (attachment?.type === 'video' || attachment?.kind === 'video') {
    return <video src={src ?? undefined} autoPlay controls playsInline className="max-h-[340px] w-full min-w-[180px] rounded-xl" />;
  }
  return <img src={src ?? ''} alt="Snap" className="max-h-[360px] w-full min-w-[180px] rounded-xl object-contain" />;
}
