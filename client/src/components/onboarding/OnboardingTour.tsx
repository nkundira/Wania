import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bot, Compass, Home, MessageCircle, PlusSquare, UserRound, X, type LucideIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUi } from '../../contexts/UiContext';
import { cn } from '../../utils/format';

type Step = {
  target: string;
  title: string;
  body: string;
  icon: LucideIcon;
  position?: 'bottom' | 'center';
};

const STEPS: Step[] = [
  {
    target: 'home',
    title: 'Your home feed',
    body: 'Fresh posts from the people you follow live here. Scroll, like, comment, and save what you love.',
    icon: Home,
  },
  {
    target: 'create',
    title: 'Create something',
    body: 'Share a post, a reel, or a story. Add media, a caption, and choose exactly who gets to see it.',
    icon: PlusSquare,
  },
  {
    target: 'explore',
    title: 'Find your people',
    body: 'Explore and search help you discover new creators, hashtags, and conversations.',
    icon: Compass,
  },
  {
    target: 'messages',
    title: 'Stay close',
    body: 'Private and group chats, voice notes, snaps, read receipts, and real audio or video calls.',
    icon: MessageCircle,
  },
  {
    target: 'ai',
    title: 'Ask WANIA AI',
    body: 'Your built-in guide can explain any feature, suggest profile ideas, or show you around.',
    icon: Bot,
  },
  {
    target: 'profile',
    title: 'Make it yours',
    body: 'Your profile is home base. Edit your bio and avatar, control privacy, and manage your account in Settings.',
    icon: UserRound,
  },
];

export function OnboardingTour() {
  const { onboarding, updateProgress } = useAuth();
  const { tourOpen, tourStep, setTourStep, stopTour } = useUi();
  const [highlightFound, setHighlightFound] = useState(false);
  const step = STEPS[Math.min(tourStep, STEPS.length - 1)];
  const last = tourStep >= STEPS.length - 1;

  useEffect(() => {
    if (!tourOpen || !step) return;
    const elements = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${step.target}"]`));
    const target = elements.find((element) => element.getClientRects().length > 0);
    setHighlightFound(Boolean(target));
    if (!target) return;
    target.classList.add('tour-highlight');
    target.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
    return () => {
      target.classList.remove('tour-highlight');
    };
  }, [tourOpen, step, tourStep]);

  function saveProgress(update: Parameters<typeof updateProgress>[0]) {
    void updateProgress(update).catch(() => undefined);
  }

  function next() {
    if (last) {
      saveProgress({ welcomeSeen: true, tourCompleted: true, tourSkipped: false, tourStep: STEPS.length });
      stopTour();
      return;
    }
    const nextStep = tourStep + 1;
    setTourStep(nextStep);
    saveProgress({ welcomeSeen: true, tourStep: nextStep });
  }

  function back() {
    if (tourStep === 0) return;
    const previous = tourStep - 1;
    setTourStep(previous);
    saveProgress({ welcomeSeen: true, tourStep: previous });
  }

  function skip() {
    saveProgress({ welcomeSeen: true, tourSkipped: true, tourStep });
    stopTour();
  }

  if (!tourOpen || !onboarding) return null;

  const Icon = step.icon;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[200]">
      {!highlightFound && <div className="pointer-events-auto absolute inset-0 bg-ink-950/80 backdrop-blur-[2px]" />}
      <div className="pointer-events-auto absolute inset-x-3 bottom-[84px] mx-auto max-w-md rounded-2xl border border-grape-500/25 bg-ink-850 p-4 shadow-[0_20px_80px_-10px_rgba(0,0,0,0.9)] animate-slide-up md:bottom-6 md:left-[310px] md:right-auto md:mx-0 md:w-[360px] xl:left-[292px]">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-grape-600/20 text-grape-300">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-grape-300">
              Quick tour · {tourStep + 1}/{STEPS.length}
            </p>
            <h3 className="mt-1 font-display text-base font-bold text-white">{step.title}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">{step.body}</p>
          </div>
          <button onClick={skip} className="icon-btn -mr-1 -mt-1 h-7 w-7 shrink-0" aria-label="Skip tour">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-1">
          {STEPS.map((item, index) => (
            <span
              key={item.target}
              className={cn('h-1 flex-1 rounded-full', index <= tourStep ? 'bg-grape-500' : 'bg-white/10')}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button onClick={skip} className="btn-ghost px-2 text-xs">
            Skip tour
          </button>
          <div className="flex gap-2">
            <button onClick={back} className="btn-secondary px-3 py-2 text-xs" disabled={tourStep === 0}>
              Back
            </button>
            <button onClick={next} className="btn-primary px-4 py-2 text-xs">
              {last ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
