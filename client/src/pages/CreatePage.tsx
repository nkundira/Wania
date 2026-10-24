import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Camera, Film, Globe2, ImagePlus, MapPin, Plus, UploadCloud, Users, X } from 'lucide-react';
import { getErrorMessage } from '../lib/api';
import { mediaApi, postsApi, storiesApi } from '../services/wania';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { cn } from '../utils/format';
import { Avatar } from '../components/Avatar';
import { Spinner } from '../components/ui';

type Tab = 'post' | 'reel' | 'story';
type PickedFile = { id: string; file: File; preview: string; type: 'image' | 'video' };

const MAX_MB = 50;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'];

export function CreatePage() {
  const { user } = useAuth();
  const { error, success } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialTab: Tab = params.get('story') === '1' ? 'story' : params.get('type') === 'reel' ? 'reel' : 'post';
  const [tab, setTab] = useState<Tab>(initialTab);
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'followers'>('public');
  const [storyPrivacy, setStoryPrivacy] = useState<'everyone' | 'followers'>('followers');
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadLabel, setUploadLabel] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef(files);
  filesRef.current = files;

  useEffect(() => {
    return () => {
      filesRef.current.forEach((item) => URL.revokeObjectURL(item.preview));
    };
  }, []);

  function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list);
    for (const file of incoming) {
      if (!ACCEPTED.includes(file.type)) {
        error('Use a JPG, PNG, WebP, GIF, MP4, MOV, or WebM file.');
        continue;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        error(`${file.name} is larger than ${MAX_MB} MB.`);
        continue;
      }
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      if (tab === 'story' && (files.length > 0 || incoming.length > 1)) {
        error('A story can contain one photo or video.');
        break;
      }
      setFiles((current) => {
        if (tab === 'story') return [...current, { id: crypto.randomUUID(), file, preview: URL.createObjectURL(file), type }];
        if (current.length >= 10) {
          error('You can add up to 10 photos or videos.');
          return current;
        }
        if (type === 'video' && current.some((item) => item.type === 'video')) {
          error('A post can contain one video, or multiple photos.');
          return current;
        }
        if (type === 'video' && current.length > 0) {
          error('A post can contain one video, or multiple photos.');
          return current;
        }
        if (current.some((item) => item.type === 'video')) {
          error('A post can contain one video, or multiple photos.');
          return current;
        }
        return [...current, { id: crypto.randomUUID(), file, preview: URL.createObjectURL(file), type }];
      });
    }
  }

  function removeFile(id: string) {
    setFiles((current) => {
      const item = current.find((entry) => entry.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return current.filter((entry) => entry.id !== id);
    });
  }

  function changeTab(next: Tab) {
    setTab(next);
    setFiles((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.preview));
      return [];
    });
    setCaption('');
    setProgress(0);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!files.length) {
      error('Add at least one photo or video.');
      return;
    }
    setSubmitting(true);
    setProgress(0);
    try {
      const purpose = tab === 'story' ? 'story' : tab === 'reel' ? 'reel' : 'post';
      const mediaIds: string[] = [];
      for (let index = 0; index < files.length; index++) {
        const item = files[index];
        setUploadLabel(`Uploading ${index + 1} of ${files.length}…`);
        const uploaded = await mediaApi.upload(item.file, purpose, (percent) => {
          setProgress(Math.round(((index + percent / 100) / files.length) * 100));
        });
        mediaIds.push(uploaded.id);
        setProgress(Math.round(((index + 1) / files.length) * 100));
      }

      setUploadLabel('Publishing…');
      if (tab === 'story') {
        await storiesApi.create({
          mediaId: mediaIds[0],
          caption: caption.trim() || undefined,
          privacy: storyPrivacy,
        });
        success('Story shared for 24 hours');
        navigate('/');
      } else {
        const post = await postsApi.create({
          type: tab,
          caption: caption.trim(),
          mediaIds,
          location: location.trim() || undefined,
          visibility,
        });
        success(tab === 'reel' ? 'Reel published' : 'Post shared');
        navigate(`/post/${post.id}`);
      }
    } catch (err) {
      error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
      setUploadLabel('');
    }
  }

  const isStory = tab === 'story';

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-white">Create</h1>
        <p className="mt-0.5 text-xs text-zinc-500">Share a moment with your world.</p>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-1 rounded-xl border border-white/[0.06] bg-ink-850 p-1">
        {(
          [
            { value: 'post', label: 'Post', icon: ImagePlus },
            { value: 'reel', label: 'Reel', icon: Film },
            { value: 'story', label: 'Story', icon: Camera },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => changeTab(item.value)}
              disabled={submitting}
              className={cn(
                'flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition',
                tab === item.value ? 'bg-white/[0.09] text-white' : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              <Icon className="h-4 w-4" /> {item.label}
            </button>
          );
        })}
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="card overflow-hidden">
          {files.length === 0 ? (
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files);
              }}
              className={cn(
                'flex min-h-[320px] cursor-pointer flex-col items-center justify-center gap-3 p-8 text-center transition',
                dragging ? 'bg-grape-600/10' : 'bg-ink-900/40 hover:bg-white/[0.02]'
              )}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click();
              }}
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-grape-300">
                <UploadCloud className="h-8 w-8" />
              </span>
              <div>
                <p className="font-display text-lg font-bold text-white">
                  {isStory ? 'Add to your story' : tab === 'reel' ? 'Upload a reel' : 'Choose photos or a video'}
                </p>
                <p className="mt-1 text-sm text-zinc-500">Drag and drop here, or tap to browse. Up to {MAX_MB} MB.</p>
                <p className="mt-2 text-[11px] text-zinc-600">
                  {isStory ? 'One photo or video · disappears after 24 hours' : tab === 'reel' ? 'One vertical video · 9:16 looks best' : 'Up to 10 photos, or one video'}
                </p>
              </div>
              <span className="btn-secondary mt-1">Browse files</span>
            </div>
          ) : (
            <div className="p-3">
              <div className={cn('grid gap-2', files.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3')}>
                {files.map((item, index) => (
                  <div
                    key={item.id}
                    className={cn(
                      'group relative overflow-hidden rounded-xl bg-black',
                      files.length === 1 ? 'aspect-[4/5] max-h-[520px]' : 'aspect-square'
                    )}
                  >
                    {item.type === 'video' ? (
                      <video src={item.preview} controls playsInline className="h-full w-full object-contain" />
                    ) : (
                      <img src={item.preview} alt="" className="h-full w-full object-cover" />
                    )}
                    <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">{index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(item.id)}
                      className="icon-btn absolute right-2 top-2 h-7 w-7 bg-black/60 text-white hover:bg-rose-600"
                      aria-label="Remove file"
                      disabled={submitting}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {!isStory && files.length < 10 && !files.some((item) => item.type === 'video') && (
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 text-zinc-500 transition hover:border-grape-500/40 hover:text-grape-300"
                    disabled={submitting}
                  >
                    <Plus className="h-6 w-6" />
                    <span className="text-[11px] font-medium">Add more</span>
                  </button>
                )}
              </div>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(',')}
            multiple={!isStory}
            className="hidden"
            onChange={(event) => {
              if (event.target.files?.length) addFiles(event.target.files);
              event.target.value = '';
            }}
          />
        </div>

        <div className="card space-y-3 p-4">
          <div className="flex items-start gap-3">
            {user && <Avatar user={user} size={38} />}
            <div className="min-w-0 flex-1">
              <textarea
                className="input min-h-[92px] resize-none"
                placeholder={isStory ? 'Add a caption to your story…' : 'Write a caption, add hashtags or tag someone…'}
                value={caption}
                maxLength={isStory ? 300 : 2200}
                onChange={(event) => setCaption(event.target.value)}
                disabled={submitting}
              />
              <div className="mt-1 flex items-center justify-between">
                <p className="text-[11px] text-zinc-600">#{'{hashtag}'} to be discoverable</p>
                <p className="text-[11px] text-zinc-600">
                  {caption.length}/{isStory ? 300 : 2200}
                </p>
              </div>
            </div>
          </div>

          {!isStory && (
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                className="input pl-9"
                placeholder="Add a location (optional)"
                value={location}
                maxLength={120}
                onChange={(event) => setLocation(event.target.value)}
                disabled={submitting}
              />
            </div>
          )}

          <div>
            <p className="label">{isStory ? 'Who can see this story?' : 'Who can see this?'}</p>
            <div className="grid grid-cols-2 gap-2">
              <PrivacyOption
                active={isStory ? storyPrivacy === 'everyone' : visibility === 'public'}
                onClick={() => (isStory ? setStoryPrivacy('everyone') : setVisibility('public'))}
                icon={Globe2}
                title={isStory ? 'Everyone' : 'Public'}
                description={isStory ? 'Anyone who follows you can view' : 'Anyone on WANIA can find it'}
                disabled={submitting}
              />
              <PrivacyOption
                active={isStory ? storyPrivacy === 'followers' : visibility === 'followers'}
                onClick={() => (isStory ? setStoryPrivacy('followers') : setVisibility('followers'))}
                icon={Users}
                title={isStory ? 'Followers' : 'Followers only'}
                description={isStory ? 'Only your followers' : 'Only people who follow you'}
                disabled={submitting}
              />
            </div>
          </div>
        </div>

        {submitting && (
          <div className="card p-4">
            <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-2">
                <Spinner className="h-3.5 w-3.5 text-grape-400" /> {uploadLabel || 'Preparing…'}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-grape-500 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pb-4">
          <button type="button" className="btn-ghost" onClick={() => navigate(-1)} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn-primary px-6" disabled={submitting || files.length === 0}>
            {submitting && <Spinner className="h-4 w-4" />}
            {isStory ? 'Share story' : tab === 'reel' ? 'Publish reel' : 'Share post'}
          </button>
        </div>
      </form>
    </div>
  );
}

function PrivacyOption({
  active,
  onClick,
  icon: Icon,
  title,
  description,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Globe2;
  title: string;
  description: string;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-start gap-2.5 rounded-xl border p-3 text-left transition',
        active ? 'border-grape-500/50 bg-grape-600/10' : 'border-white/[0.07] bg-white/[0.02] hover:border-white/15'
      )}
    >
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', active ? 'text-grape-300' : 'text-zinc-500')} />
      <span>
        <span className={cn('block text-xs font-semibold', active ? 'text-white' : 'text-zinc-300')}>{title}</span>
        <span className="mt-0.5 block text-[10px] leading-snug text-zinc-500">{description}</span>
      </span>
    </button>
  );
}
