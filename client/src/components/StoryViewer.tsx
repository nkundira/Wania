import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Eye, MessageCircle, MoreHorizontal, Send, Trash2, X } from 'lucide-react';
import { assetUrl, getErrorMessage } from '../lib/api';
import { storiesApi } from '../services/wania';
import type { Story, StoryGroup, UserSummary } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { cn, expiresIn, timeAgo } from '../utils/format';
import { Avatar } from './Avatar';
import { Modal } from './Modal';
import { Spinner, EmptyState } from './ui';

const REACTIONS = ['❤️', '🔥', '😂', '😮', '👏'];

type StoryViewerProps = {
  open: boolean;
  groups: StoryGroup[];
  initialGroupIndex?: number;
  initialStoryIndex?: number;
  onClose: () => void;
  onViewed?: (storyId: string) => void;
  onDeleted?: (storyId: string) => void;
};

export function StoryViewer({
  open,
  groups,
  initialGroupIndex = 0,
  initialStoryIndex = 0,
  onClose,
  onViewed,
  onDeleted,
}: StoryViewerProps) {
  const { user } = useAuth();
  const { error, success } = useToast();
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(initialStoryIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [viewers, setViewers] = useState<UserSummary[]>([]);
  const [viewersLoading, setViewersLoading] = useState(false);
  const viewedRef = useRef<Set<string>>(new Set());

  const group = groups[groupIndex];
  const story = group?.stories[storyIndex];
  const isOwner = Boolean(user && story && user.id === story.author.id);

  useEffect(() => {
    if (!open) return;
    setGroupIndex(initialGroupIndex);
    setStoryIndex(initialStoryIndex);
    setProgress(0);
    setReply('');
  }, [open, initialGroupIndex, initialStoryIndex]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !story) return;
    setProgress(0);
    setPaused(false);
    if (!viewedRef.current.has(story.id)) {
      viewedRef.current.add(story.id);
      storiesApi
        .get(story.id)
        .then(() => onViewed?.(story.id))
        .catch(() => undefined);
    }
  }, [open, story?.id, onViewed]);

  const goNext = useCallback(() => {
    if (!groups.length) return;
    const currentGroup = groups[groupIndex];
    if (storyIndex < (currentGroup?.stories.length ?? 1) - 1) {
      setStoryIndex((index) => index + 1);
      return;
    }
    if (groupIndex < groups.length - 1) {
      setGroupIndex((index) => index + 1);
      setStoryIndex(0);
      return;
    }
    onClose();
  }, [groupIndex, groups, onClose, storyIndex]);

  const goPrev = useCallback(() => {
    if (!groups.length) return;
    if (storyIndex > 0) {
      setStoryIndex((index) => index - 1);
      return;
    }
    if (groupIndex > 0) {
      const previousGroup = groups[groupIndex - 1];
      setGroupIndex((index) => index - 1);
      setStoryIndex(Math.max(0, previousGroup.stories.length - 1));
      return;
    }
    setProgress(0);
  }, [groupIndex, groups, storyIndex]);

  const goNextRef = useRef(goNext);
  const goPrevRef = useRef(goPrev);

  useEffect(() => {
    goNextRef.current = goNext;
    goPrevRef.current = goPrev;
  }, [goNext, goPrev]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') goNextRef.current();
      if (event.key === 'ArrowLeft') goPrevRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !story || paused || story.media.type === 'video') return;
    const duration = 5200;
    const start = Date.now();
    const interval = window.setInterval(() => {
      const next = Math.min(1, (Date.now() - start) / duration);
      setProgress(next);
      if (next >= 1) {
        window.clearInterval(interval);
        goNextRef.current();
      }
    }, 50);
    return () => window.clearInterval(interval);
  }, [open, story?.id, paused, story?.media.type]);

  async function react(emoji: string) {
    if (!story) return;
    try {
      await storiesApi.react(story.id, emoji);
      success(`Reacted ${emoji}`);
    } catch (err) {
      error(getErrorMessage(err));
    }
  }

  async function sendReply(event: React.FormEvent) {
    event.preventDefault();
    if (!story || !reply.trim() || sending) return;
    setSending(true);
    try {
      await storiesApi.reply(story.id, reply.trim());
      setReply('');
      success('Reply sent');
    } catch (err) {
      error(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  async function deleteStory() {
    if (!story) return;
    setDeleting(true);
    try {
      await storiesApi.remove(story.id);
      onDeleted?.(story.id);
      success('Story deleted');
      if (group.stories.length <= 1) onClose();
      else goNext();
    } catch (err) {
      error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  async function openViewers() {
    if (!story) return;
    setViewersOpen(true);
    setViewersLoading(true);
    try {
      setViewers(await storiesApi.viewers(story.id));
    } catch (err) {
      error(getErrorMessage(err));
    } finally {
      setViewersLoading(false);
    }
  }

  const progressBars = useMemo(() => {
    if (!group) return [];
    return group.stories.map((item, index) => {
      if (index < storyIndex) return 1;
      if (index === storyIndex) return progress;
      return 0;
    });
  }, [group, progress, storyIndex]);

  if (!open || !group || !story) return null;
  const src = assetUrl(story.media.url);

  return createPortal(
    <div className="fixed inset-0 z-[190] flex items-center justify-center bg-black/95">
      <button className="icon-btn absolute right-3 top-3 z-20 bg-white/10 text-white hover:bg-white/20" onClick={onClose} aria-label="Close stories">
        <X className="h-5 w-5" />
      </button>

      <div
        className="relative h-[100dvh] w-full max-w-[430px] overflow-hidden bg-ink-950 sm:h-[92dvh] sm:rounded-2xl sm:border sm:border-white/10"
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
      >
        <div className="absolute inset-x-0 top-0 z-10 flex gap-1 p-2.5">
          {progressBars.map((value, index) => (
            <div key={index} className="h-[2.5px] flex-1 overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white transition-[width] duration-100" style={{ width: `${value * 100}%` }} />
            </div>
          ))}
        </div>

        <div className="absolute inset-x-0 top-6 z-10 flex items-center gap-2.5 px-3 py-2">
          <Link to={`/u/${story.author.username}`} onClick={onClose}>
            <Avatar user={story.author} size={34} ring />
          </Link>
          <div className="min-w-0 flex-1">
            <Link to={`/u/${story.author.username}`} onClick={onClose} className="block truncate text-sm font-semibold text-white">
              {story.author.displayName}
            </Link>
            <p className="text-[11px] text-white/65">
              {timeAgo(story.createdAt)} · {expiresIn(story.expiresAt)}
            </p>
          </div>
          {isOwner && (
            <button
              onClick={() => {
                if (window.confirm('Delete this story?')) void deleteStory();
              }}
              className="icon-btn bg-black/25 text-white/80"
              aria-label="Delete story"
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          {story.media.type === 'video' ? (
            <video
              key={story.id}
              src={src ?? undefined}
              autoPlay
              playsInline
              className="h-full w-full object-contain"
              onTimeUpdate={(event) => {
                const video = event.currentTarget;
                if (video.duration) setProgress(Math.min(1, video.currentTime / video.duration));
              }}
              onEnded={goNext}
            />
          ) : (
            <img key={story.id} src={src ?? ''} alt={story.caption || 'Story'} className="h-full w-full object-contain" />
          )}
        </div>

        <button
          className="absolute inset-y-0 left-0 z-10 w-1/3"
          onClick={(event) => {
            event.stopPropagation();
            goPrev();
          }}
          aria-label="Previous story"
        />
        <button
          className="absolute inset-y-0 right-0 z-10 w-1/3"
          onClick={(event) => {
            event.stopPropagation();
            goNext();
          }}
          aria-label="Next story"
        />

        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-12">
          {story.caption && <p className="mb-3 text-sm text-white drop-shadow">{story.caption}</p>}
          {isOwner ? (
            <button onClick={() => void openViewers()} className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
              <Eye className="h-4 w-4" /> {story.viewCount} {story.viewCount === 1 ? 'view' : 'views'}
            </button>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-center gap-2">
                {REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => void react(emoji)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-lg backdrop-blur transition hover:scale-110 hover:bg-black/55"
                    aria-label={`React ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <form onSubmit={sendReply} className="flex items-center gap-2">
                <input
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  onFocus={() => setPaused(true)}
                  onBlur={() => setPaused(false)}
                  placeholder={`Reply to ${story.author.displayName}…`}
                  className="h-10 flex-1 rounded-full border border-white/20 bg-black/35 px-4 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none"
                  maxLength={1000}
                />
                <button
                  type="submit"
                  disabled={!reply.trim() || sending}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink-950 disabled:opacity-40"
                  aria-label="Send reply"
                >
                  {sending ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            </>
          )}
        </div>

        <button onClick={goPrev} className="absolute left-1 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-black/30 p-2 text-white/80 hover:bg-black/50 sm:block" aria-label="Previous">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button onClick={goNext} className="absolute right-1 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-black/30 p-2 text-white/80 hover:bg-black/50 sm:block" aria-label="Next">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <Modal open={viewersOpen} onClose={() => setViewersOpen(false)} title="Story viewers" size="sm">
        {viewersLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : viewers.length === 0 ? (
          <EmptyState icon={Eye} title="No views yet" className="py-8" />
        ) : (
          <div className="max-h-[55vh] space-y-1 overflow-y-auto">
            {viewers.map((viewer) => (
              <div key={viewer.id} className="flex items-center gap-3 py-1.5">
                <Avatar user={viewer} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{viewer.displayName}</p>
                  <p className="text-[11px] text-zinc-500">@{viewer.username} · {timeAgo(viewer.viewedAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>,
    document.body
  );
}
