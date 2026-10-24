import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Film, Heart, MessageCircle, Pause, Play, Send, Volume2, VolumeX } from 'lucide-react';
import { assetUrl, getErrorMessage } from '../lib/api';
import { postsApi } from '../services/wania';
import type { Post } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { cn } from '../utils/format';
import { Avatar } from '../components/Avatar';
import { Caption } from '../components/Caption';
import { CommentsModal } from '../components/CommentsModal';
import { FollowButton } from '../components/FollowButton';
import { LikesModal } from '../components/LikesModal';
import { EmptyState, ErrorState, Spinner } from '../components/ui';

function ReelCard({ post, active, onChange }: { post: Post; active: boolean; onChange: (post: Post) => void }) {
  const { user } = useAuth();
  const { success, error } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [saved, setSaved] = useState(post.saved);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [likesOpen, setLikesOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const media = post.media?.[0];
  const src = assetUrl(media?.url);
  const isOwner = user?.id === post.author.id;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active && playing) {
      video.play().catch(() => setPlaying(false));
    } else {
      video.pause();
    }
  }, [active, playing]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  async function toggleLike() {
    if (busy) return;
    setBusy(true);
    const next = !liked;
    setLiked(next);
    setLikeCount((count) => Math.max(0, count + (next ? 1 : -1)));
    try {
      const result = next ? await postsApi.like(post.id) : await postsApi.unlike(post.id);
      setLiked(result.liked);
      setLikeCount(result.likeCount);
      onChange({ ...post, liked: result.liked, likeCount: result.likeCount });
    } catch (err) {
      setLiked(!next);
      setLikeCount(post.likeCount);
      error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggleSave() {
    const next = !saved;
    setSaved(next);
    try {
      if (next) await postsApi.save(post.id);
      else await postsApi.unsave(post.id);
      success(next ? 'Saved' : 'Removed from saved');
      onChange({ ...post, saved: next });
    } catch (err) {
      setSaved(!next);
      error(getErrorMessage(err));
    }
  }

  async function share() {
    const url = `${window.location.origin}/post/${post.id}`;
    try {
      if (navigator.share) await navigator.share({ title: `${post.author.displayName} on WANIA`, url });
      else {
        await navigator.clipboard.writeText(url);
        success('Link copied');
      }
    } catch {
      // User cancelled the native share sheet.
    }
  }

  return (
    <article className="relative mx-auto aspect-[9/16] max-h-[80vh] w-full max-w-[430px] overflow-hidden rounded-2xl border border-white/10 bg-black shadow-card">
      {media?.type === 'video' ? (
        <video
          ref={videoRef}
          src={src ?? undefined}
          loop
          muted={muted}
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
          onClick={() => setPlaying((value) => !value)}
          onDoubleClick={() => void toggleLike()}
        />
      ) : src ? (
        <img src={src} alt={post.caption} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-grape-800 to-ink-900 p-8 text-center text-sm text-zinc-300">
          {post.caption}
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/35" />

      <div className="absolute right-3 top-3 flex flex-col gap-2">
        <button onClick={() => setMuted((value) => !value)} className="icon-btn bg-black/35 text-white backdrop-blur" aria-label={muted ? 'Unmute' : 'Mute'}>
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      </div>

      {!playing && (
        <button
          onClick={() => setPlaying(true)}
          className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur"
          aria-label="Play reel"
        >
          <Play className="h-7 w-7 fill-current" />
        </button>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-4">
        <div className="min-w-0 flex-1 text-white">
          <div className="flex items-center gap-2">
            <Link to={`/u/${post.author.username}`}>
              <Avatar user={post.author} size={34} ring />
            </Link>
            <Link to={`/u/${post.author.username}`} className="truncate text-sm font-semibold hover:underline">
              {post.author.username}
            </Link>
            {!isOwner && (
              <FollowButton
                userId={post.author.id}
                isFollowing={Boolean(post.author.isFollowing)}
                isPrivate={post.author.isPrivate}
                size="sm"
                className="px-2 py-1 text-[10px]"
              />
            )}
          </div>
          {post.caption && <Caption text={post.caption} className="mt-2 block text-sm leading-snug text-white/90 clamp-3" />}
          <p className="mt-1.5 text-[10px] text-white/50">Original audio · WANIA</p>
        </div>

        <div className="flex flex-col items-center gap-3 pb-1">
          <button onClick={() => void toggleLike()} className="flex flex-col items-center gap-0.5 text-white" aria-label={liked ? 'Unlike' : 'Like'}>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/35 backdrop-blur">
              <Heart className={cn('h-5 w-5', liked && 'fill-rose-500 text-rose-500')} />
            </span>
            <span className="text-[10px] font-medium">{likeCount}</span>
          </button>
          <button onClick={() => setCommentsOpen(true)} className="flex flex-col items-center gap-0.5 text-white" aria-label="Comments">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/35 backdrop-blur">
              <MessageCircle className="h-5 w-5" />
            </span>
            <span className="text-[10px] font-medium">{commentCount}</span>
          </button>
          <button onClick={() => void share()} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur" aria-label="Share reel">
            <Send className="h-5 w-5" />
          </button>
          <button onClick={() => void toggleSave()} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur" aria-label={saved ? 'Unsave' : 'Save'}>
            <Bookmark className={cn('h-5 w-5', saved && 'fill-grape-300 text-grape-300')} />
          </button>
          <button onClick={() => setPlaying((value) => !value)} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur" aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <CommentsModal
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        postId={post.id}
        initialCount={commentCount}
        onCountChange={(value) => {
          setCommentCount(value);
          onChange({ ...post, commentCount: value });
        }}
      />
      <LikesModal open={likesOpen} onClose={() => setLikesOpen(false)} postId={post.id} />
    </article>
  );
}

export function ReelsPage() {
  const { error } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await postsApi.reels();
      setPosts(data.items);
      setCursor(data.nextCursor);
      setActiveId(data.items[0]?.id ?? null);
    } catch (err) {
      setLoadError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const id = (visible.target as HTMLElement).dataset.reelId;
          if (id) setActiveId(id);
        }
      },
      { root: null, threshold: [0.35, 0.6, 0.85] }
    );
    const cards = container.querySelectorAll('[data-reel-id]');
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [posts]);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await postsApi.reels(cursor);
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
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-white">Reels</h1>
          <p className="mt-0.5 text-xs text-zinc-500">Short moments, in motion.</p>
        </div>
        <span className="chip">
          <Film className="h-3.5 w-3.5" /> {posts.length} reels
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-6 w-6 text-grape-400" />
        </div>
      ) : loadError ? (
        <div className="card">
          <ErrorState message={loadError} onRetry={() => void load()} />
        </div>
      ) : posts.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Film}
            title="No reels yet"
            description="Be the first to share a short moment. Reels are a great way to show your world in motion."
            action={
              <Link to="/create?type=reel" className="btn-primary">
                Create a reel
              </Link>
            }
          />
        </div>
      ) : (
        <div ref={containerRef} className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} data-reel-id={post.id}>
              <ReelCard
                post={post}
                active={activeId === post.id}
                onChange={(next) => setPosts((current) => current.map((item) => (item.id === next.id ? next : item)))}
              />
            </div>
          ))}
          {cursor && (
            <div className="flex justify-center py-4">
              <button className="btn-secondary" onClick={() => void loadMore()} disabled={loadingMore}>
                {loadingMore && <Spinner className="h-4 w-4" />}
                {loadingMore ? 'Loading…' : 'More reels'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
