import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api, { asArray } from '../../services/api';
import { Heart, MessageCircle, Calendar, Award, UserPlus, UserCheck, MessageSquare, Camera, Edit3 } from 'lucide-react';

export default function Profile() {
  const { username } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  const targetUsername = username || user?.username;

  useEffect(() => {
    if (!targetUsername) return;
    setLoading(true);
    setPosts([]);
    api.get(`/community/users/${targetUsername}/profile`).then(r => setProfile(r.data?.profile || null)).catch(() => setProfile(null)).finally(() => setLoading(false));
  }, [targetUsername]);

  useEffect(() => {
    if (!profile?.id) return;
    api.get(`/community/posts?userId=${profile.id}&limit=50`).then(r => setPosts(asArray(r.data?.posts))).catch(() => {});
  }, [profile?.id]);

  const toggleFollow = async () => {
    if (!user) { navigate('/login'); return; }
    setFollowLoading(true);
    try {
      const { data } = await api.post(`/community/users/${profile.id}/follow`);
      setProfile(p => ({ ...p, following: data.following, followerCount: p.followerCount + (data.following ? 1 : -1) }));
    } catch {}
    setFollowLoading(false);
  };

  const startConversation = async () => {
    if (!user) { navigate('/login'); return; }
    try {
      const { data } = await api.post('/messages/conversations', { userId: profile.id });
      navigate(`/messages/${data.conversationId}`);
    } catch {}
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-10 h-10 border-4 border-coffee-300 border-t-coffee-700 rounded-full animate-spin" /></div>;
  if (!profile) return <div className="text-center py-20"><p className="text-charcoal/50">User not found</p></div>;

  const isMe = profile.isMe;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-coffee-100 shadow-sm overflow-hidden mb-6">
        <div className="h-32" style={{ background: 'linear-gradient(135deg, #2e2116, #7d5d3c)' }} />
        <div className="px-6 pb-6 -mt-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className="relative">
                {profile.profilePicture ? (
                  <img src={profile.profilePicture} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-coffee-200 text-coffee-800 flex items-center justify-center text-3xl font-bold border-4 border-white shadow">
                    {profile.displayName?.[0]}
                  </div>
                )}
                {isMe && (
                  <Link to="/profile/edit" className="absolute bottom-1 right-1 w-8 h-8 bg-coffee-700 text-white rounded-full flex items-center justify-center hover:bg-coffee-800 shadow">
                    <Camera className="w-4 h-4" />
                  </Link>
                )}
              </div>
              <div className="mb-1">
                <h1 className="text-xl font-bold text-coffee-900">{profile.displayName}</h1>
                <p className="text-charcoal/50 text-sm">@{profile.username}</p>
              </div>
            </div>
            <div className="flex gap-2 mb-1">
              {isMe ? (
                <Link to="/profile/edit" className="border border-coffee-300 text-coffee-700 px-5 py-2 rounded-xl text-sm font-semibold hover:border-coffee-500 flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4" /> Edit Profile
                </Link>
              ) : (
                <>
                  <button onClick={toggleFollow} disabled={followLoading} className={`px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition ${profile.isFollowing ? 'border border-coffee-300 text-coffee-700 hover:border-coffee-500' : 'bg-coffee-700 text-white hover:bg-coffee-800'}`}>
                    {profile.isFollowing ? <><UserCheck className="w-4 h-4" /> Following</> : <><UserPlus className="w-4 h-4" /> Follow</>}
                  </button>
                  <button onClick={startConversation} className="border border-coffee-300 text-coffee-700 px-4 py-2 rounded-xl text-sm font-semibold hover:border-coffee-500 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4" /> Message
                  </button>
                </>
              )}
            </div>
          </div>

          {profile.bio && <p className="text-charcoal/70 text-sm mt-4 leading-relaxed">{profile.bio}</p>}
          {profile.interests && (
            <div className="flex flex-wrap gap-2 mt-3">
              {profile.interests.split(',').map((i, idx) => (
                <span key={idx} className="bg-coffee-100 text-coffee-800 text-xs px-3 py-1 rounded-full">{i.trim()}</span>
              ))}
            </div>
          )}

          <div className="flex gap-6 mt-4 text-sm">
            <div><span className="font-bold text-coffee-900">{profile.postCount}</span> <span className="text-charcoal/50">posts</span></div>
            <div><span className="font-bold text-coffee-900">{profile.followerCount}</span> <span className="text-charcoal/50">followers</span></div>
            <div><span className="font-bold text-coffee-900">{profile.followingCount}</span> <span className="text-charcoal/50">following</span></div>
            {profile.isOnline ? <span className="text-green-600 font-medium flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full" /> Online</span> : null}
          </div>

          {profile.completedCourses?.length > 0 && (
            <div className="mt-4 p-3 bg-gold/10 border border-gold/30 rounded-xl">
              <p className="text-xs font-semibold text-gold-dark flex items-center gap-1 mb-1"><Award className="w-3.5 h-3.5" /> Completed Courses</p>
              <div className="flex flex-wrap gap-2">
                {profile.completedCourses.map((c, i) => (
                  <span key={i} className="text-xs bg-white px-2.5 py-1 rounded-full border border-gold/30 text-coffee-800">{c.title}</span>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-charcoal/30 mt-3 flex items-center gap-1"><Calendar className="w-3 h-3" /> Joined {new Date(profile.createdAt + 'Z').toLocaleDateString()}</p>
        </div>
      </div>

      {/* Posts */}
      <h2 className="font-bold text-coffee-900 mb-4">Posts</h2>
      {posts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-coffee-100 p-10 text-center">
          <MessageCircle className="w-10 h-10 text-coffee-300 mx-auto mb-3" />
          <p className="text-charcoal/50 text-sm">No posts yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-coffee-100 p-4 shadow-sm">
              <p className="text-xs text-charcoal/40 mb-2">{new Date(p.created_at + 'Z').toLocaleString()}</p>
              <p className="text-charcoal/80 text-sm whitespace-pre-wrap">{p.content}</p>
              {p.image_url && <img src={p.image_url} alt="" className="mt-3 rounded-xl max-h-72 object-cover w-full" />}
              <div className="flex gap-4 mt-3 pt-3 border-t border-coffee-50 text-xs text-charcoal/50">
                <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {p.like_count}</span>
                <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> {p.comment_count}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
