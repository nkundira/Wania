import { useEffect, useState } from 'react';
import { ArrowLeft, ImageOff } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getErrorMessage } from '../lib/api';
import { postsApi } from '../services/wania';
import type { Post } from '../types';
import { PostCard } from '../components/PostCard';
import { EmptyState, LoadingScreen } from '../components/ui';

export function PostDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    postsApi
      .get(id)
      .then((data) => {
        if (!cancelled) setPost(data);
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
  }, [id]);

  if (loading) return <LoadingScreen label="Loading post…" />;

  if (loadError || !post) {
    return (
      <div className="card mx-auto max-w-lg">
        <EmptyState
          icon={ImageOff}
          title="Post unavailable"
          description={loadError || 'This post may have been deleted or you no longer have access to it.'}
          action={
            <button className="btn-secondary" onClick={() => navigate(-1)}>
              Go back
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="icon-btn" aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-lg font-bold text-white">Post</h1>
      </div>

      <PostCard
        post={post}
        onChange={setPost}
        onDeleted={() => navigate('/', { replace: true })}
      />

      <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <p className="text-[11px] leading-relaxed text-zinc-500">
          Shared by{' '}
          <button onClick={() => navigate(`/u/${post.author.username}`)} className="font-semibold text-grape-300 hover:underline">
            @{post.author.username}
          </button>
          . Be kind, stay curious and keep the world a little brighter.
        </p>
      </div>

    </div>
  );
}
