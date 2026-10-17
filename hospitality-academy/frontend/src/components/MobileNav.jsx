import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, MessageCircle, Bell, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function MobileNav() {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return null;

  const items = [
    { to: '/community', icon: Home, label: 'Home' },
    { to: '/courses', icon: BookOpen, label: 'Courses' },
    { to: '/messages', icon: MessageCircle, label: 'Messages' },
    { to: '/notifications', icon: Bell, label: 'Alerts' },
    { to: `/profile/${user.username}`, icon: User, label: 'Profile' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-coffee-200 z-50">
      <div className="flex justify-around items-center h-16">
        {items.map(({ to, icon: Icon, label }) => {
          const active = loc.pathname === to || (to !== '/community' && loc.pathname.startsWith(to));
          return (
            <Link key={to} to={to} className={`flex flex-col items-center gap-0.5 text-xs ${active ? 'text-coffee-700' : 'text-charcoal/50'}`}>
              <Icon className={`w-5 h-5 ${active ? 'text-coffee-700' : ''}`} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
