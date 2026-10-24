import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, KeyRound } from 'lucide-react';
import { getErrorMessage } from '../lib/api';
import { authApi } from '../services/wania';
import { AuthAlert, AuthShell } from '../components/auth/AuthShell';
import { PasswordInput } from '../components/auth/PasswordInput';
import { Spinner } from '../components/ui';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      setError('Your new password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <AuthShell title="Invalid reset link" subtitle="This link is missing its secure token.">
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.06] p-5 text-center">
          <KeyRound className="mx-auto h-10 w-10 text-rose-300" />
          <p className="mt-3 text-sm text-zinc-300">Request a fresh password reset link to continue.</p>
          <Link to="/forgot-password" className="btn-primary mt-4 w-full">
            Request a new link
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={done ? 'Password updated' : 'Choose a new password'}
      subtitle={done ? 'Your old sessions have been signed out for safety.' : 'Use at least 8 characters. A longer, unique password is best.'}
      footer={
        done ? null : (
          <>
            Need a new link?{' '}
            <Link to="/forgot-password" className="link">
              Request another
            </Link>
          </>
        )
      }
    >
      {done ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
          <p className="mt-3 text-sm text-zinc-300">Sign in with your new password.</p>
          <button className="btn-primary mt-4 w-full" onClick={() => navigate('/login', { replace: true })}>
            Go to sign in
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <AuthAlert message={error} />
          <div>
            <label htmlFor="new-password" className="label">
              New password
            </label>
            <PasswordInput id="new-password" value={password} onChange={setPassword} autoComplete="new-password" placeholder="At least 8 characters" />
          </div>
          <div>
            <label htmlFor="confirm-password" className="label">
              Confirm password
            </label>
            <PasswordInput id="confirm-password" value={confirm} onChange={setConfirm} autoComplete="new-password" placeholder="Repeat your new password" />
          </div>
          <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
            {loading && <Spinner className="h-4 w-4" />}
            Update password
          </button>
        </form>
      )}
    </AuthShell>
  );
}
