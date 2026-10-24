import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Copy,
  Ellipsis,
  Heart,
  MapPin,
  MessageCircle,
  Pencil,
  Send,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react';
import { assetUrl, getErrorMessage } from '../lib/api';
import { postsApi } from '../services/wania';
import type { MediaAsset, Post } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { cn, timeAgo } from '../utils/format';
import { Avatar } from './Avatar';
import { Caption } from './Caption';
import { CommentsModal } from './CommentsModal';
import { ConfirmDialog } from './ConfirmDialog';
import { LikesModal } from './LikesModal';
import { Modal } from './Modal';
import { ReportModal } from './ReportModal';
import { Spinner } from './ui';

type PostCardProps = {
  post: Post;
  onChange?: (post: Post) => void;
  onDeleted?: (id: string) => void;
  className?: string;
};

function PostMedia({ media, onDoubleTap }: { media: MediaAsset[]; onDoubleTap: () => void }) {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const current = media[index];
  if (!current) return null;
  const src = assetUrl(current.url);

  return (
    <>
      <div className="relative select-none bg-black">
        <div className="relative flex min-h-[220px] items-center justify-center" onDoubleClick={onDoubleTap}>
          {current.type === 'video' ? (
            <video
              key={current.id}
              src={src ?? undefined}
              controls
              playsInline
              preload="metadata"
              className="max-h-[76vh] w-full object-contain"
              onClick={(event) => event.stopPropagation()}
            />
          ) : (
            <img
              key={current.id}
              src={src ?? ''}
              alt=""
              loading="lazy"
              className="max-h-[76vh] w-full cursor-zoom-in object-contain"
              onClick={() => setLightbox(true)}
            />
          )}

          {media.length > 1 && (
            <>
              <button
                type="button"
                className="icon-btn absolute left-2 top-1/2 -translate-y-1/2 bg-black/55 text-white hover:bg-black/75"
                onClick={(event) => {
                  event.stopPropagation();
                  setIndex((i) => (i - 1 + media.length) % media.length);
                }}
                aria-label="Previous media"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="icon-btn absolute right-2 top-1/2 -translate-y-1/2 bg-black/55 text-white hover:bg-black/75"
                onClick={(event) => {
                  event.stopPropagation();
                  setIndex((i) => (i + 1) % media.length);
                }}
                aria-label="Next media"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
                {index + 1}/{media.length}
              </div>
              <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
                {media.map((item, i) => (
                  <button
                    key={item.id}
                    className={cn('h-1.5 rounded-full transition-all', i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/40')}
                    onClick={(event) => {
                      event.stopPropagation();
                      setIndex(i);
                    }}
                    aria-label={`Show media ${i + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {lightbox &&
        createPortal(
          <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/95 p-3" onClick={() => setLightbox(false)}>
            <button className="icon-btn absolute right-4 top-4 bg-white/10 text-white" onClick={() => setLightbox(false)} aria-label="Close">
              <X className="h-5 w-5" />
            </button>
            <img src={src ?? ''} alt="" className="max-h-full max-w-full object-contain" onClick={(event) => event.stopPropagation()} />
          </div>,
          document.body
        )}
    </>
  );
}

export function PostCard({ post, onChange, onDeleted, className }: PostCardProps) {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [saved, setSaved] = useState(post.saved);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [likeBusy, setLikeBusy] = useState(false);
  const [heartBurst, setHeartBurst] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [likesOpen, setLikesOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editCaption, setEditCaption] = useState(post.caption);
  const [editBusy, setEditBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOwner = user?.id === post.author.id;

  useEffect(() => {
    setLiked(post.liked);
    setLikeCount(post.likeCount);
    setSaved(post.saved);
    setCommentCount(post.commentCount);
  }, [post.id, post.liked, post.likeCount, post.saved, post.commentCount]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  async function toggleLike(forceLike = false) {
    if (likeBusy) return;
    if (forceLike && liked) {
      setHeartBurst(true);
      window.setTimeout(() => setHeartBurst(false), 700);
      return;
    }
    setLikeBusy(true);
    const nextLiked = forceLike ? true : !liked;
    const nextCount = Math.max(0, likeCount + (nextLiked ? 1 : -1));
    setLiked(nextLiked);
    setLikeCount(nextCount);
    if (nextLiked) {
      setHeartBurst(true);
      window.setTimeout(() => setHeartBurst(false), 700);
    }
    try {
      const result = nextLiked ? await postsApi.like(post.id) : await postsApi.unlike(post.id);
      setLiked(result.liked);
      setLikeCount(result.likeCount);
      onChange?.({ ...post, liked: result.liked, likeCount: result.likeCount });
    } catch (err) {
      setLiked(!nextLiked);
      setLikeCount(likeCount);
      error(getErrorMessage(err));
    } finally {
      setLikeBusy(false);
    }
  }

  async function toggleSave() {
    const next = !saved;
    setSaved(next);
    try {
      if (next) await postsApi.save(post.id);
      else await postsApi.unsave(post.id);
      success(next ? 'Saved' : 'Removed from saved');
      onChange?.({ ...post, saved: next });
    } catch (err) {
      setSaved(!next);
      error(getErrorMessage(err));
    }
  }

  async function share() {
    const url = `${window.location.origin}/post/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${post.author.displayName} on WANIA`, text: post.caption, url });
      } else {
        await navigator.clipboard.writeText(url);
        success('Link copied');
      }
    } catch {
      // Sharing can be cancelled by the user.
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
    success('Link copied');
    setMenuOpen(false);
  }

  async function saveCaption() {
    setEditBusy(true);
    try {
      const updated = await postsApi.update(post.id, editCaption);
      onChange?.(updated);
      setEditOpen(false);
      success('Post updated');
    } catch (err) {
      error(getErrorMessage(err));
    } finally {
      setEditBusy(false);
    }
  }

  async function deletePost() {
    try {
      await postsApi.remove(post.id);
      success('Post deleted');
      onDeleted?.(post.id);
    } catch (err) {
      error(getErrorMessage(err));
      throw err;
    }
  }

  const longCaption = post.caption.length > 220;
  const media = post.media ?? [];

  return (
    <article className={cn('card overflow-hidden', className)}>
      <div className="flex items-center gap-3 px-4 py-3">
        <Link to={`/u/${post.author.username}`}>
          <Avatar user={post.author} size={40} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link to={`/u/${post.author.username}`} className="block truncate text-sm font-semibold text-white hover:underline">
            {post.author.displayName}
          </Link>
          <p className="flex items-center gap-1.5 truncate text-[11px] text-zinc-500">
            <span>@{post.author.username}</span>
            <span>·</span>
            <span>{timeAgo(post.createdAt)}</span>
            {post.location && (
              <>
                <span>·</span>
                <MapPin className="h-3 w-3" />
                <span className="truncate">{post.location}</span>
              </>
            )}
          </p>
        </div>
        <div className="relative" ref={menuRef}>
          <button className="icon-btn" onClick={() => setMenuOpen((open) => !open)} aria-label="Post options">
            <Ellipsis className="h-5 w-5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-10 z-30 w-48 overflow-hidden rounded-xl border border-white/10 bg-ink-800 py-1 shadow-2xl animate-pop-in">
              {isOwner ? (
                <>
                  <button
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-zinc-200 hover:bg-white/[0.06]"
                    onClick={() => {
                      setEditOpen(true);
                      setMenuOpen(false);
                    }}
                  >
                    <Pencil className="h-4 w-4" /> Edit caption
                  </button>
                  <button
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-rose-300 hover:bg-rose-500/10"
                    onClick={() => {
                      setDeleteOpen(true);
                      setMenuOpen(false);
                    }}
                  >
                    <Trash2 className="h-4 w-4" /> Delete post
                  </button>
                </>
              ) : (
                <button
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-rose-300 hover:bg-rose-500/10"
                  onClick={() => {
                    setReportOpen(true);
                    setMenuOpen(false);
                  }}
                >
                  <TriangleAlert className="h-4 w-4" /> Report
                </button>
              )}
              <button
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-zinc-200 hover:bg-white/[0.06]"
                onClick={copyLink}
              >
                <Copy className="h-4 w-4" /> Copy link
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        <PostMedia media={media} onDoubleTap={() => void toggleLike(true)} />
        {heartBurst && (
          <Heart
            className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 fill-white text-white drop-shadow-2xl animate-pop-in"
            aria-hidden
          />
        )}
      </div>

      <div className="px-4 pb-4 pt-2">
        <div className="-ml-1 flex items-center gap-1">
          <button
            className={cn('icon-btn', liked && 'text-rose-400 hover:text-rose-300')}
            onClick={() => void toggleLike()}
            aria-label={liked ? 'Unlike' : 'Like'}
          >
            <Heart className={cn('h-6 w-6 transition-transform', liked && 'fill-current', heartBurst && 'scale-125')} />
          </button>
          <button className="icon-btn" onClick={() => setCommentsOpen(true)} aria-label="Comments">
            <MessageCircle className="h-6 w-6" />
          </button>
          <button className="icon-btn" onClick={() => void share()} aria-label="Share post">
            <Send className="h-5 w-5" />
          </button>
          <button
            className={cn('icon-btn ml-auto', saved && 'text-grape-300')}
            onClick={() => void toggleSave()}
            aria-label={saved ? 'Unsave post' : 'Save post'}
          >
            <Bookmark className={cn('h-6 w-6', saved && 'fill-current')} />
          </button>
        </div>

        {likeCount > 0 && (
          <button onClick={() => setLikesOpen(true)} className="mt-1 text-sm font-semibold text-white hover:underline">
            {likeCount.toLocaleString()} {likeCount === 1 ? 'like' : 'likes'}
          </button>
        )}

        {post.caption && (
          <div className="mt-1.5 text-sm leading-relaxed text-zinc-300">
            <Link to={`/u/${post.author.username}`} className="mr-1.5 font-semibold text-white hover:underline">
              {post.author.username}
            </Link>
            <span className={cn('inline', !expanded && longCaption && 'clamp-3')}>
              <Caption text={post.caption} className="inline" />
            </span>
            {longCaption && (
              <button className="ml-1 text-xs font-medium text-zinc-500 hover:text-zinc-300" onClick={() => setExpanded((value) => !value)}>
                {expanded ? 'less' : 'more'}
              </button>
            )}
          </div>
        )}

        {commentCount > 0 && (
          <button onClick={() => setCommentsOpen(true)} className="mt-1.5 text-sm text-zinc-500 hover:text-zinc-300">
            View all {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
          </button>
        )}

        <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-zinc-600">{timeAgo(post.createdAt)}</p>
      </div>

      <CommentsModal
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        postId={post.id}
        initialCount={commentCount}
        onCountChange={(value) => {
          setCommentCount(value);
          onChange?.({ ...post, commentCount: value });
        }}
      />
      <LikesModal open={likesOpen} onClose={() => setLikesOpen(false)} postId={post.id} />
      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} targetType="post" targetId={post.id} />
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete this post?"
        description="This will permanently remove the post, its likes, and comments."
        confirmLabel="Delete"
        destructive
        onConfirm={deletePost}
      />
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit caption" size="sm">
        <textarea
          className="input min-h-[110px] resize-none"
          value={editCaption}
          maxLength={2200}
          onChange={(event) => setEditCaption(event.target.value)}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setEditOpen(false)} disabled={editBusy}>
            Cancel
          </button>
          <button className="btn-primary" onClick={() => void saveCaption()} disabled={editBusy}>
            {editBusy && <Spinner className="h-4 w-4" />}
            Save
          </button>
        </div>
      </Modal>
    </article>
  );
}
