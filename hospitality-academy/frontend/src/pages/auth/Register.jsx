import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, User, AtSign, AlertCircle, Coffee } from 'lucide-react';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: '', email: '', displayName: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const from = location.state?.from || '/community';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await register(form.username, form.email, form.password, form.displayName);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const input = "w-full pl-10 pr-4 py-3 rounded-xl border border-coffee-200 focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200 outline-none text-sm";

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-coffee-50">
      <div className="bg-white rounded-2xl shadow-lg border border-coffee-100 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Coffee className="w-10 h-10 text-coffee-700 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-coffee-900">Create Your Account</h1>
          <p className="text-charcoal/50 text-sm mt-1">Join the hospitality learning community</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-coffee-900 mb-1.5">Display Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/40" />
              <input type="text" required minLength={2} maxLength={100} value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} className={input} placeholder="John Doe" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-coffee-900 mb-1.5">Username</label>
            <div className="relative">
              <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/40" />
              <input type="text" required minLength={3} maxLength={50} pattern="[a-zA-Z0-9_]+" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className={input} placeholder="johndoe" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-coffee-900 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/40" />
              <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={input} placeholder="you@example.com" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-coffee-900 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/40" />
              <input type="password" required minLength={8} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className={input} placeholder="At least 8 characters" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-coffee-900 mb-1.5">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/40" />
              <input type="password" required value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} className={input} placeholder="Repeat password" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-coffee-700 text-white py-3.5 rounded-xl font-semibold hover:bg-coffee-800 transition disabled:opacity-50">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-charcoal/60">
          Already have an account? <Link to="/login" state={{ from }} className="text-coffee-700 font-semibold hover:underline">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
