import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { ArrowLeft, Save, Camera, AlertCircle, CheckCircle } from 'lucide-react';

export default function EditProfile() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ displayName: '', bio: '', interests: '', profilePicture: '' });
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) setForm({ displayName: user.displayName || '', bio: user.bio || '', interests: user.interests || '', profilePicture: user.profilePicture || '' });
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const { data } = await api.put('/auth/profile', form);
      updateUser(data.user);
      setMsg({ type: 'success', text: 'Profile updated!' });
      setTimeout(() => navigate(`/profile/${data.user.username}`), 800);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Failed to update' });
    }
    setLoading(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setMsg({ type: 'error', text: 'Image must be under 5MB' }); return; }
    setUploading(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const { data } = await api.post('/uploads', fd);
      setForm(f => ({ ...f, profilePicture: data.url }));
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Image upload failed' });
    }
    setUploading(false);
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-coffee-700 font-medium text-sm mb-6 hover:text-coffee-900">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <h1 className="text-2xl font-bold text-coffee-900 mb-6">Edit Profile</h1>

      {msg && (
        <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl mb-4 ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />} {msg.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-coffee-100 p-6 shadow-sm space-y-5">
        {/* Profile picture */}
        <div className="flex items-center gap-4">
          {form.profilePicture ? (
            <img src={form.profilePicture} alt="" className="w-20 h-20 rounded-full object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-coffee-200 text-coffee-800 flex items-center justify-center text-2xl font-bold">{form.displayName?.[0] || 'U'}</div>
          )}
          <div>
            <label className={`px-4 py-2 rounded-xl text-sm font-medium inline-flex items-center gap-1.5 ${uploading ? 'bg-coffee-100 text-coffee-400 cursor-wait' : 'bg-coffee-100 text-coffee-800 cursor-pointer hover:bg-coffee-200'}`}>
              <Camera className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Change Photo'}
              <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="hidden" />
            </label>
            <p className="text-xs text-charcoal/40 mt-1">JPG or PNG, max 5MB</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-coffee-900 mb-1.5">Display Name</label>
          <input required maxLength={100} value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-coffee-200 focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200 outline-none text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium text-coffee-900 mb-1.5">Bio</label>
          <textarea rows={3} maxLength={500} value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-coffee-200 focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200 outline-none text-sm resize-none" placeholder="Tell others about yourself..." />
          <p className="text-xs text-charcoal/30 mt-1">{form.bio.length}/500</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-coffee-900 mb-1.5">Learning Interests</label>
          <input maxLength={500} value={form.interests} onChange={e => setForm({ ...form, interests: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-coffee-200 focus:border-coffee-500 focus:ring-2 focus:ring-coffee-200 outline-none text-sm" placeholder="Coffee, Hotel Management, Event Planning..." />
          <p className="text-xs text-charcoal/30 mt-1">Comma-separated</p>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-coffee-700 text-white py-3.5 rounded-xl font-semibold hover:bg-coffee-800 transition disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
        </button>
      </form>
    </div>
  );
}
