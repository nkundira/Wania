import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { AuthAlert, AuthShell } from '../components/auth/AuthShell';
import { PasswordInput } from '../components/auth/PasswordInput';
import { Spinner } from '../components/ui';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Enter your email or username and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(identifier.trim(), password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from !== '/login' ? from : '/', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to pick up where you left off."
      footer={
        <>
          New to WANIA?{' '}
          <Link to="/register" className="link">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <AuthAlert message={error} />
        <div>
          <label htmlFor="identifier" className="label">
            Email or username
          </label>
          <input
            id="identifier"
            className="input"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="you@example.com"
            autoComplete="username"
            autoFocus
            required
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="label mb-0">
              Password
            </label>
            <Link to="/forgot-password" className="text-xs font-medium text-grape-300 hover:underline">
              Forgot password?
            </Link>
          </div>
          <PasswordInput id="password" name="password" value={password} onChange={setPassword} />
        </div>
        <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
          {loading && <Spinner className="h-4 w-4" />}
          Sign in
        </button>
      </form>
    </AuthShell>
  );
}
