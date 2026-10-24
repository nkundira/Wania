import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  Bot,
  ChevronRight,
  KeyRound,
  LogOut,
  MailCheck,
  MapPinned,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  Trash2,
  UserCog,
  UserX,
} from 'lucide-react';
import { getErrorMessage } from '../lib/api';
import { aiApi, authApi, usersApi } from '../services/wania';
import type { ProfileSettings } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useUi } from '../contexts/UiContext';
import { useToast } from '../contexts/ToastContext';
import { PasswordInput } from '../components/auth/PasswordInput';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { Avatar } from '../components/Avatar';
import { Badge, PageHeader, Spinner, Toggle } from '../components/ui';

function SettingLink({ to, icon: Icon, title, description }: { to: string; icon: typeof UserCog; title: string; description: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-white/[0.04]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-grape-300">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-200">{title}</p>
        <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600" />
    </Link>
  );
}

const DEFAULT_SETTINGS: ProfileSettings = {
  showActivity: true,
  lastSeenVisibility: 'followers',
  storyPrivacy: 'followers',
  messagePrivacy: 'everyone',
  aiEnabled: true,
  aiHistoryEnabled: true,
  notifyFollows: true,
  notifyLikes: true,
  notifyComments: true,
  notifyMessages: true,
  notifyCalls: true,
};

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, setUser, logout, restartTour } = useAuth();
  const { openWelcome } = useUi();
  const { success, error } = useToast();
  const [saving, setSaving] = useState<string | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [dangerPassword, setDangerPassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [aiStatus, setAiStatus] = useState<{ configured: boolean; model: string | null } | null>(null);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [devVerifyToken, setDevVerifyToken] = useState<string | null>(null);
  const [clearHistoryOpen, setClearHistoryOpen] = useState(false);

  const settings = { ...DEFAULT_SETTINGS, ...(user?.settings ?? {}) };

  useEffect(() => {
    aiApi
      .status()
      .then(setAiStatus)
      .catch(() => setAiStatus(null));
  }, []);

  async function updateSetting<K extends keyof ProfileSettings>(key: K, value: ProfileSettings[K]) {
    if (!user) return;
    setSaving(key);
    try {
      const updated = await usersApi.updateMe({ [key]: value });
      setUser(updated);
    } catch (err) {
      error(getErrorMessage(err));
    } finally {
      setSaving(null);
    }
  }

  async function sendVerification() {
    setVerifyBusy(true);
    try {
      const result = await authApi.sendVerification();
      if (result.devToken) setDevVerifyToken(result.devToken);
      success(result.devToken ? 'Development verification link ready below.' : 'Verification email sent.');
    } catch (err) {
      error(getErrorMessage(err));
    } finally {
      setVerifyBusy(false);
    }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      error('New passwords do not match');
      return;
    }
    setPasswordBusy(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      success('Password changed');
      setPasswordOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      error(getErrorMessage(err));
    } finally {
      setPasswordBusy(false);
    }
  }

  async function replayTour() {
    try {
      await restartTour();
      navigate('/');
      window.setTimeout(() => openWelcome(), 250);
    } catch (err) {
      error(getErrorMessage(err));
    }
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Settings" subtitle="Your account, your rules." />

      <div className="card mb-4 flex items-center gap-4 p-4">
        <Avatar user={user} size={56} online />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-bold text-white">{user.displayName}</p>
          <p className="truncate text-sm text-zinc-500">@{user.username}</p>
          <p className="mt-0.5 truncate text-xs text-zinc-600">{user.email}</p>
        </div>
        <Link to={`/u/${user.username}`} className="btn-secondary shrink-0 text-xs">
          View profile
        </Link>
      </div>

      {user.emailVerified === false && (
        <div className="card mb-4 border-amber-500/20 bg-amber-500/[0.05] p-4">
          <div className="flex items-start gap-3">
            <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-100">Verify your email</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-200/70">
                Confirm {user.email} to secure account recovery and email notifications.
              </p>
              {devVerifyToken && (
                <Link
                  to={`/verify-email?token=${encodeURIComponent(devVerifyToken)}`}
                  className="mt-2 inline-block text-xs font-semibold text-amber-200 underline"
                >
                  Open development verification link
                </Link>
              )}
            </div>
            <button className="btn-secondary shrink-0 text-xs" onClick={() => void sendVerification()} disabled={verifyBusy}>
              {verifyBusy ? <Spinner className="h-3.5 w-3.5" /> : 'Send link'}
            </button>
          </div>
        </div>
      )}

      <section className="card mb-4 overflow-hidden">
        <div className="border-b border-white/[0.06] px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white">
            <UserCog className="h-4 w-4 text-grape-300" /> Account
          </h2>
        </div>
        <div className="p-1.5">
          <SettingLink to="/settings/profile" icon={UserCog} title="Edit profile" description="Name, bio, avatar, cover and privacy." />
          <SettingLink to="/settings/blocked" icon={ShieldOff} title="Blocked accounts" description="Manage people you have blocked." />
          <button onClick={() => setPasswordOpen(true)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/[0.04]">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-grape-300">
              <KeyRound className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-zinc-200">Change password</p>
              <p className="mt-0.5 text-xs text-zinc-500">Use at least 8 characters.</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600" />
          </button>
          <SettingLink to="/ai" icon={Sparkles} title="AI assistant" description="Ask for help, ideas and a guided tour." />
          <button
            onClick={() => void replayTour()}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/[0.04]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-grape-300">
              <MapPinned className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-zinc-200">Replay the welcome tour</p>
              <p className="mt-0.5 text-xs text-zinc-500">See how WANIA works, all over again.</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600" />
          </button>
          <button
            onClick={() => {
              void logout().then(() => navigate('/'));
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-rose-500/[0.06]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-300">
              <LogOut className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-rose-300">Log out</p>
              <p className="mt-0.5 text-xs text-zinc-500">End this session on this device.</p>
            </div>
          </button>
        </div>
      </section>

      <section className="card mb-4 overflow-hidden">
        <div className="border-b border-white/[0.06] px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white">
            <Bell className="h-4 w-4 text-grape-300" /> Notifications
          </h2>
        </div>
        <div className="divide-y divide-white/[0.05] px-4">
          <Toggle
            label="New followers"
            description="When someone follows you or requests to follow."
            checked={settings.notifyFollows}
            onChange={(value) => void updateSetting('notifyFollows', value)}
            disabled={saving === 'notifyFollows'}
          />
          <Toggle
            label="Likes"
            description="When someone likes your post."
            checked={settings.notifyLikes}
            onChange={(value) => void updateSetting('notifyLikes', value)}
            disabled={saving === 'notifyLikes'}
          />
          <Toggle
            label="Comments"
            description="When someone comments or mentions you."
            checked={settings.notifyComments}
            onChange={(value) => void updateSetting('notifyComments', value)}
            disabled={saving === 'notifyComments'}
          />
          <Toggle
            label="Messages"
            description="When a new message arrives."
            checked={settings.notifyMessages}
            onChange={(value) => void updateSetting('notifyMessages', value)}
            disabled={saving === 'notifyMessages'}
          />
          <Toggle
            label="Calls"
            description="When someone calls you."
            checked={settings.notifyCalls}
            onChange={(value) => void updateSetting('notifyCalls', value)}
            disabled={saving === 'notifyCalls'}
          />
        </div>
      </section>

      <section className="card mb-4 overflow-hidden">
        <div className="border-b border-white/[0.06] px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white">
            <Bot className="h-4 w-4 text-grape-300" /> AI assistant
            {aiStatus && (
              <span className="ml-auto">
                <Badge tone={aiStatus.configured ? 'green' : 'default'}>
                  {aiStatus.configured ? aiStatus.model || 'Live' : 'Guided mode'}
                </Badge>
              </span>
            )}
          </h2>
        </div>
        <div className="divide-y divide-white/[0.05] px-4">
          <Toggle
            label="Enable the assistant"
            description="Get help navigating WANIA from the assistant button."
            checked={settings.aiEnabled}
            onChange={(value) => void updateSetting('aiEnabled', value)}
            disabled={saving === 'aiEnabled'}
          />
          <Toggle
            label="Save assistant history"
            description="Keep your assistant conversations so you can return to them."
            checked={settings.aiHistoryEnabled}
            onChange={(value) => void updateSetting('aiHistoryEnabled', value)}
            disabled={saving === 'aiHistoryEnabled'}
          />
          <div className="flex items-center justify-between gap-3 py-3">
            <div>
              <p className="text-sm font-medium text-zinc-200">Assistant conversations</p>
              <p className="mt-0.5 text-xs text-zinc-500">Clear everything the assistant remembers about your chats.</p>
            </div>
            <button className="btn-secondary shrink-0 text-xs" onClick={() => setClearHistoryOpen(true)}>
              Clear history
            </button>
          </div>
        </div>
      </section>

      <section className="card mb-4 overflow-hidden">
        <div className="border-b border-white/[0.06] px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white">
            <ShieldCheck className="h-4 w-4 text-grape-300" /> Privacy
          </h2>
        </div>
        <div className="space-y-3 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-200">Who can see your stories?</p>
              <p className="mt-0.5 text-xs text-zinc-500">Control your default story audience.</p>
            </div>
            <select
              className="input h-9 w-32 py-1 text-xs"
              value={settings.storyPrivacy}
              onChange={(event) => void updateSetting('storyPrivacy', event.target.value as ProfileSettings['storyPrivacy'])}
              disabled={saving === 'storyPrivacy'}
            >
              <option value="everyone">Everyone</option>
              <option value="followers">Followers</option>
            </select>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-200">Who can message you?</p>
              <p className="mt-0.5 text-xs text-zinc-500">Control who can start a conversation.</p>
            </div>
            <select
              className="input h-9 w-32 py-1 text-xs"
              value={settings.messagePrivacy}
              onChange={(event) => void updateSetting('messagePrivacy', event.target.value as ProfileSettings['messagePrivacy'])}
              disabled={saving === 'messagePrivacy'}
            >
              <option value="everyone">Everyone</option>
              <option value="followers">Followers</option>
            </select>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-200">Last seen</p>
              <p className="mt-0.5 text-xs text-zinc-500">Who can see when you were last online.</p>
            </div>
            <select
              className="input h-9 w-32 py-1 text-xs"
              value={settings.lastSeenVisibility}
              onChange={(event) =>
                void updateSetting('lastSeenVisibility', event.target.value as ProfileSettings['lastSeenVisibility'])
              }
              disabled={saving === 'lastSeenVisibility'}
            >
              <option value="everyone">Everyone</option>
              <option value="followers">Followers</option>
              <option value="nobody">Nobody</option>
            </select>
          </div>
          <div className="pt-1">
            <Link to="/settings/profile" className="text-xs font-semibold text-grape-300 hover:text-grape-200">
              More privacy settings →
            </Link>
          </div>
        </div>
      </section>

      <section className="card overflow-hidden border-rose-500/15">
        <div className="border-b border-rose-500/10 px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-rose-300">
            <ShieldOff className="h-4 w-4" /> Danger zone
          </h2>
        </div>
        <div className="p-1.5">
          <button
            onClick={() => {
              setDangerPassword('');
              setDeactivateOpen(true);
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/[0.04]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-300">
              <UserX className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-zinc-200">Deactivate account</p>
              <p className="mt-0.5 text-xs text-zinc-500">Hide your profile until you sign in again.</p>
            </div>
          </button>
          <button
            onClick={() => {
              setDangerPassword('');
              setDeleteConfirm('');
              setDeleteOpen(true);
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-rose-500/[0.06]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-300">
              <Trash2 className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-rose-300">Delete account</p>
              <p className="mt-0.5 text-xs text-zinc-500">Permanently remove your account and content.</p>
            </div>
          </button>
        </div>
      </section>

      <p className="mt-6 text-center text-[11px] text-zinc-600">WANIA · Your moments. Your people. Your world.</p>

      <Modal open={passwordOpen} onClose={() => setPasswordOpen(false)} title="Change password" description="Choose a strong password you don’t use elsewhere." size="sm">
        <form onSubmit={changePassword} className="space-y-3">
          <PasswordInput value={currentPassword} onChange={setCurrentPassword} placeholder="Current password" autoComplete="current-password" />
          <PasswordInput value={newPassword} onChange={setNewPassword} placeholder="New password (min. 8 characters)" autoComplete="new-password" />
          <PasswordInput value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirm new password" autoComplete="new-password" />
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-secondary" onClick={() => setPasswordOpen(false)} disabled={passwordBusy}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={passwordBusy || !currentPassword || newPassword.length < 8}>
              {passwordBusy && <Spinner className="h-4 w-4" />} Update password
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deactivateOpen}
        onClose={() => setDeactivateOpen(false)}
        title="Deactivate your account?"
        description="Your profile will be hidden and you will be signed out. Sign back in any time to reactivate."
        confirmLabel="Deactivate"
        destructive
        confirmDisabled={!dangerPassword}
        onConfirm={async () => {
          try {
            await authApi.deactivate(dangerPassword);
            await logout();
            navigate('/');
          } catch (err) {
            error(getErrorMessage(err));
            throw err;
          }
        }}
      >
        <PasswordInput value={dangerPassword} onChange={setDangerPassword} placeholder="Your password" />
      </ConfirmDialog>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete your account forever?"
        description="This removes your profile, posts, stories, messages and settings. This cannot be undone."
        confirmLabel="Delete account"
        destructive
        confirmDisabled={deleteConfirm !== 'DELETE' || !dangerPassword}
        onConfirm={async () => {
          try {
            await authApi.deleteAccount(dangerPassword);
            await logout();
            navigate('/');
          } catch (err) {
            error(getErrorMessage(err));
            throw err;
          }
        }}
      >
        <div className="space-y-3">
          <PasswordInput value={dangerPassword} onChange={setDangerPassword} placeholder="Your password" />
          <div>
            <label className="label">Type DELETE to confirm</label>
            <input className="input" value={deleteConfirm} onChange={(event) => setDeleteConfirm(event.target.value)} placeholder="DELETE" />
          </div>
          {deleteConfirm !== 'DELETE' && <p className="text-xs text-zinc-500">Type DELETE exactly to enable the button.</p>}
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={clearHistoryOpen}
        onClose={() => setClearHistoryOpen(false)}
        title="Clear assistant history?"
        description="This deletes your assistant conversations. It doesn’t affect your posts or messages."
        confirmLabel="Clear history"
        destructive
        onConfirm={async () => {
          try {
            await aiApi.clearHistory();
            success('Assistant history cleared');
          } catch (err) {
            error(getErrorMessage(err));
            throw err;
          }
        }}
      />
    </div>
  );
}
