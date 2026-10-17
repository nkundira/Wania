import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import MobileNav from './components/MobileNav';
import Home from './pages/public/Home';
import CourseCatalog from './pages/public/CourseCatalog';
import CourseDetail from './pages/public/CourseDetail';
import LessonPlayer from './pages/learning/LessonPlayer';
import About from './pages/public/About';
import Contact from './pages/public/Contact';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Community from './pages/community/Community';
import Messages from './pages/messages/Messages';
import Profile from './pages/profile/Profile';
import EditProfile from './pages/profile/EditProfile';
import MyLearning from './pages/learning/MyLearning';
import Notifications from './pages/community/Notifications';
import Settings from './pages/profile/Settings';
import CallHistory from './pages/calls/CallHistory';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-coffee-300 border-t-coffee-700 rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
}

function PublicLayout({ children, hideNav = false }) {
  return (
    <div className="min-h-screen flex flex-col">
      {!hideNav && <Navbar />}
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

function AppLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-coffee-50">
      <Navbar authenticated />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <MobileNav />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
            <Route path="/courses" element={<PublicLayout><CourseCatalog /></PublicLayout>} />
            <Route path="/courses/:slug" element={<PublicLayout><CourseDetail /></PublicLayout>} />
            <Route path="/lessons/:lessonId" element={<LessonPlayer />} />
            <Route path="/about" element={<PublicLayout><About /></PublicLayout>} />
            <Route path="/contact" element={<PublicLayout><Contact /></PublicLayout>} />
            <Route path="/login" element={<PublicLayout><Login /></PublicLayout>} />
            <Route path="/register" element={<PublicLayout><Register /></PublicLayout>} />
            <Route path="/community" element={<ProtectedRoute><AppLayout><Community /></AppLayout></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><AppLayout><Messages /></AppLayout></ProtectedRoute>} />
            <Route path="/messages/:conversationId" element={<ProtectedRoute><AppLayout><Messages /></AppLayout></ProtectedRoute>} />
            <Route path="/profile/:username" element={<ProtectedRoute><AppLayout><Profile /></AppLayout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><AppLayout><Profile /></AppLayout></ProtectedRoute>} />
            <Route path="/profile/edit" element={<ProtectedRoute><AppLayout><EditProfile /></AppLayout></ProtectedRoute>} />
            <Route path="/my-learning" element={<ProtectedRoute><AppLayout><MyLearning /></AppLayout></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><AppLayout><Notifications /></AppLayout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>} />
            <Route path="/calls/history" element={<ProtectedRoute><AppLayout><CallHistory /></AppLayout></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
