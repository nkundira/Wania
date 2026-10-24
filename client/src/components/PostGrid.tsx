import { Link } from 'react-router-dom';
import { Heart, Layers, MessageCircle, Play } from 'lucide-react';
import { assetUrl } from '../lib/api';
import type { Post } from '../types';

export function PostGrid({ posts }: { posts: Post[] }) {
  return (
    <div className="grid grid-cols-3 gap-1 sm:gap-2">
      {posts.map((post) => {
        const media = post.media?.[0];
        const src = assetUrl(media?.url);
        return (
          <Link
            key={post.id}
            to={`/post/${post.id}`}
            className="group relative aspect-square overflow-hidden bg-ink-800"
            aria-label={`Open post by ${post.author.username}`}
          >
            {media?.type === 'video' ? (
              <video
                src={src ?? undefined}
                muted
                playsInline
                preload="metadata"
                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
              />
            ) : src ? (
              <img
                src={src}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-grape-800 to-ink-800 p-3 text-center text-xs text-zinc-300">
                {post.caption || 'Post'}
              </div>
            )}

            <div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/55 opacity-0 transition group-hover:opacity-100">
              <span className="flex items-center gap-1 text-sm font-semibold text-white">
                <Heart className="h-4 w-4 fill-current" /> {post.likeCount}
              </span>
              <span className="flex items-center gap-1 text-sm font-semibold text-white">
                <MessageCircle className="h-4 w-4 fill-current" /> {post.commentCount}
              </span>
            </div>

            {media?.type === 'video' && (
              <Play className="absolute right-2 top-2 h-4 w-4 fill-white text-white drop-shadow" />
            )}
            {post.media.length > 1 && <Layers className="absolute left-2 top-2 h-4 w-4 text-white drop-shadow" />}
            {post.type === 'reel' && (
              <span className="absolute bottom-2 left-2 rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                Reel
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
