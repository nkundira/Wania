import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Camera } from 'lucide-react';
import { getErrorMessage } from '../lib/api';
import { storiesApi } from '../services/wania';
import type { Story } from '../types';
import { StoryViewer } from '../components/StoryViewer';
import { EmptyState, ErrorState, LoadingScreen } from '../components/ui';

export function StoriesPage() {
  const { username = '' } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [open, setOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    storiesApi
      .user(username)
      .then((data) => {
        if (!cancelled) setStories(data);
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
  }, [username]);

  if (loading) return <LoadingScreen label="Loading stories…" />;

  if (loadError) {
    return (
      <div className="card mx-auto max-w-lg">
        <ErrorState message={loadError} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  if (!stories.length) {
    return (
      <div className="card mx-auto max-w-lg">
        <EmptyState
          icon={Camera}
          title="No active stories"
          description={`@${username} doesn’t have a story right now. Check back later.`}
          action={
            <button className="btn-secondary" onClick={() => navigate(`/u/${username}`)}>
              View profile
            </button>
          }
        />
      </div>
    );
  }

  const author = stories[0].author;
  const group = {
    author: {
      id: author.id,
      username: author.username,
      displayName: author.displayName,
      avatarUrl: author.avatarUrl,
      isPrivate: author.isPrivate,
    },
    stories,
    allSeen: stories.every((story) => story.seen),
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <p className="text-sm text-zinc-400">Opening @{username}’s story…</p>
        <button className="btn-secondary mt-4" onClick={() => navigate(`/u/${username}`)}>
          Back to profile
        </button>
      </div>
      <StoryViewer
        open={open}
        groups={[group]}
        initialGroupIndex={0}
        initialStoryIndex={0}
        onClose={() => {
          setOpen(false);
          navigate(`/u/${username}`);
        }}
        onViewed={(storyId) =>
          setStories((current) => current.map((story) => (story.id === storyId ? { ...story, seen: true } : story)))
        }
        onDeleted={(storyId) => setStories((current) => current.filter((story) => story.id !== storyId))}
      />
    </div>
  );
}
