import { useState } from 'react';
import { assetUrl } from '../lib/api';
import { cn, initials } from '../utils/format';

type AvatarProps = {
  user: {
    displayName?: string | null;
    username?: string | null;
    avatarUrl?: string | null;
    isOnline?: boolean;
  };
  size?: number;
  className?: string;
  ring?: boolean;
  online?: boolean;
};

export function Avatar({ user, size = 40, className, ring = false, online = false }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const name = user.displayName || user.username || 'W';
  const src = assetUrl(user.avatarUrl);
  const fontSize = Math.max(11, Math.round(size * 0.36));

  const inner = (
    <span
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-grape-600 to-fuchsia-600 font-semibold text-white',
        ring && 'ring-2 ring-ink-900',
        className
      )}
      style={{ width: size, height: size, fontSize }}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden>{initials(name) || 'W'}</span>
      )}
      {online && (
        <span
          className="absolute bottom-0 right-0 rounded-full border-2 border-ink-900 bg-emerald-400"
          style={{ width: Math.max(9, size * 0.27), height: Math.max(9, size * 0.27) }}
          aria-label="Online"
        />
      )}
    </span>
  );

  return inner;
}
