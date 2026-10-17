import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import { Menu, X, Coffee, Bell, LogOut, User, BookOpen, Users, MessageCircle, Settings } from 'lucide-react';

export default function Navbar({ authenticated = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isAuth = authenticated || !!user;

  return (
    <nav className="bg-white/95 backdrop-blur border-b border-coffee-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2">
            <Coffee className="w-8 h-8 text-coffee-700" />
            <span className="font-bold text-xl text-coffee-900" style={{ fontFamily: 'Georgia, serif' }}>
              Hospitality <span className="text-gold-dark">Academy</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {!isAuth ? (
              <>
                <Link to="/" className={`text-sm font-medium hover:text-coffee-700 ${location.pathname === '/' ? 'text-coffee-700' : 'text-charcoal/70'}`}>Home</Link>
                <Link to="/courses" className={`text-sm font-medium hover:text-coffee-700 ${location.pathname.startsWith('/courses') ? 'text-coffee-700' : 'text-charcoal/70'}`}>Courses</Link>
                <Link to="/about" className={`text-sm font-medium hover:text-coffee-700 ${location.pathname === '/about' ? 'text-coffee-700' : 'text-charcoal/70'}`}>About</Link>
                <Link to="/contact" className={`text-sm font-medium hover:text-coffee-700 ${location.pathname === '/contact' ? 'text-coffee-700' : 'text-charcoal/70'}`}>Contact</Link>
                <Link to="/login" className="text-sm font-medium text-coffee-700 hover:text-coffee-900">Login</Link>
                <Link to="/register" className="bg-coffee-700 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-coffee-800 transition shadow-sm">Sign Up</Link>
              </>
            ) : (
              <>
                <Link to="/community" className={`flex items-center gap-1.5 text-sm font-medium hover:text-coffee-700 ${location.pathname === '/community' ? 'text-coffee-700' : 'text-charcoal/70'}`}>
                  <Users className="w-4 h-4" /> Community
                </Link>
                <Link to="/courses" className={`flex items-center gap-1.5 text-sm font-medium hover:text-coffee-700 ${location.pathname.startsWith('/courses') || location.pathname === '/my-learning' ? 'text-coffee-700' : 'text-charcoal/70'}`}>
                  <BookOpen className="w-4 h-4" /> Courses
                </Link>
                <Link to="/messages" className={`flex items-center gap-1.5 text-sm font-medium hover:text-coffee-700 ${location.pathname.startsWith('/messages') ? 'text-coffee-700' : 'text-charcoal/70'}`}>
                  <MessageCircle className="w-4 h-4" /> Messages
                </Link>
                <Link to="/notifications" className="relative text-charcoal/70 hover:text-coffee-700">
                  <Bell className="w-5 h-5" />
                </Link>
                <div className="relative">
                  <button onClick={() => setUserMenu(!userMenu)} className="flex items-center gap-2 text-sm font-medium text-charcoal/70 hover:text-coffee-700">
                    {user?.profilePicture ? (
                      <img src={user.profilePicture} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-coffee-200" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-coffee-200 text-coffee-800 flex items-center justify-center font-semibold text-xs">
                        {user?.displayName?.[0] || 'U'}
                      </div>
                    )}
                  </button>
                  {userMenu && (
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-coffee-100 py-2 z-50" onMouseLeave={() => setUserMenu(false)}>
                      <div className="px-4 py-2 border-b border-coffee-100">
                        <p className="text-sm font-semibold text-coffee-900">{user?.displayName}</p>
                        <p className="text-xs text-charcoal/50">@{user?.username}</p>
                      </div>
                      <Link to={`/profile/${user?.username}`} onClick={() => setUserMenu(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-coffee-50"><User className="w-4 h-4" /> Profile</Link>
                      <Link to="/my-learning" onClick={() => setUserMenu(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-coffee-50"><BookOpen className="w-4 h-4" /> My Learning</Link>
                      <Link to="/settings" onClick={() => setUserMenu(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-coffee-50"><Settings className="w-4 h-4" /> Settings</Link>
                      <button onClick={() => { setUserMenu(false); handleLogout(); }} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-coffee-50 text-red-600 w-full text-left">
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-coffee-100 px-4 py-4 space-y-2">
          {!isAuth ? (
            <>
              <Link to="/" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 rounded-lg hover:bg-coffee-50 text-sm">Home</Link>
              <Link to="/courses" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 rounded-lg hover:bg-coffee-50 text-sm">Courses</Link>
              <Link to="/about" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 rounded-lg hover:bg-coffee-50 text-sm">About</Link>
              <Link to="/contact" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 rounded-lg hover:bg-coffee-50 text-sm">Contact</Link>
              <div className="flex gap-3 pt-2">
                <Link to="/login" onClick={() => setMenuOpen(false)} className="flex-1 text-center border-2 border-coffee-700 text-coffee-700 px-4 py-2.5 rounded-xl text-sm font-semibold">Login</Link>
                <Link to="/register" onClick={() => setMenuOpen(false)} className="flex-1 text-center bg-coffee-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold">Sign Up</Link>
              </div>
            </>
          ) : (
            <>
              <Link to="/community" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 rounded-lg hover:bg-coffee-50 text-sm">Community</Link>
              <Link to="/courses" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 rounded-lg hover:bg-coffee-50 text-sm">Courses</Link>
              <Link to="/my-learning" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 rounded-lg hover:bg-coffee-50 text-sm">My Learning</Link>
              <Link to="/messages" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 rounded-lg hover:bg-coffee-50 text-sm">Messages</Link>
              <Link to="/notifications" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 rounded-lg hover:bg-coffee-50 text-sm">Notifications</Link>
              <Link to={`/profile/${user?.username}`} onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 rounded-lg hover:bg-coffee-50 text-sm">Profile</Link>
              <Link to="/settings" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 rounded-lg hover:bg-coffee-50 text-sm">Settings</Link>
              <button onClick={() => { setMenuOpen(false); handleLogout(); }} className="block w-full text-left px-3 py-2.5 rounded-lg hover:bg-red-50 text-sm text-red-600">Sign Out</button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
