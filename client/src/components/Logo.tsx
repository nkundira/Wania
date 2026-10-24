import { cn } from '../utils/format';

type LogoProps = {
  size?: number;
  showText?: boolean;
  tagline?: boolean;
  className?: string;
};

export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={cn('shrink-0', className)}
      role="img"
      aria-label="WANIA"
    >
      <defs>
        <linearGradient id="wania-logo-gradient" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C4B5FD" />
          <stop offset="0.45" stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#E879F9" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="45" height="45" rx="14" fill="url(#wania-logo-gradient)" />
      <rect x="1.5" y="1.5" width="45" height="45" rx="14" fill="black" fillOpacity="0.12" />
      <path
        d="M10.5 16.5 17 32l7-11.5L31 32l6.5-15.5"
        stroke="white"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="36" cy="12.5" r="3.1" fill="#FDE68A" />
    </svg>
  );
}

export function Logo({ size = 32, showText = true, tagline = false, className }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      {showText && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-xl font-extrabold tracking-tight text-white">WANIA</span>
          {tagline && <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">Your world</span>}
        </span>
      )}
    </span>
  );
}
