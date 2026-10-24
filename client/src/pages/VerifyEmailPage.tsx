import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, MailWarning } from 'lucide-react';
import { getErrorMessage } from '../lib/api';
import { authApi } from '../services/wania';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { AuthShell } from '../components/auth/AuthShell';
import { Spinner } from '../components/ui';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { user, refreshMe } = useAuth();
  const { success } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'invalid'>('loading');
  const [message, setMessage] = useState('');
  const [devToken, setDevToken] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (!token) {
      setStatus('invalid');
      return;
    }
    authApi
      .verifyEmail(token)
      .then(async () => {
        setStatus('success');
        if (user) await refreshMe();
      })
      .catch((err) => {
        setStatus('error');
        setMessage(getErrorMessage(err));
      });
  }, [token, user, refreshMe]);

  async function resend() {
    try {
      const result = await authApi.sendVerification();
      success(result.message);
      if (result.devToken) setDevToken(result.devToken);
    } catch (err) {
      setMessage(getErrorMessage(err));
    }
  }

  return (
    <AuthShell
      title={status === 'success' ? 'Email verified' : 'Verify your email'}
      subtitle={status === 'success' ? 'Your WANIA account is confirmed.' : 'One quick step to keep your account secure.'}
      footer={
        <Link to={user ? '/' : '/login'} className="link">
          {user ? 'Back to WANIA' : 'Go to sign in'}
        </Link>
      }
    >
      <div className="rounded-2xl border border-white/[0.07] bg-ink-900/60 p-6 text-center">
        {status === 'loading' && (
          <>
            <Spinner className="mx-auto h-8 w-8 text-grape-400" />
            <p className="mt-3 text-sm text-zinc-400">Verifying your link…</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
            <h3 className="mt-3 font-display text-lg font-bold text-white">You’re all set</h3>
            <p className="mt-1.5 text-sm text-zinc-400">Your email address is now verified.</p>
            <Link to={user ? '/' : '/login'} className="btn-primary mt-5 w-full">
              {user ? 'Open WANIA' : 'Sign in'}
            </Link>
          </>
        )}
        {(status === 'error' || status === 'invalid') && (
          <>
            <MailWarning className="mx-auto h-12 w-12 text-amber-400" />
            <h3 className="mt-3 font-display text-lg font-bold text-white">
              {status === 'invalid' ? 'Missing verification link' : 'This link did not work'}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
              {status === 'invalid' ? 'Open the verification link from your email.' : message || 'The link may have expired or already been used.'}
            </p>
            {user && (
              <button className="btn-secondary mt-5 w-full" onClick={() => void resend()}>
                Send a new verification link
              </button>
            )}
            {devToken && (
              <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-left text-xs text-amber-200">
                <p className="font-semibold">Development mode</p>
                <Link to={`/verify-email?token=${encodeURIComponent(devToken)}`} className="mt-1 inline-block break-all underline">
                  Open the new verification link
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </AuthShell>
  );
}
