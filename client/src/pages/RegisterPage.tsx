import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { getErrorMessage } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { AuthAlert, AuthShell } from '../components/auth/AuthShell';
import { PasswordInput } from '../components/auth/PasswordInput';
import { Spinner } from '../components/ui';

const USERNAME_RE = /^[a-zA-Z0-9._]{3,24}$/;

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const usernameOk = USERNAME_RE.test(username);
  const passwordOk = password.length >= 8;
  const match = password.length > 0 && password === confirm;
  const canSubmit = displayName.trim().length >= 2 && usernameOk && email.includes('@') && passwordOk && match && agree;

  const strength = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return Math.min(score, 4);
  }, [password]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    try {
      await register({ displayName: displayName.trim(), username: username.trim(), email: email.trim(), password });
      navigate('/', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create your WANIA"
      subtitle="One account for your moments, your people, and your world."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="link">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <AuthAlert message={error} />
        <div>
          <label htmlFor="displayName" className="label">
            Display name
          </label>
          <input
            id="displayName"
            className="input"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Alex Rivera"
            autoComplete="name"
            required
          />
        </div>
        <div>
          <label htmlFor="username" className="label">
            Username
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500">@</span>
            <input
              id="username"
              className="input pl-8"
              value={username}
              onChange={(event) => setUsername(event.target.value.replace(/\s/g, ''))}
              placeholder="alexrivera"
              autoComplete="username"
              maxLength={24}
              required
            />
            {username.length > 2 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                {usernameOk ? <Check className="h-4 w-4 text-emerald-400" /> : <X className="h-4 w-4 text-rose-400" />}
              </span>
            )}
          </div>
          {username.length > 0 && !usernameOk && (
            <p className="mt-1 text-[11px] text-rose-300">Use 3–24 letters, numbers, dots or underscores.</p>
          )}
        </div>
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>
        <div>
          <label htmlFor="new-password" className="label">
            Password
          </label>
          <PasswordInput id="new-password" name="new-password" value={password} onChange={setPassword} autoComplete="new-password" />
          {password.length > 0 && (
            <div className="mt-2 flex gap-1">
              {[0, 1, 2, 3].map((index) => (
                <span
                  key={index}
                  className={`h-1 flex-1 rounded-full ${
                    index < strength ? (strength <= 1 ? 'bg-rose-500' : strength === 2 ? 'bg-amber-400' : 'bg-emerald-500') : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
          )}
          {password.length > 0 && !passwordOk && <p className="mt-1 text-[11px] text-rose-300">At least 8 characters.</p>}
        </div>
        <div>
          <label htmlFor="confirm-password" className="label">
            Confirm password
          </label>
          <PasswordInput
            id="confirm-password"
            name="confirm-password"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            placeholder="Repeat your password"
          />
          {confirm.length > 0 && !match && <p className="mt-1 text-[11px] text-rose-300">Passwords do not match.</p>}
        </div>
        <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-zinc-400">
          <input type="checkbox" checked={agree} onChange={(event) => setAgree(event.target.checked)} className="mt-0.5 h-4 w-4 accent-violet-500" />
          <span>
            I agree to treat people with respect and follow the WANIA community rules. I understand my account and content are protected by
            privacy settings I control.
          </span>
        </label>
        <button type="submit" className="btn-primary w-full py-3" disabled={loading || !canSubmit}>
          {loading && <Spinner className="h-4 w-4" />}
          Create account
        </button>
      </form>
    </AuthShell>
  );
}
