import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Film,
  Heart,
  LockKeyhole,
  MessageCircle,
  PhoneCall,
  Play,
  Sparkles,
  Users,
} from 'lucide-react';
import { Logo } from '../components/Logo';
import { Avatar } from '../components/Avatar';

const FEATURES = [
  {
    icon: Camera,
    title: 'Stories that live for the moment',
    text: 'Share a look, a laugh, or a whole day. Stories disappear after 24 hours, with reactions and private replies built in.',
    className: 'from-grape-500/20 to-fuchsia-500/5 text-grape-300',
  },
  {
    icon: Film,
    title: 'Posts and reels, your way',
    text: 'A photo grid for the things you love, a reels feed for motion, and privacy controls on everything you share.',
    className: 'from-amber-500/20 to-orange-500/5 text-amber-300',
  },
  {
    icon: MessageCircle,
    title: 'Conversations that feel close',
    text: 'Private chats, group rooms, voice notes, disappearing snaps, read receipts, and typing indicators.',
    className: 'from-emerald-500/20 to-teal-500/5 text-emerald-300',
  },
  {
    icon: PhoneCall,
    title: 'Real calls, not placeholders',
    text: 'One-to-one audio and video calls powered by WebRTC, with call history and missed-call notifications.',
    className: 'from-sky-500/20 to-blue-500/5 text-sky-300',
  },
  {
    icon: Sparkles,
    title: 'An AI that actually helps',
    text: 'Your built-in WANIA guide helps you set up your profile, understand features, and find your way around.',
    className: 'from-rose-500/20 to-pink-500/5 text-rose-300',
  },
  {
    icon: LockKeyhole,
    title: 'Private by design',
    text: 'Private accounts, follow requests, block lists, story privacy, and per-viewer media access you control.',
    className: 'from-violet-500/20 to-indigo-500/5 text-violet-300',
  },
];

