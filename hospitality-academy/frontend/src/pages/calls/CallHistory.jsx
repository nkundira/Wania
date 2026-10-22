import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api, { asArray } from '../../services/api';
import { Phone, PhoneMissed, Video } from 'lucide-react';

export default function CallHistory() {
  const { user } = useAuth();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/messages/calls/history').then(r => setCalls(asArray(r.data?.calls))).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const fmtDuration = (s) => {
    if (!s) return '0:00';
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const statusIcon = (status) => {
    if (status === 'missed') return <PhoneMissed className="w-4 h-4 text-red-500" />;
    if (status === 'completed') return <Phone className="w-4 h-4 text-green-600" />;
    if (status === 'declined') return <PhoneMissed className="w-4 h-4 text-red-400" />;
    return <Phone className="w-4 h-4 text-charcoal/40" />;
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-10 h-10 border-4 border-coffee-300 border-t-coffee-700 rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-coffee-900 mb-6">Call History</h1>

      {calls.length === 0 ? (
        <div className="bg-white rounded-2xl border border-coffee-100 p-12 text-center">
          <Phone className="w-12 h-12 text-coffee-300 mx-auto mb-4" />
          <p className="text-charcoal/50">No calls yet. Start a conversation and try calling!</p>
          <Link to="/messages" className="inline-block mt-4 text-coffee-700 font-semibold hover:underline">Go to Messages</Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-coffee-100 overflow-hidden divide-y divide-coffee-50">
          {calls.map(c => {
            const isCaller = c.caller_id === user?.id;
            const other = isCaller
              ? { name: c.callee_name, username: c.callee_username, picture: c.callee_picture }
              : { name: c.caller_name, username: c.caller_username, picture: c.caller_picture };
            return (
              <div key={c.id} className="flex items-center gap-4 p-4">
                <div className="relative">
                  {other.picture ? (
                    <img src={other.picture} alt="" className="w-11 h-11 rounded-full object-cover" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-coffee-200 text-coffee-800 flex items-center justify-center font-bold">{other.name?.[0]}</div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center border border-coffee-100">
                    {c.call_type === 'video' ? <Video className="w-3 h-3 text-coffee-600" /> : <Phone className="w-3 h-3 text-coffee-600" />}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-coffee-900">{other.name}</p>
                  <p className="text-xs text-charcoal/50 flex items-center gap-1">
                    {statusIcon(c.status)}
                    <span className="capitalize">{c.status}</span>
                    {c.duration_seconds > 0 && <span> · {fmtDuration(c.duration_seconds)}</span>}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-charcoal/40">{isCaller ? 'Outgoing' : 'Incoming'}</p>
                  <p className="text-xs text-charcoal/30">{new Date(c.created_at + 'Z').toLocaleDateString()}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
