import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Bell, Heart, MessageCircle, UserPlus, Phone, Award, CheckCheck } from 'lucide-react';

const iconMap = { like: Heart, comment: MessageCircle, follow: UserPlus, call: Phone, quiz: Award, message: MessageCircle, system: Bell };

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/community/notifications').then(r => {
      setNotifications(r.data.notifications);
      setUnread(r.data.unreadCount);
    }).finally(() => setLoading(false));
  }, []);

  const markAllRead = async () => {
    try { await api.post('/community/notifications/read'); setUnread(0); } catch {}
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-10 h-10 border-4 border-coffee-300 border-t-coffee-700 rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-coffee-900">Notifications</h1>
          {unread > 0 && <span className="bg-coffee-700 text-white text-xs font-bold px-2.5 py-1 rounded-full">{unread}</span>}
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="text-coffee-700 text-sm font-medium hover:text-coffee-900 flex items-center gap-1.5">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-coffee-100 p-12 text-center">
          <Bell className="w-12 h-12 text-coffee-300 mx-auto mb-4" />
          <p className="text-charcoal/50">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const Icon = iconMap[n.type] || Bell;
            return (
              <Link key={n.id} to={n.link || '#'} className={`bg-white rounded-xl border p-4 flex items-start gap-3 hover:shadow-sm transition ${!n.is_read ? 'border-coffee-300 bg-gold/5' : 'border-coffee-100'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${!n.is_read ? 'bg-coffee-700 text-white' : 'bg-coffee-100 text-coffee-700'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-coffee-900">{n.title}</p>
                  <p className="text-sm text-charcoal/60">{n.body}</p>
                  <p className="text-xs text-charcoal/30 mt-1">{new Date(n.created_at + 'Z').toLocaleString()}</p>
                </div>
                {!n.is_read && <span className="w-2.5 h-2.5 bg-gold rounded-full flex-shrink-0 mt-2" />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
