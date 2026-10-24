import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Camera, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { Logo } from '../Logo';

const POINTS = [
  { icon: Camera, text: 'Share posts, reels and stories that feel like you.' },
  { icon: MessageCircle, text: 'Real conversations, group chats, and live calls.' },
  { icon: ShieldCheck, text: 'Private by design, with control over who sees what.' },
  { icon: Sparkles, text: 'A built-in AI guide whenever you need a hand.' },
];

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-[100dvh] overflow-hidden bg-ink-950">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-grape-700/20 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-40 right-0 h-[380px] w-[380px] rounded-full bg-fuchsia-700/10 blur-[100px]" />

      <aside className="relative hidden w-[46%] flex-col justify-between border-r border-white/[0.06] bg-ink-900/50 p-10 lg:flex xl:p-14">
        <Link to="/" aria-label="WANIA home">
          <Logo size={40} tagline />
        </Link>

        <div className="max-w-md">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-grape-300">Your moments. Your people. Your world.</p>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-white xl:text-5xl">
            A social home that feels like <span className="bg-gradient-to-r from-grape-300 to-fuchsia-300 bg-clip-text text-transparent">yours</span>.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400">
            Share the small things, stay close to the people who matter, and move at your own pace.
          </p>
          <div className="mt-8 space-y-3.5">
            {POINTS.map((point) => {
              const Icon = point.icon;
              return (
                <div key={point.text} className="flex items-center gap-3 text-sm text-zinc-300">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-grape-300">
                    <Icon className="h-4 w-4" />
                  </span>
                  {point.text}
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-zinc-600">Built with care. No ads. No noise. Just your world.</p>
      </aside>

      <main className="relative flex flex-1 flex-col">
        <div className="flex items-center justify-between p-5 lg:hidden">
          <Link to="/" aria-label="WANIA home">
            <Logo size={32} />
          </Link>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">Your world</span>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8">
          <div className="w-full max-w-[400px] animate-fade-in">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-white">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{subtitle}</p>
            <div className="mt-7">{children}</div>
            {footer && <div className="mt-8 text-center text-sm text-zinc-500">{footer}</div>}
          </div>
        </div>

        <div className="p-5 text-center text-[11px] text-zinc-600 lg:text-left lg:ps-14">
          <Link to="/" className="hover:text-zinc-400">WANIA</Link>
          <span className="mx-2">·</span>
          <span>Private by default</span>
          <span className="mx-2">·</span>
          <span>Made for real connection</span>
        </div>
      </main>
    </div>
  );
}

export function AuthAlert({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-200">
      {message}
    </div>
  );
}
