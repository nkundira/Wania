import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Lock, Save, Trash2 } from 'lucide-react';
import { assetUrl, getErrorMessage } from '../lib/api';
import { mediaApi, usersApi } from '../services/wania';
import type { ProfileSettings } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Avatar } from '../components/Avatar';
import { PageHeader, Spinner, Toggle } from '../components/ui';

const MAX_IMAGE = 10 * 1024 * 1024;

export function SettingsProfilePage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const { success, error } = useToast();
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [isPrivate, setIsPrivate] = useState(user?.isPrivate ?? false);
  const [showActivity, setShowActivity] = useState(user?.settings?.showActivity ?? true);
  const [lastSeenVisibility, setLastSeenVisibility] = useState<ProfileSettings['lastSeenVisibility']>(
    user?.settings?.lastSeenVisibility ?? 'followers'
  );
  const [storyPrivacy, setStoryPrivacy] = useState<ProfileSettings['storyPrivacy']>(user?.settings?.storyPrivacy ?? 'followers');
  const [messagePrivacy, setMessagePrivacy] = useState<ProfileSettings['messagePrivacy']>(
    user?.settings?.messagePrivacy ?? 'everyone'
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'avatar' | 'cover' | null>(null);

  if (!user) return null;

  async function pickImage(file: File | undefined, purpose: 'avatar' | 'cover') {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      error('Choose an image file');
      return;
    }
    if (file.size > MAX_IMAGE) {
      error('Image must be smaller than 10 MB');
      return;
    }
    setUploading(purpose);
    try {
      const media = await mediaApi.upload(file, purpose);
      const updated = await usersApi.updateMe(purpose === 'avatar' ? { avatarMediaId: media.id } : { coverMediaId: media.id });
      setUser(updated);
      success(purpose === 'avatar' ? 'Profile photo updated' : 'Cover photo updated');
    } catch (err) {
      error(getErrorMessage(err));
    } finally {
      setUploading(null);
      if (avatarInput.current) avatarInput.current.value = '';
      if (coverInput.current) coverInput.current.value = '';
    }
  }

  async function removeImage(purpose: 'avatar' | 'cover') {
    setUploading(purpose);
    try {
      const updated = await usersApi.updateMe(purpose === 'avatar' ? { avatarMediaId: null } : { coverMediaId: null });
      setUser(updated);
      success(purpose === 'avatar' ? 'Profile photo removed' : 'Cover photo removed');
    } catch (err) {
      error(getErrorMessage(err));
    } finally {
      setUploading(null);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!displayName.trim()) {
      error('Display name is required');
      return;
    }
    setSaving(true);
    try {
      const updated = await usersApi.updateMe({
        displayName: displayName.trim(),
        bio: bio.trim(),
        isPrivate,
        showActivity,
        lastSeenVisibility,
        storyPrivacy,
        messagePrivacy,
      });
      setUser(updated);
      success('Profile updated');
      navigate(`/u/${updated.username}`);
    } catch (err) {
      error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const cover = assetUrl(user.coverUrl);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="icon-btn" aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <PageHeader title="Edit profile" subtitle="Put your best self forward." className="mb-0" />
      </div>

      <form onSubmit={save} className="space-y-4">
        <section className="card overflow-hidden">
          <div className="relative h-36 bg-gradient-to-r from-grape-900 via-ink-800 to-fuchsia-900/60 sm:h-44">
            {cover && <img src={cover} alt="Cover" className="h-full w-full object-cover" />}
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute right-3 top-3 flex gap-2">
              <input
                ref={coverInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => void pickImage(event.target.files?.[0], 'cover')}
              />
              <button
                type="button"
                className="btn-secondary bg-black/40 text-xs backdrop-blur"
                onClick={() => coverInput.current?.click()}
                disabled={uploading !== null}
              >
                {uploading === 'cover' ? <Spinner className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
                Change cover
              </button>
              {user.coverUrl && (
                <button
                  type="button"
                  className="icon-btn bg-black/40 backdrop-blur hover:bg-rose-500/25"
                  onClick={() => void removeImage('cover')}
                  disabled={uploading !== null}
                  aria-label="Remove cover"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="px-4 pb-5 sm:px-6">
            <div className="-mt-10 flex items-end justify-between gap-3">
              <div className="relative">
                <Avatar user={user} size={82} ring />
                <input
                  ref={avatarInput}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => void pickImage(event.target.files?.[0], 'avatar')}
                />
                <button
                  type="button"
                  onClick={() => avatarInput.current?.click()}
                  disabled={uploading !== null}
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink-850 bg-grape-600 text-white transition hover:bg-grape-500"
                  aria-label="Change profile photo"
                >
                  {uploading === 'avatar' ? <Spinner className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">@{user.username}</span>
                {user.avatarUrl && (
                  <button
                    type="button"
                    onClick={() => void removeImage('avatar')}
                    disabled={uploading !== null}
                    className="text-xs font-semibold text-rose-300 hover:text-rose-200 disabled:opacity-50"
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="label" htmlFor="displayName">
                  Display name
                </label>
                <input
                  id="displayName"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  maxLength={50}
                  className="input"
                  placeholder="Your name"
                />
                <p className="mt-1 text-right text-[10px] text-zinc-600">{displayName.length}/50</p>
              </div>
              <div>
                <label className="label" htmlFor="bio">
                  Bio
                </label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  maxLength={300}
                  className="input min-h-[90px] resize-none"
                  placeholder="Say something about yourself"
                />
                <p className="mt-1 text-right text-[10px] text-zinc-600">{bio.length}/300</p>
              </div>
              <div>
                <span className="label">Username</span>
                <div className="input flex items-center justify-between bg-white/[0.02] text-zinc-500">
                  <span>@{user.username}</span>
                  <Lock className="h-3.5 w-3.5" />
                </div>
                <p className="mt-1 text-[11px] text-zinc-600">Usernames are permanent for now.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-white/[0.06] px-4 py-3">
            <h2 className="text-sm font-bold text-white">Privacy &amp; presence</h2>
          </div>
          <div className="divide-y divide-white/[0.05] px-4">
            <Toggle
              label="Private account"
              description="Only approved followers can see your posts, reels and stories."
              checked={isPrivate}
              onChange={setIsPrivate}
            />
            <Toggle
              label="Show activity status"
              description="Let people see when you’re active on WANIA."
              checked={showActivity}
              onChange={setShowActivity}
            />
            <div className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium text-zinc-200">Last seen visibility</p>
                <p className="mt-0.5 text-xs text-zinc-500">Choose who can see your last seen time.</p>
              </div>
              <select
                className="input h-9 w-32 py-1 text-xs"
                value={lastSeenVisibility}
                onChange={(event) => setLastSeenVisibility(event.target.value as ProfileSettings['lastSeenVisibility'])}
              >
                <option value="everyone">Everyone</option>
                <option value="followers">Followers</option>
                <option value="nobody">Nobody</option>
              </select>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium text-zinc-200">Story audience</p>
                <p className="mt-0.5 text-xs text-zinc-500">Default audience for new stories.</p>
              </div>
              <select
                className="input h-9 w-32 py-1 text-xs"
                value={storyPrivacy}
                onChange={(event) => setStoryPrivacy(event.target.value as ProfileSettings['storyPrivacy'])}
              >
                <option value="everyone">Everyone</option>
                <option value="followers">Followers</option>
              </select>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium text-zinc-200">Who can message you</p>
                <p className="mt-0.5 text-xs text-zinc-500">Control who can start new conversations.</p>
              </div>
              <select
                className="input h-9 w-32 py-1 text-xs"
                value={messagePrivacy}
                onChange={(event) => setMessagePrivacy(event.target.value as ProfileSettings['messagePrivacy'])}
              >
                <option value="everyone">Everyone</option>
                <option value="followers">Followers</option>
              </select>
            </div>
          </div>
        </section>

        <div className="flex items-center justify-between gap-3">
          <Link to={`/u/${user.username}`} className="btn-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn-primary" disabled={saving || uploading !== null}>
            {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}
