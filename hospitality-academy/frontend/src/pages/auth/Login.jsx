import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, AlertCircle, Coffee } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from || '/community';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-coffee-50">
      <div className="bg-white rounded-2xl shadow-lg border border-coffee-100 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Coffee className="w-10 h-10 text-coffee-700 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-coffee-900">Welcome Back</h1>
          <p className="text-charcoal/50 text-sm mt-1">Sign in to continue learning</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-coffee-900 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/40" />
              <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full pl-10 pr-4 py-3 rounded-xl border border-coffee-200 focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200 outline-none text-sm" placeholder="you@example.com" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-coffee-900 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/40" />
              <input type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full pl-10 pr-4 py-3 rounded-xl border border-coffee-200 focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200 outline-none text-sm" placeholder="Your password" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-coffee-700 text-white py-3.5 rounded-xl font-semibold hover:bg-coffee-800 transition disabled:opacity-50">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-charcoal/60">
          Don't have an account? <Link to="/register" state={{ from }} className="text-coffee-700 font-semibold hover:underline">Sign Up</Link>
        </div>

        <div className="mt-4 p-3 bg-coffee-50 rounded-xl text-xs text-charcoal/50 text-center">
          Demo account: sarah@example.com / password123
        </div>
      </div>
    </div>
  );
}
