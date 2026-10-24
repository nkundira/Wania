import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { getErrorMessage } from '../lib/api';
import { authApi } from '../services/wania';
import { AuthAlert, AuthShell } from '../components/auth/AuthShell';
import { Spinner } from '../components/ui';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await authApi.forgotPassword(email.trim());
      setSent(true);
      if (result.devToken) setDevToken(result.devToken);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email on your account and we’ll send you a secure reset link."
      footer={
        <>
          Remembered it?{' '}
          <Link to="/login" className="link">
            Back to sign in
          </Link>
        </>
      }
    >
      {sent ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5 text-center">
          <MailCheck className="mx-auto h-10 w-10 text-emerald-400" />
          <h3 className="mt-3 font-display text-lg font-bold text-white">Check your inbox</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
            If <span className="font-medium text-zinc-200">{email}</span> is registered, a reset link is on its way. It expires in 60 minutes.
          </p>
          {devToken && (
            <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-left text-xs text-amber-200">
              <p className="font-semibold">Development mode</p>
              <p className="mt-1">Email delivery is not configured. Use this reset link:</p>
              <Link to={`/reset-password?token=${encodeURIComponent(devToken)}`} className="mt-2 inline-block break-all underline">
                Continue to reset password
              </Link>
            </div>
          )}
          <button className="btn-secondary mt-5" onClick={() => setSent(false)}>
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <AuthAlert message={error} />
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
              autoFocus
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full py-3" disabled={loading || !email.includes('@')}>
            {loading && <Spinner className="h-4 w-4" />}
            Send reset link
          </button>
        </form>
      )}
    </AuthShell>
  );
}
