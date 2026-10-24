import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { CatchAllRoute, GuestRoute, ProtectedRoute, RootRoute } from './components/RouteGuards';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { FeedPage } from './pages/FeedPage';
import { ExplorePage } from './pages/ExplorePage';
import { ReelsPage } from './pages/ReelsPage';
import { CreatePage } from './pages/CreatePage';
import { MessagesPage } from './pages/MessagesPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SearchPage } from './pages/SearchPage';
import { CallsPage } from './pages/CallsPage';
import { ProfilePage } from './pages/ProfilePage';
import { FollowersPage, FollowingPage } from './pages/ConnectionsPage';
import { PostDetailPage } from './pages/PostDetailPage';
import { StoriesPage } from './pages/StoriesPage';
import { AiPage } from './pages/AiPage';
import { SettingsPage } from './pages/SettingsPage';
import { SettingsProfilePage } from './pages/SettingsProfilePage';
import { SettingsBlockedPage } from './pages/SettingsBlockedPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRoute />} />

      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      <Route path="/verify-email" element={<VerifyEmailPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/reels" element={<ReelsPage />} />
          <Route path="/create" element={<CreatePage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/messages/:id" element={<MessagesPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/calls" element={<CallsPage />} />
          <Route path="/u/:username" element={<ProfilePage />} />
          <Route path="/u/:username/followers" element={<FollowersPage />} />
          <Route path="/u/:username/following" element={<FollowingPage />} />
          <Route path="/post/:id" element={<PostDetailPage />} />
          <Route path="/stories/:username" element={<StoriesPage />} />
          <Route path="/ai" element={<AiPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/profile" element={<SettingsProfilePage />} />
          <Route path="/settings/blocked" element={<SettingsBlockedPage />} />
        </Route>
      </Route>

      <Route path="*" element={<CatchAllRoute />} />
    </Routes>
  );
}
