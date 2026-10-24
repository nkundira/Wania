import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Send, Trash2, X } from 'lucide-react';
import { getErrorMessage } from '../lib/api';
import { postsApi } from '../services/wania';
import type { Comment } from '../types';
import { cn, timeAgo } from '../utils/format';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Avatar } from './Avatar';
import { Modal } from './Modal';
import { EmptyState, Spinner } from './ui';

type CommentsModalProps = {
  open: boolean;
  onClose: () => void;
  postId: string;
  initialCount?: number;
  onCountChange?: (count: number) => void;
};

export function CommentsModal({ open, onClose, postId, initialCount, onCountChange }: CommentsModalProps) {
  const { user } = useAuth();
  const { error } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    postsApi
      .comments(postId)
      .then((data) => {
        if (!cancelled) setComments(data);
      })
      .catch((err) => {
        if (!cancelled) error(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, postId, error]);

  useEffect(() => {
    if (!open) {
      setBody('');
      setReplyTo(null);
    }
  }, [open]);

  const grouped = useMemo(() => {
    const roots = comments.filter((comment) => !comment.parentId);
    const replies = new Map<string, Comment[]>();
    for (const comment of comments) {
      if (!comment.parentId) continue;
      const parent = comments.find((item) => item.id === comment.parentId);
      const rootId = parent?.parentId ?? comment.parentId;
      replies.set(rootId, [...(replies.get(rootId) ?? []), comment]);
    }
    return roots.map((root) => ({ root, replies: replies.get(root.id) ?? [] }));
  }, [comments]);

  const count = comments.length || initialCount || 0;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const comment = await postsApi.comment(postId, text, replyTo?.id);
      setComments((current) => [...current, comment]);
      setBody('');
      setReplyTo(null);
      onCountChange?.(count + 1);
    } catch (err) {
      error(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  async function remove(id: string) {
    try {
      await postsApi.deleteComment(id);
      const childIds = comments.filter((item) => item.parentId === id).map((item) => item.id);
      setComments((current) => current.filter((item) => item.id !== id && !childIds.includes(item.id)));
      onCountChange?.(Math.max(0, count - 1 - childIds.length));
    } catch (err) {
      error(getErrorMessage(err));
    }
  }

  function startReply(comment: Comment) {
    setReplyTo(comment);
    setBody(`@${comment.author.username} `);
    inputRef.current?.focus();
  }

  return (
    <Modal open={open} onClose={onClose} title={`Comments${count ? ` · ${count}` : ''}`} size="md">
      <div className="-mx-1 max-h-[52vh] min-h-[180px] overflow-y-auto pr-1">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner className="text-grape-400" />
          </div>
        ) : grouped.length === 0 ? (
          <EmptyState icon={MessageCircle} title="No comments yet" description="Start the conversation." className="py-10" />
        ) : (
          <div className="space-y-4">
            {grouped.map(({ root, replies }) => (
              <div key={root.id}>
                <CommentRow comment={root} onReply={startReply} onDelete={remove} currentUserId={user?.id} />
                {replies.length > 0 && (
                  <div className="ml-11 mt-3 space-y-3 border-l border-white/[0.07] pl-3">
                    {replies.map((reply) => (
                      <CommentRow key={reply.id} comment={reply} onReply={startReply} onDelete={remove} currentUserId={user?.id} small />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={submit} className="mt-4 border-t border-white/[0.07] pt-4">
        {replyTo && (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-grape-600/10 px-3 py-1.5 text-xs text-grape-300">
            <span>Replying to @{replyTo.author.username}</span>
            <button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          {user && <Avatar user={user} size={34} />}
          <input
            ref={inputRef}
            className="input"
            placeholder={user ? 'Add a comment…' : 'Sign in to comment'}
            value={body}
            maxLength={1000}
            disabled={!user}
            onChange={(event) => setBody(event.target.value)}
          />
          <button
            type="submit"
            className="btn-primary h-10 w-10 shrink-0 p-0"
            disabled={!body.trim() || sending || !user}
            aria-label="Post comment"
          >
            {sending ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CommentRow({
  comment,
  onReply,
  onDelete,
  currentUserId,
  small,
}: {
  comment: Comment;
  onReply: (comment: Comment) => void;
  onDelete: (id: string) => void;
  currentUserId?: string;
  small?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <Link to={`/u/${comment.author.username}`} className="mt-0.5 shrink-0">
        <Avatar user={comment.author} size={small ? 28 : 36} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link to={`/u/${comment.author.username}`} className={cn('truncate font-semibold text-white hover:underline', small ? 'text-xs' : 'text-sm')}>
            {comment.author.username}
          </Link>
          <span className="text-[11px] text-zinc-500">{timeAgo(comment.createdAt)}</span>
        </div>
        <p className={cn('mt-0.5 whitespace-pre-wrap break-words leading-relaxed text-zinc-300', small ? 'text-xs' : 'text-sm')}>
          {comment.body}
        </p>
        <div className="mt-1 flex items-center gap-4 text-[11px] font-medium text-zinc-500">
          <button onClick={() => onReply(comment)} className="hover:text-zinc-200">
            Reply
          </button>
          {(comment.isOwner || comment.author.id === currentUserId) && (
            <button onClick={() => onDelete(comment.id)} className="inline-flex items-center gap-1 hover:text-rose-400">
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
