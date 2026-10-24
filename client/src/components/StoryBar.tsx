import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Plus } from 'lucide-react';
import { assetUrl } from '../lib/api';
import { storiesApi } from '../services/wania';
import type { StoryGroup } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/format';
import { Avatar } from './Avatar';
import { StoryViewer } from './StoryViewer';

export function StoryBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await storiesApi.feed();
      setGroups(data);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const onFocus = () => void load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [load]);

  const ownIndex = groups.findIndex((group) => group.author.id === user?.id);
  const ownGroup = ownIndex >= 0 ? groups[ownIndex] : null;

  function openGroup(index: number) {
    setStartIndex(index);
    setViewerOpen(true);
  }

  function markViewed(storyId: string) {
    setGroups((current) =>
      current.map((group) => ({
        ...group,
        stories: group.stories.map((story) => (story.id === storyId ? { ...story, seen: true } : story)),
        allSeen: group.stories.every((story) => story.id === storyId || story.seen),
      }))
    );
  }

  if (loading) {
    return (
      <div className="flex gap-4 overflow-hidden">
        {[0, 1, 2, 3, 4].map((item) => (
          <div key={item} className="w-[72px] shrink-0 space-y-2">
            <div className="skeleton h-[66px] w-[66px] rounded-full" />
            <div className="skeleton mx-auto h-2.5 w-12" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="no-scrollbar -mx-1 flex gap-4 overflow-x-auto px-1 pb-1">
        <button
          type="button"
          onClick={() => {
            if (ownGroup) openGroup(ownIndex);
            else navigate('/create?story=1');
          }}
          className="group flex w-[72px] shrink-0 flex-col items-center gap-1.5"
        >
          <span className="relative">
            <span className={cn('block rounded-full p-[2.5px]', ownGroup ? (ownGroup.allSeen ? 'bg-white/15' : 'bg-gradient-to-tr from-grape-600 via-fuchsia-500 to-amber-400') : 'bg-white/10')}>
              {user ? (
                <Avatar user={user} size={61} ring />
              ) : (
                <span className="block h-[61px] w-[61px] rounded-full bg-ink-700" />
              )}
            </span>
            <span
              className="absolute -bottom-0.5 -right-0.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 border-ink-900 bg-grape-500 text-white"
              onClick={(event) => {
                event.stopPropagation();
                navigate('/create?story=1');
              }}
              role="button"
              tabIndex={0}
              aria-label="Add to your story"
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.stopPropagation();
                  navigate('/create?story=1');
                }
              }}
            >
              <Plus className="h-3 w-3" strokeWidth={3} />
            </span>
          </span>
          <span className="w-full truncate text-center text-[11px] font-medium text-zinc-300">Your story</span>
        </button>

        {groups
          .filter((group) => group.author.id !== user?.id)
          .map((group) => {
            const index = groups.findIndex((item) => item.author.id === group.author.id);
            const preview = group.stories.find((story) => !story.seen) ?? group.stories[0];
            const thumb = preview?.media.type === 'image' ? assetUrl(preview.media.url) : null;
            return (
              <button
                key={group.author.id}
                type="button"
                onClick={() => openGroup(index)}
                className="flex w-[72px] shrink-0 flex-col items-center gap-1.5"
              >
                <span className={cn('relative rounded-full p-[2.5px]', group.allSeen ? 'bg-white/15' : 'bg-gradient-to-tr from-grape-600 via-fuchsia-500 to-amber-400')}>
                  <span className="relative block h-[63px] w-[63px] overflow-hidden rounded-full border-2 border-ink-900 bg-ink-700">
                    {thumb ? (
                      <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-grape-700 to-ink-800">
                        <Play className="h-5 w-5 text-white/80" />
                      </span>
                    )}
                  </span>
                  {group.author.isOnline && (
                    <span className="absolute bottom-1 right-1 h-3 w-3 rounded-full border-2 border-ink-900 bg-emerald-400" />
                  )}
                </span>
                <span className="w-full truncate text-center text-[11px] font-medium text-zinc-300">{group.author.username}</span>
              </button>
            );
          })}
      </div>

      <StoryViewer
        open={viewerOpen}
        groups={groups}
        initialGroupIndex={startIndex}
        onClose={() => {
          setViewerOpen(false);
          void load();
        }}
        onViewed={markViewed}
      />
    </>
  );
}
