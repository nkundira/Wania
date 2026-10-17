import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Heart, MessageCircle, Send, MoreHorizontal, Trash2, Search, Users, ImagePlus, AlertTriangle } from 'lucide-react';

function PostCard({ post, onDelete }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(!!post.liked_by_me);
  const [likes, setLikes] = useState(parseInt(post.like_count) || 0);
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [reporting, setReporting] = useState(false);

  const timeAgo = (d) => {
    const diff = Date.now() - new Date(d + 'Z').getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'now';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  const toggleLike = async () => {
    if (!user) return;
    try {
      const { data } = await api.post(`/community/posts/${post.id}/like`);
      setLiked(data.liked);
      setLikes(l => data.liked ? l + 1 : l - 1);
    } catch {}
  };

  const loadComments = async () => {
    if (showComments) { setShowComments(false); return; }
    try {
      const { data } = await api.get(`/community/posts/${post.id}/comments`);
      setComments(data.comments);
      setShowComments(true);
    } catch {}
  };

  const addComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const { data } = await api.post(`/community/posts/${post.id}/comments`, { content: newComment });
      setComments([...comments, data.comment]);
      setNewComment('');
    } catch {}
  };

  const deletePost = async () => {
    try { await api.delete(`/community/posts/${post.id}`); onDelete(post.id); } catch {}
    setShowMenu(false);
  };

  const reportPost = async () => {
    try { await api.post('/community/reports', { postId: post.id, reason: 'Inappropriate content' }); setReporting(false); setShowMenu(false); } catch {}
  };

  return (
    <div className="bg-white rounded-2xl border border-coffee-100 shadow-sm mb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <Link to={`/profile/${post.username}`} className="flex items-center gap-3">
          {post.profile_picture ? (
            <img src={post.profile_picture} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-coffee-200 text-coffee-800 flex items-center justify-center font-bold text-sm">
              {post.display_name?.[0] || 'U'}
            </div>
          )}
          <div>
            <p className="font-semibold text-sm text-coffee-900">{post.display_name}</p>
            <p className="text-xs text-charcoal/40">@{post.username} · {timeAgo(post.created_at)}</p>
          </div>
        </Link>
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 hover:bg-coffee-50 rounded-lg"><MoreHorizontal className="w-5 h-5 text-charcoal/40" /></button>
          {showMenu && (
            <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-coffee-100 py-1 z-20">
              {user?.id === post.user_id && (
                <button onClick={deletePost} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete post</button>
              )}
              <button onClick={() => { setReporting(true); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm text-charcoal/70 hover:bg-coffee-50 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Report</button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {post.content && <p className="px-4 pb-3 text-charcoal/80 leading-relaxed whitespace-pre-wrap text-sm">{post.content}</p>}
      {post.image_url && <img src={post.image_url} alt="" className="w-full max-h-96 object-cover" />}
      {post.is_sample == 1 && <p className="px-4 pb-1 text-xs text-charcoal/30 italic">Sample content</p>}

      {/* Actions */}
      <div className="flex items-center gap-4 px-4 py-3 border-t border-coffee-50">
        <button onClick={toggleLike} className={`flex items-center gap-1.5 text-sm font-medium transition ${liked ? 'text-red-500' : 'text-charcoal/50 hover:text-red-500'}`}>
          <Heart className={`w-5 h-5 ${liked ? 'fill-red-500' : ''}`} /> {likes}
        </button>
        <button onClick={loadComments} className="flex items-center gap-1.5 text-sm font-medium text-charcoal/50 hover:text-coffee-700 transition">
          <MessageCircle className="w-5 h-5" /> {post.comment_count}
        </button>
        <button className="flex items-center gap-1.5 text-sm font-medium text-charcoal/50 hover:text-coffee-700 transition">
          <Send className="w-5 h-5" />
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="border-t border-coffee-100 px-4 py-3">
          {comments.length === 0 ? (
            <p className="text-sm text-charcoal/40 text-center py-2">No comments yet. Be the first!</p>
          ) : (
            <div className="space-y-3 mb-3">
              {comments.map(c => (
                <div key={c.id} className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-coffee-200 text-coffee-800 flex items-center justify-center font-bold text-xs flex-shrink-0">{c.display_name?.[0]}</div>
                  <div className="flex-1 bg-coffee-50 rounded-xl px-3 py-2">
                    <p className="text-xs font-semibold text-coffee-900">{c.display_name}</p>
                    <p className="text-sm text-charcoal/70">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={addComment} className="flex gap-2">
            <input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Write a comment..." className="flex-1 px-3.5 py-2 rounded-xl border border-coffee-200 focus:border-coffee-500 outline-none text-sm" />
            <button type="submit" disabled={!newComment.trim()} className="bg-coffee-700 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-coffee-800 disabled:opacity-40">Post</button>
          </form>
        </div>
      )}

      {/* Report modal */}
      {reporting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-coffee-900 mb-3">Report Post</h3>
            <p className="text-sm text-charcoal/60 mb-4">This post will be reviewed by a moderator.</p>
            <div className="flex gap-3">
              <button onClick={() => setReporting(false)} className="flex-1 border border-coffee-200 py-2.5 rounded-xl text-sm font-medium">Cancel</button>
              <button onClick={reportPost} className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold">Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StoriesRow() {
  const [updates, setUpdates] = useState([]);
  useEffect(() => {
    api.get('/community/posts?limit=6').then(r => setUpdates(r.data.posts)).catch(() => {});
  }, []);
  return (
    <div className="bg-white rounded-2xl border border-coffee-100 p-4 mb-4 shadow-sm">
      <p className="text-xs font-semibold text-charcoal/40 uppercase tracking-wider mb-3">Community Updates</p>
      <div className="flex gap-4 overflow-x-auto pb-1">
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
          <div className="w-16 h-16 rounded-full bg-coffee-100 border-2 border-dashed border-coffee-300 flex items-center justify-center">
            <ImagePlus className="w-6 h-6 text-coffee-400" />
          </div>
          <span className="text-xs text-charcoal/50">Your update</span>
        </div>
        {updates.map(p => (
          <Link key={p.id} to="/community" className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-gold to-coffee-500">
              {p.profile_picture ? (
                <img src={p.profile_picture} alt="" className="w-full h-full rounded-full object-cover border-2 border-white" />
              ) : (
                <div className="w-full h-full rounded-full bg-coffee-200 text-coffee-800 flex items-center justify-center font-bold text-lg border-2 border-white">{p.display_name?.[0]}</div>
              )}
            </div>
            <span className="text-xs text-charcoal/60 max-w-[60px] truncate">{p.username}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function SuggestedUsers({ refresh }) {
  const [users, setUsers] = useState([]);
  useEffect(() => { api.get('/community/users/suggested').then(r => setUsers(r.data.users)).catch(() => {}); }, [refresh]);
  if (!users.length) return null;
  return (
    <div className="bg-white rounded-2xl border border-coffee-100 p-4 shadow-sm">
      <p className="text-xs font-semibold text-charcoal/40 uppercase tracking-wider mb-3">Suggested for you</p>
      <div className="space-y-3">
        {users.map(u => (
          <Link key={u.id} to={`/profile/${u.username}`} className="flex items-center gap-3 hover:bg-coffee-50 rounded-lg p-1 -m-1 transition">
            {u.profile_picture ? (
              <img src={u.profile_picture} alt="" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-coffee-200 text-coffee-800 flex items-center justify-center font-bold text-xs">{u.display_name?.[0]}</div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-coffee-900 truncate">{u.display_name}</p>
              <p className="text-xs text-charcoal/40 truncate">@{u.username}</p>
            </div>
            {u.is_online ? <span className="w-2 h-2 rounded-full bg-green-500" /> : null}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Community() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [refreshSuggested] = useState(0);

  const loadPosts = useCallback(() => {
    api.get('/community/posts?limit=30').then(r => setPosts(r.data.posts)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  useEffect(() => {
    if (search.length >= 2) {
      api.get(`/community/users/search?q=${encodeURIComponent(search)}`).then(r => setSearchResults(r.data.users)).catch(() => {});
    } else setSearchResults([]);
  }, [search]);

  const createPost = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);
    try {
      const { data } = await api.post('/community/posts', { content });
      setPosts([data.post, ...posts]);
      setContent('');
    } catch {}
    setPosting(false);
  };

  const deletePost = (id) => setPosts(posts.filter(p => p.id !== id));

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="grid md:grid-cols-3 gap-6">
        {/* Main feed */}
        <div className="md:col-span-2">
          <h1 className="text-2xl font-bold text-coffee-900 mb-4">Community</h1>

          {/* Create post */}
          <form onSubmit={createPost} className="bg-white rounded-2xl border border-coffee-100 p-4 mb-4 shadow-sm">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-coffee-200 text-coffee-800 flex items-center justify-center font-bold text-sm flex-shrink-0">{user?.displayName?.[0]}</div>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Share something with the community..."
                rows={2}
                maxLength={5000}
                className="flex-1 resize-none border-none outline-none text-sm placeholder:text-charcoal/40 bg-transparent"
              />
            </div>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-coffee-50">
              <span className="text-xs text-charcoal/30">{content.length}/5000</span>
              <button type="submit" disabled={!content.trim() || posting} className="bg-coffee-700 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-coffee-800 disabled:opacity-40">
                {posting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>

          <StoriesRow />

          {/* Posts */}
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-coffee-300 border-t-coffee-700 rounded-full animate-spin" /></div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-coffee-100">
              <Users className="w-10 h-10 text-coffee-300 mx-auto mb-3" />
              <p className="text-charcoal/50">No posts yet. Be the first to share!</p>
            </div>
          ) : (
            posts.map(p => <PostCard key={p.id} post={p} onDelete={deletePost} />)
          )}
        </div>

        {/* Sidebar */}
        <div className="hidden md:block space-y-4">
          {/* Search */}
          <div className="bg-white rounded-2xl border border-coffee-100 p-4 shadow-sm relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/40" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search people..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-coffee-50 border border-coffee-100 text-sm focus:border-coffee-300 outline-none"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-coffee-100 p-2 z-20">
                {searchResults.map(u => (
                  <Link key={u.id} to={`/profile/${u.username}`} onClick={() => setSearch('')} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-coffee-50">
                    <div className="w-8 h-8 rounded-full bg-coffee-200 text-coffee-800 flex items-center justify-center font-bold text-xs">{u.display_name?.[0]}</div>
                    <div>
                      <p className="text-sm font-medium text-coffee-900">{u.display_name}</p>
                      <p className="text-xs text-charcoal/40">@{u.username}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <SuggestedUsers refresh={refreshSuggested} />

          <div className="bg-coffee-50 rounded-2xl p-4 border border-coffee-100">
            <p className="text-xs text-charcoal/50 leading-relaxed">Welcome to the Hospitality Academy community! Share your learning journey, ask questions, and connect with fellow students.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