export function LandingPage() {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-ink-950">
      <div className="pointer-events-none absolute -left-40 top-[-10%] h-[520px] w-[520px] rounded-full bg-grape-700/20 blur-[130px]" />
      <div className="pointer-events-none absolute right-[-10%] top-[20%] h-[420px] w-[420px] rounded-full bg-fuchsia-700/10 blur-[120px]" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Logo size={34} />
        <nav className="flex items-center gap-2">
          <Link to="/login" className="btn-ghost px-3 py-2 text-sm">
            Sign in
          </Link>
          <Link to="/register" className="btn-primary px-4 py-2 text-sm">
            Join WANIA
          </Link>
        </nav>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pt-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-grape-500/25 bg-grape-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-grape-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              A calmer social home
            </span>
            <h1 className="mt-5 font-display text-[2.7rem] font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
              Your moments.
              <br />
              Your people.
              <br />
              <span className="bg-gradient-to-r from-grape-300 via-fuchsia-300 to-amber-200 bg-clip-text text-transparent">Your world.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-zinc-400">
              WANIA is a place to share what matters, stay close to the people you love, and be yourself without the noise.
              Stories, reels, real conversations, and live calls — all in one thoughtful space.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link to="/register" className="btn-primary px-6 py-3 text-sm">
                Create your account <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/login" className="btn-secondary px-6 py-3 text-sm">
                I already have one
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-zinc-500">
              {['No ads. No noise.', 'Private by default', 'Real-time & real people'].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[390px]">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-grape-600/25 to-fuchsia-600/10 blur-2xl" />
            <div className="relative rounded-[2.2rem] border border-white/10 bg-ink-900 p-3 shadow-[0_40px_120px_-30px_rgba(0,0,0,1)]">
              <div className="overflow-hidden rounded-[1.7rem] border border-white/[0.06] bg-ink-950">
                <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                  <Logo size={24} />
                  <div className="flex -space-x-2">
                    <Avatar user={{ displayName: 'Mia Chen' }} size={24} ring />
                    <Avatar user={{ displayName: 'Noah James' }} size={24} ring />
                    <Avatar user={{ displayName: 'Ava Patel' }} size={24} ring />
                  </div>
                </div>
                <div className="flex gap-3 px-4 py-3">
                  {[
                    { name: 'Your story', own: true, color: 'from-ink-700 to-ink-800' },
                    { name: 'Mia', color: 'from-rose-500 to-amber-400' },
                    { name: 'Noah', color: 'from-sky-500 to-emerald-400' },
                    { name: 'Ava', color: 'from-violet-500 to-fuchsia-400' },
                  ].map((person) => (
                    <div key={person.name} className="flex w-[52px] shrink-0 flex-col items-center gap-1.5">
                      <span className={person.own ? 'rounded-full border-2 border-white/15 p-0.5' : 'rounded-full bg-gradient-to-tr from-grape-500 to-fuchsia-400 p-[2px]'}>
                        <span className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${person.color} text-xs font-bold text-white`}>
                          {person.own ? '+' : person.name[0]}
                        </span>
                      </span>
                      <span className="text-[9px] text-zinc-500">{person.name}</span>
                    </div>
                  ))}
                </div>
                <div className="mx-3 overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-900">
                  <div className="relative aspect-[4/3] bg-gradient-to-br from-grape-600 via-fuchsia-600 to-amber-400">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_45%)]" />
                    <div className="absolute bottom-3 left-3 flex items-center gap-2">
                      <Avatar user={{ displayName: 'Mia Chen' }} size={28} ring />
                      <div>
                        <p className="text-[11px] font-semibold text-white">Mia Chen</p>
                        <p className="text-[9px] text-white/70">Golden hour, golden people.</p>
                      </div>
                    </div>
                    <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur">
                      <Play className="h-3.5 w-3.5 fill-current" />
                    </span>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2.5 text-zinc-300">
                    <Heart className="h-4 w-4 fill-rose-400 text-rose-400" />
                    <MessageCircle className="h-4 w-4" />
                    <Users className="h-4 w-4" />
                    <span className="ml-auto text-[9px] text-zinc-600">2m</span>
                  </div>
                </div>
                <div className="flex items-center justify-between px-5 py-3 text-zinc-600">
                  {[0, 1, 2, 3, 4].map((item) => (
                    <span key={item} className={`h-2 w-2 rounded-full ${item === 0 ? 'bg-grape-400' : 'bg-white/15'}`} />
                  ))}
                </div>
              </div>
            </div>

            <div className="absolute -right-4 top-24 hidden rounded-xl border border-white/10 bg-ink-850/95 px-3 py-2.5 shadow-card backdrop-blur sm:block animate-slide-in">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">Incoming call</p>
              <div className="mt-1.5 flex items-center gap-2">
                <Avatar user={{ displayName: 'Noah James' }} size={26} online />
                <div>
                  <p className="text-[11px] font-semibold text-white">Noah James</p>
                  <p className="text-[9px] text-emerald-400">Video · ringing</p>
                </div>
                <span className="ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <PhoneCall className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>

            <div className="absolute -left-5 bottom-16 hidden rounded-xl border border-white/10 bg-ink-850/95 px-3 py-2.5 shadow-card backdrop-blur sm:block">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold text-grape-300">
                <Sparkles className="h-3 w-3" /> WANIA AI
              </p>
              <p className="mt-1 max-w-[150px] text-[10px] leading-relaxed text-zinc-400">
                “Your profile is looking great. Want help writing a bio?”
              </p>
            </div>
          </div>
        </section>

        <section className="border-y border-white/[0.05] bg-ink-900/40 py-14">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="mb-8 max-w-xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-grape-300">Everything you need</p>
              <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Built for real connection, not endless scrolling.
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="card card-hover p-5">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${feature.className}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 font-display text-base font-bold text-white">{feature.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{feature.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-5 py-20 text-center sm:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-grape-500/20 bg-gradient-to-br from-grape-700/25 via-ink-900 to-ink-950 px-6 py-12 sm:px-12">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-[80px]" />
            <Logo size={42} showText={false} className="mx-auto" />
            <h2 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Ready to make it yours?</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-400">
              Your people are already here. Bring your moments, your voice, and a little bit of yourself.
            </p>
            <Link to="/register" className="btn-primary mt-6 px-8 py-3">
              Join WANIA <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/[0.05] px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <Logo size={26} />
          <p className="text-xs text-zinc-600">© {new Date().getFullYear()} WANIA. Your moments. Your people. Your world.</p>
          <div className="flex gap-4 text-xs text-zinc-500">
            <Link to="/login" className="hover:text-zinc-300">Sign in</Link>
            <Link to="/register" className="hover:text-zinc-300">Join</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
