export function cn(...values: (string | false | null | undefined)[]) {
  return values.filter(Boolean).join(' ');
}

export function timeAgo(input: string | Date | null | undefined) {
  if (!input) return '';
  const date = typeof input === 'string' ? new Date(input) : input;
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.round(days / 7);
  if (weeks < 5) return `${weeks}w`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
}

export function fullDate(input: string | Date | null | undefined) {
  if (!input) return '';
  const date = typeof input === 'string' ? new Date(input) : input;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDuration(totalSeconds: number | null | undefined) {
  const s = Math.max(0, Math.floor(totalSeconds ?? 0));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}:${String(m % 60).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function expiresIn(input: string | null | undefined) {
  if (!input) return '';
  const ms = new Date(input).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `${hours}h left`;
  const minutes = Math.max(1, Math.floor(ms / 60_000));
  return `${minutes}m left`;
}

export function truncate(value: string, max = 80) {
  return value.length > max ? value.slice(0, max - 1) + '…' : value;
}

export function plural(count: number, singular: string, pluralForm = singular + 's') {
  return count === 1 ? singular : pluralForm;
}

export function renderCaption(caption: string) {
  return caption.split(/(\s+)/).map((word, i) => {
    if (word.startsWith('#') && word.length > 1) return { type: 'hashtag', value: word, key: i };
    if (word.startsWith('@') && word.length > 1) return { type: 'mention', value: word, key: i };
    return { type: 'text', value: word, key: i };
  });
}
