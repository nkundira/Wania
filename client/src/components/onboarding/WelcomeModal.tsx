import { useEffect, useRef } from 'react';
import { Camera, PhoneCall, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUi } from '../../contexts/UiContext';
import { LogoMark } from '../Logo';
import { Modal } from '../Modal';

const FEATURES = [
  {
    icon: Camera,
    title: 'Share the moment',
    text: 'Posts, reels and 24-hour stories that disappear when the moment passes.',
    color: 'from-grape-500/20 to-fuchsia-500/10 text-grape-300',
  },
  {
    icon: PhoneCall,
    title: 'Talk for real',
    text: 'Private messages, group chats and real audio or video calls with your people.',
    color: 'from-emerald-500/20 to-teal-500/10 text-emerald-300',
  },
  {
    icon: Sparkles,
    title: 'Your built-in guide',
    text: 'WANIA AI helps you get set up, discover features and feel at home.',
    color: 'from-amber-500/20 to-orange-500/10 text-amber-300',
  },
];

export function WelcomeModal() {
  const { user, onboarding, updateProgress } = useAuth();
  const { welcomeOpen, openWelcome, closeWelcome, startTour } = useUi();
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!user || !onboarding || checkedRef.current) return;
    checkedRef.current = true;
    if (!onboarding.welcomeSeen) openWelcome();
  }, [user, onboarding, openWelcome]);

  async function markSeen() {
    if (onboarding?.welcomeSeen) return;
    try {
      await updateProgress({ welcomeSeen: true });
    } catch {
      // Welcome should never block the app if progress saving fails.
    }
  }

  async function dismiss() {
    closeWelcome();
    await markSeen();
  }

  async function takeTour() {
    closeWelcome();
    await markSeen();
    startTour(0);
  }

  return (
    <Modal open={welcomeOpen} onClose={() => void dismiss()} size="md" hideClose className="overflow-hidden border-white/10">
      <div className="-m-5 overflow-hidden">
        <div className="relative bg-gradient-to-br from-grape-600/25 via-ink-850 to-ink-850 px-6 pb-7 pt-8 text-center">
          <div className="mx-auto mb-4 w-fit">
            <LogoMark size={54} className="drop-shadow-[0_0_30px_rgba(139,92,246,0.45)]" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-grape-300">Welcome to WANIA</p>
          <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            {user?.displayName ? `Hey ${user.displayName.split(' ')[0]}, this is your world.` : 'Your moments. Your people. Your world.'}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">
            A calmer place to share what matters, stay close to your people, and be yourself.
          </p>
        </div>

        <div className="space-y-2.5 px-5 py-5">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="flex items-start gap-3 rounded-xl border border-white/[0.05] bg-white/[0.025] p-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{feature.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">{feature.text}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 px-5 pb-5 sm:flex-row-reverse">
          <button className="btn-primary flex-1" onClick={() => void takeTour()}>
            Take the quick tour
          </button>
          <button className="btn-secondary flex-1" onClick={() => void dismiss()}>
            Explore on my own
          </button>
        </div>
      </div>
    </Modal>
  );
}
