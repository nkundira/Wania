import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { User, Lock, Shield, LogOut, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react';

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState('account');
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const changePassword = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (pwForm.newPassword !== pwForm.confirm) { setMsg({ type: 'error', text: 'New passwords do not match' }); return; }
    setLoading(true);
    try {
      await api.put('/auth/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setMsg({ type: 'success', text: 'Password updated successfully' });
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Failed to change password' });
    }
    setLoading(false);
  };

  const handleLogout = async () => { await logout(); navigate('/'); };

  const sections = [
    { key: 'account', label: 'Account', icon: User },
    { key: 'security', label: 'Security', icon: Lock },
    { key: 'privacy', label: 'Privacy', icon: Shield },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-coffee-900 mb-6">Settings</h1>

      <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 border border-coffee-100">
        {sections.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setSection(key)} className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-1.5 ${section === key ? 'bg-coffee-700 text-white' : 'text-charcoal/60 hover:text-coffee-700'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {msg && (
        <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl mb-4 ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />} {msg.text}
        </div>
      )}

      {section === 'account' && (
        <div className="bg-white rounded-2xl border border-coffee-100 shadow-sm divide-y divide-coffee-50">
          <div className="p-5 flex justify-between items-center">
            <div>
              <p className="font-semibold text-coffee-900 text-sm">Username</p>
              <p className="text-charcoal/50 text-sm">@{user?.username}</p>
            </div>
          </div>
          <div className="p-5 flex justify-between items-center">
            <div>
              <p className="font-semibold text-coffee-900 text-sm">Email</p>
              <p className="text-charcoal/50 text-sm">{user?.email}</p>
            </div>
          </div>
          <div className="p-5 flex justify-between items-center">
            <div>
              <p className="font-semibold text-coffee-900 text-sm">Display Name</p>
              <p className="text-charcoal/50 text-sm">{user?.displayName}</p>
            </div>
            <button onClick={() => navigate('/profile/edit')} className="text-coffee-700 text-sm font-medium hover:text-coffee-900 flex items-center gap-1">Edit <ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="p-5 flex justify-between items-center">
            <div>
              <p className="font-semibold text-coffee-900 text-sm">Role</p>
              <p className="text-charcoal/50 text-sm capitalize">{user?.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full p-5 flex items-center gap-2 text-red-600 text-sm font-semibold hover:bg-red-50 transition">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      )}

      {section === 'security' && (
        <form onSubmit={changePassword} className="bg-white rounded-2xl border border-coffee-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-coffee-900">Change Password</h3>
          <div>
            <label className="block text-sm font-medium text-coffee-900 mb-1.5">Current Password</label>
            <input type="password" required value={pwForm.currentPassword} onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-coffee-200 focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200 outline-none text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-coffee-900 mb-1.5">New Password</label>
            <input type="password" required minLength={8} value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-coffee-200 focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200 outline-none text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-coffee-900 mb-1.5">Confirm New Password</label>
            <input type="password" required value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-coffee-200 focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200 outline-none text-sm" />
          </div>
          <button type="submit" disabled={loading} className="bg-coffee-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-coffee-800 transition disabled:opacity-50">
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      )}

      {section === 'privacy' && (
        <div className="bg-white rounded-2xl border border-coffee-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-coffee-900">Privacy & Data</h3>
          <div className="flex justify-between items-center p-3 bg-coffee-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-coffee-900">Profile Visibility</p>
              <p className="text-xs text-charcoal/50">Your profile is visible to registered users</p>
            </div>
            <span className="text-xs bg-coffee-200 text-coffee-800 px-3 py-1 rounded-full">Community</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-coffee-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-coffee-900">Learning Progress</p>
              <p className="text-xs text-charcoal/50">Completed courses shown on your profile</p>
            </div>
            <span className="text-xs bg-coffee-200 text-coffee-800 px-3 py-1 rounded-full">Visible</span>
          </div>
          <p className="text-xs text-charcoal/40 leading-relaxed">
            Your account data is stored securely. Passwords are hashed with bcrypt. Authentication uses HTTP-only cookies. We never share your data with third parties.
          </p>
        </div>
      )}
    </div>
  );
}
