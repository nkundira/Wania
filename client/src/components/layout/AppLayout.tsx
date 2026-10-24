import { useEffect, type ReactNode } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import {
  Bell,
  Bot,
  Compass,
  Film,
  Home,
  LogOut,
  MessageCircle,
  PlusSquare,
  Search,
  Settings,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { cn } from '../../utils/format';
import { Logo, LogoMark } from '../Logo';
import { Avatar } from '../Avatar';
import { CallOverlay } from '../calls/CallOverlay';
import { AiAssistant } from '../ai/AiAssistant';
import { OnboardingTour } from '../onboarding/OnboardingTour';
import { WelcomeModal } from '../onboarding/WelcomeModal';

const mainNav = [
  { to: '/', label: 'Home', icon: Home, end: true, tour: 'home' },
  { to: '/explore', label: 'Explore', icon: Compass, tour: 'explore' },
  { to: '/reels', label: 'Reels', icon: Film },
  { to: '/messages', label: 'Messages', icon: MessageCircle, tour: 'messages' },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/ai', label: 'AI Assistant', icon: Bot, tour: 'ai' },
];

function Sidebar() {
  const { user, logout } = useAuth();
  const { unread } = useSocket();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[78px] flex-col border-r border-white/[0.06] bg-ink-950/85 px-3 py-5 backdrop-blur-xl md:flex xl:w-64 xl:px-4">
      <Link to="/" className="mb-8 flex items-center justify-center xl:justify-start xl:px-1.5" aria-label="WANIA home">
        <span className="xl:hidden">
          <LogoMark size={38} />
        </span>
        <span className="hidden xl:block">
          <Logo size={36} />
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {mainNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              data-tour={item.tour}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  'justify-center xl:justify-start',
                  isActive ? 'bg-white/[0.08] text-white' : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100'
                )
              }
            >
              <span className="relative">
                <Icon className="h-[22px] w-[22px]" strokeWidth={1.9} />
                {item.to === '/notifications' && unread > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </span>
              <span className="hidden xl:inline">{item.label}</span>
            </NavLink>
          );
        })}

        <NavLink
          to="/create"
          data-tour="create"
          className={({ isActive }) =>
            cn(
              'mt-2 flex items-center justify-center gap-2 rounded-xl bg-grape-600 px-3 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-grape-500 xl:justify-start',
              isActive && 'bg-grape-500'
            )
          }
        >
          <PlusSquare className="h-[21px] w-[21px]" />
          <span className="hidden xl:inline">Create</span>
        </NavLink>
      </nav>

      <div className="mt-3 space-y-1 border-t border-white/[0.06] pt-3">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-white xl:justify-start',
              isActive && 'bg-white/[0.08] text-white'
            )
          }
        >
          <Settings className="h-[21px] w-[21px]" />
          <span className="hidden xl:inline">Settings</span>
        </NavLink>
        <NavLink
          to={user ? `/u/${user.username}` : '/'}
          data-tour="profile"
          className={({ isActive }) =>
            cn(
              'flex items-center justify-center gap-3 rounded-xl px-2.5 py-2 text-sm text-zinc-300 transition hover:bg-white/[0.04] xl:justify-start',
              isActive && 'bg-white/[0.08]'
            )
          }
        >
          {user ? <Avatar user={user} size={30} online /> : <UserRound className="h-5 w-5" />}
          <span className="hidden min-w-0 flex-1 truncate xl:inline">{user?.username}</span>
        </NavLink>
        <button
          onClick={() => void logout()}
          className="flex w-full items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-500 transition hover:bg-rose-500/10 hover:text-rose-300 xl:justify-start"
        >
          <LogOut className="h-[20px] w-[20px]" />
          <span className="hidden xl:inline">Log out</span>
        </button>
      </div>
    </aside>
  );
}

function MobileTopBar() {
  const { unread } = useSocket();
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/[0.06] bg-ink-950/85 px-4 py-3 backdrop-blur-xl md:hidden">
      <Link to="/" aria-label="WANIA home">
        <Logo size={30} />
      </Link>
      <div className="flex items-center gap-1">
        <Link to="/search" className="icon-btn" aria-label="Search">
          <Search className="h-5 w-5" />
        </Link>
        <Link to="/notifications" className="icon-btn relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}

const mobileNav = [
  { to: '/', label: 'Home', icon: Home, end: true, tour: 'home' },
  { to: '/explore', label: 'Explore', icon: Compass, tour: 'explore' },
  { to: '/create', label: 'Create', icon: PlusSquare, tour: 'create' },
  { to: '/reels', label: 'Reels', icon: Film, tour: 'reels' },
  { to: '/messages', label: 'Messages', icon: MessageCircle, tour: 'messages' },
];

function MobileNav() {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-white/[0.07] bg-ink-950/95 px-2 pt-1.5 backdrop-blur-xl md:hidden">
      {mobileNav.map((item) => {
        const Icon = item.icon;
        if (item.to === '/create') {
          return (
            <NavLink key={item.to} to={item.to} aria-label="Create" data-tour={item.tour} className="flex flex-col items-center px-2 py-1">
              <span className="flex h-9 w-11 items-center justify-center rounded-xl bg-grape-600 text-white shadow-glow">
                <Icon className="h-5 w-5" />
              </span>
            </NavLink>
          );
        }
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            data-tour={item.tour}
            className={({ isActive }) =>
              cn('flex flex-col items-center gap-0.5 rounded-lg px-3 py-1 text-[10px]', isActive ? 'text-white' : 'text-zinc-500')
            }
          >
            <Icon className="h-[22px] w-[22px]" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

function ScrollToTop() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);
  return null;
}

export function AppLayout({ children }: { children?: ReactNode }) {
  return (
    <div className="min-h-[100dvh]">
      <Sidebar />
      <MobileTopBar />
      <div className="md:pl-[78px] xl:pl-64">
        <main className="mx-auto min-h-[calc(100dvh-60px)] w-full max-w-5xl px-4 pb-24 pt-4 sm:px-6 md:pb-10 md:pt-7">
          <ScrollToTop />
          {children ?? <Outlet />}
        </main>
      </div>
      <MobileNav />
      <CallOverlay />
      <AiAssistant />
      <OnboardingTour />
      <WelcomeModal />
    </div>
  );
}
