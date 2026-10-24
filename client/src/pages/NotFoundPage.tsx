import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';
import { LogoMark } from '../components/Logo';

export function NotFoundPage() {
  return (
    <div className="flex min-h-[65vh] flex-col items-center justify-center px-4 text-center">
      <LogoMark size={52} />
      <p className="mt-8 font-display text-6xl font-extrabold tracking-tight text-white">404</p>
      <h1 className="mt-2 font-display text-xl font-bold text-white">This moment is off the map</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">
        The page you’re looking for doesn’t exist, was deleted, or is not yours to see.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link to="/" className="btn-primary">
          <Home className="h-4 w-4" /> Back home
        </Link>
        <Link to="/explore" className="btn-secondary">
          <Compass className="h-4 w-4" /> Explore
        </Link>
      </div>
    </div>
  );
}
