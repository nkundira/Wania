import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api, { asArray } from '../../services/api';
import { Send, Phone, Video, Search, ArrowLeft, MessageCircle, X, Mic, MicOff, VideoOff, PhoneOff, Maximize2 } from 'lucide-react';

/* ============ CALL OVERLAY ============ */
function CallOverlay({ call, onEnd, incoming, onAccept, onReject }) {
  const { emit, on } = useSocket();
  const [state, setState] = useState(incoming ? 'ringing' : 'calling');
  const [duration, setDuration] = useState(0);
  const [localStream, setLocalStream] = useState(null);
  const [, setRemoteStream] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(call.callType === 'video');
  const [error, setError] = useState('');
  const [fullScreen, setFullScreen] = useState(false);
  const pcRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const timerRef = useRef(null);
  const callIdRef = useRef(call?.callId);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    if (localStream) { localStream.getTracks().forEach(t => t.stop()); }
    setLocalStream(null); setRemoteStream(null);
  }, [localStream]);

  // Get media on accept (incoming) or immediately (outgoing after accept)
  const startMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: call.callType === 'video' ? { width: 640, height: 480, facingMode: 'user' } : false
      });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Microphone/camera permission denied. Please allow access in your browser settings and try again.');
      } else {
        setError('Could not access microphone/camera: ' + err.message);
      }
      return null;
    }
  }, [call.callType]);

  // Handle accept of incoming call
  useEffect(() => {
    if (incoming && state === 'ringing') return;
    if (state === 'connected' && !localStream && !error) startMedia();
  }, [state, incoming, localStream, error, startMedia]);

  // Create peer connection when media is ready and we need to make the call
  const createPeerConnection = useCallback(async (stream) => {
    const turnUrl = import.meta.env.VITE_TURN_URL;
    const iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ];
    if (turnUrl) {
      iceServers.push({
        urls: turnUrl,
        username: import.meta.env.VITE_TURN_USER || '',
        credential: import.meta.env.VITE_TURN_PASS || ''
      });
    }
    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.onicecandidate = (e) => {
      if (e.candidate) emit('call:ice-candidate', { callId: callIdRef.current, candidate: e.candidate, targetUserId: incoming ? call.caller.id : call.calleeId });
    };
    pc.ontrack = (e) => {
      setRemoteStream(e.streams[0]);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
      setState('connected');
      if (!timerRef.current) {
        timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') { setError('Connection failed. Check your network or TURN server configuration.'); }
    };

    if (!incoming) {
      // Outgoing: create offer after accept
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      emit('call:offer', { callId: callIdRef.current, offer, targetUserId: call.calleeId });
    }
    return pc;
  }, [emit, incoming, call]);

  // Listen for signaling
  useEffect(() => {
    const offs = [];
    offs.push(on('call:offer', async ({ callId, offer }) => {
      const stream = localStream || await startMedia();
      if (!stream) return;
      const pc = await createPeerConnection(stream);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      emit('call:answer', { callId, answer, targetUserId: call.caller.id });
      setState('connected');
      if (!timerRef.current) timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    }));

    offs.push(on('call:answer', async ({ answer }) => {
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        setState('connected');
        if (!timerRef.current) timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      }
    }));

    offs.push(on('call:ice-candidate', async ({ candidate }) => {
      if (pcRef.current) {
        try { await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
      }
    }));

    offs.push(on('call:accepted', () => { setState('connecting'); }));

    offs.push(on('call:rejected', () => { setError('Call was declined'); setTimeout(() => { cleanup(); onEnd(); }, 1500); }));

    offs.push(on('call:ended', () => { cleanup(); onEnd(); }));

    offs.push(on('call:cancelled', () => { setError('Call cancelled'); setTimeout(() => { cleanup(); onEnd(); }, 1000); }));

    return () => offs.forEach(off => off && off());
  }, [on, emit, call, localStream, startMedia, createPeerConnection, cleanup, onEnd]);

  // Outgoing call: wait for accept then start media + peer connection
  useEffect(() => {
    if (incoming) return;
    if (state === 'calling' || state === 'connecting') {
      // Media will start when accepted
    }
    if (state === 'connected' && localStream && !pcRef.current) {
      createPeerConnection(localStream);
    }
  }, [state, incoming, localStream, createPeerConnection]);

  // Accept handler for incoming
  const handleAccept = async () => {
    emit('call:accept', { callId: callIdRef.current });
    setState('connecting');
    const stream = await startMedia();
    if (stream) {
      await createPeerConnection(stream);
    }
    onAccept?.();
  };

  const handleReject = () => {
    emit('call:reject', { callId: callIdRef.current, reason: 'rejected' });
    cleanup();
    onReject?.();
    onEnd();
  };

  const handleCancel = () => {
    emit('call:cancel', { callId: callIdRef.current });
    cleanup();
    onEnd();
  };

  const handleEnd = () => {
    emit('call:end', { callId: callIdRef.current });
    cleanup();
    onEnd();
  };

  const toggleAudio = () => {
    if (localStream) {
      const track = localStream.getAudioTracks()[0];
      if (track) { track.enabled = !track.enabled; setAudioEnabled(track.enabled); emit('call:media-state', { callId: callIdRef.current, audioEnabled: track.enabled, videoEnabled }); }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const track = localStream.getVideoTracks()[0];
      if (track) { track.enabled = !track.enabled; setVideoEnabled(track.enabled); emit('call:media-state', { callId: callIdRef.current, audioEnabled, videoEnabled: track.enabled }); }
    }
  };

  const fmtDuration = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const other = incoming ? call.caller : { id: call.calleeId, displayName: call.calleeName, username: call.calleeUsername, profilePicture: call.calleePicture };

  const stateLabels = { ringing: incoming ? 'Incoming call...' : 'Ringing...', connecting: 'Connecting...', connected: fmtDuration(duration), ended: 'Call ended' };

  return (
    <div className="fixed inset-0 bg-coffee-950/95 z-[100] flex items-center justify-center p-4">
      <div className={`bg-coffee-900 rounded-3xl overflow-hidden shadow-2xl w-full ${fullScreen ? 'max-w-none h-full rounded-none' : 'max-w-md'}`}>
        {/* Remote video */}
        {call.callType === 'video' && (
          <div className="relative bg-black" style={{ aspectRatio: fullScreen ? 'auto' : '16/10', minHeight: fullScreen ? '100vh' : 0 }}>
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            {/* Local preview */}
            {localStream && videoEnabled && (
              <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-4 right-4 w-32 h-24 object-cover rounded-xl border-2 border-white/30 bg-black" />
            )}
          </div>
        )}

        {/* Audio call / non-video interface */}
        {call.callType !== 'video' && (
          <div className="p-8 text-center">
            {other.profilePicture ? (
              <img src={other.profilePicture} alt="" className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border-4 border-coffee-700" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-coffee-700 text-white flex items-center justify-center text-3xl font-bold mx-auto mb-4">
                {other.displayName?.[0] || '?'}
              </div>
            )}
            <h2 className="text-white text-xl font-bold">{other.displayName}</h2>
            <p className={`text-sm mt-1 ${state === 'connected' ? 'text-green-400' : 'text-coffee-400'}`}>{stateLabels[state] || state}</p>
            {state === 'video' && localStream && videoEnabled && (
              <video ref={localVideoRef} autoPlay playsInline muted className="mt-4 w-32 h-24 object-cover rounded-xl mx-auto bg-black" />
            )}
          </div>
        )}

        {/* Video call header */}
        {call.callType === 'video' && (
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent z-10">
            <div>
              <p className="text-white font-semibold">{other.displayName}</p>
              <p className="text-xs text-white/70">{stateLabels[state]}</p>
            </div>
            <button onClick={() => setFullScreen(!fullScreen)} className="text-white/80 hover:text-white p-2"><Maximize2 className="w-5 h-5" /></button>
          </div>
        )}

        {error && (
          <div className="bg-red-900/60 text-red-200 text-sm px-4 py-3 m-4 rounded-xl flex items-start gap-2">
            <X className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
          </div>
        )}

        {/* Controls */}
        <div className="p-6 flex items-center justify-center gap-4">
          {state === 'ringing' && incoming ? (
            <>
              <button onClick={handleReject} className="w-14 h-14 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition shadow-lg"><PhoneOff className="w-6 h-6" /></button>
              <button onClick={handleAccept} className="w-14 h-14 rounded-full bg-green-600 text-white flex items-center justify-center hover:bg-green-700 transition shadow-lg animate-pulse">
                {call.callType === 'video' ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
              </button>
            </>
          ) : state === 'calling' ? (
            <>
              <button onClick={handleCancel} className="w-14 h-14 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition shadow-lg"><PhoneOff className="w-6 h-6" /></button>
              <p className="text-coffee-400 text-sm">Calling...</p>
            </>
          ) : (
            <>
              <button onClick={toggleAudio} className={`w-12 h-12 rounded-full flex items-center justify-center transition ${audioEnabled ? 'bg-coffee-700 text-white' : 'bg-red-600 text-white'}`}>
                {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
              {call.callType === 'video' && (
                <button onClick={toggleVideo} className={`w-12 h-12 rounded-full flex items-center justify-center transition ${videoEnabled ? 'bg-coffee-700 text-white' : 'bg-red-600 text-white'}`}>
                  {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>
              )}
              <button onClick={handleEnd} className="w-14 h-14 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition shadow-lg"><PhoneOff className="w-6 h-6" /></button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============ INCOMING CALL TOAST ============ */
function IncomingCallToast({ call, onAccept, onReject }) {
  return (
    <div className="fixed top-20 right-4 z-[110] bg-white rounded-2xl shadow-2xl border border-coffee-200 p-4 w-80 animate-in">
      <div className="flex items-center gap-3 mb-3">
        {call.caller.profilePicture ? (
          <img src={call.caller.profilePicture} alt="" className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-coffee-200 text-coffee-800 flex items-center justify-center font-bold">{call.caller.displayName?.[0]}</div>
        )}
        <div>
          <p className="font-semibold text-coffee-900 text-sm">{call.caller.displayName}</p>
          <p className="text-xs text-charcoal/50 flex items-center gap-1">
            {call.callType === 'video' ? <Video className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
            Incoming {call.callType} call
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onReject} className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 flex items-center justify-center gap-1.5"><PhoneOff className="w-4 h-4" /> Decline</button>
        <button onClick={onAccept} className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 flex items-center justify-center gap-1.5"><Phone className="w-4 h-4" /> Accept</button>
      </div>
    </div>
  );
}

/* ============ CONVERSATION LIST ============ */
function ConversationList({ conversations, activeId, onSelect, onNew }) {
  const { onlineUserIds } = useSocket();
  const [search, setSearch] = useState('');
  const filtered = conversations.filter(c =>
    !search || c.other_name?.toLowerCase().includes(search.toLowerCase()) || c.other_username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white border-r border-coffee-100 flex flex-col h-full">
      <div className="p-4 border-b border-coffee-100">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-lg text-coffee-900">Messages</h2>
          <button onClick={onNew} className="text-coffee-700 text-sm font-semibold hover:text-coffee-900">New</button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/40" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations..." className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-coffee-50 border border-coffee-100 text-sm focus:border-coffee-300 outline-none" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-10 px-4">
            <MessageCircle className="w-10 h-10 text-coffee-300 mx-auto mb-3" />
            <p className="text-sm text-charcoal/50">No conversations yet</p>
            <p className="text-xs text-charcoal/30 mt-1">Start a conversation from a user's profile</p>
          </div>
        ) : (
          filtered.map(c => (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-coffee-50 transition border-b border-coffee-50 ${activeId === c.id ? 'bg-coffee-50' : ''}`}
            >
              <div className="relative flex-shrink-0">
                {c.other_picture ? (
                  <img src={c.other_picture} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-coffee-200 text-coffee-800 flex items-center justify-center font-bold">{c.other_name?.[0]}</div>
                )}
                {onlineUserIds.includes(c.other_id) && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <p className="font-semibold text-sm text-coffee-900 truncate">{c.other_name || 'Community Room'}</p>
                  {c.unread_count > 0 && <span className="bg-coffee-700 text-white text-xs rounded-full px-2 py-0.5 ml-2">{c.unread_count}</span>}
                </div>
                <p className="text-xs text-charcoal/50 truncate">{c.last_message || 'No messages yet'}</p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/* ============ CHAT WINDOW ============ */
function ChatWindow({ conversation, onBack, onCall }) {
  const { user } = useAuth();
  const { emit, on, joinRoom, leaveRoom, onlineUserIds } = useSocket();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(null);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);
  const convId = conversation.id;

  useEffect(() => {
    setLoading(true);
    joinRoom(convId);
    api.get(`/messages/conversations/${convId}/messages`).then(r => setMessages(asArray(r.data?.messages))).catch(() => {}).finally(() => setLoading(false));

    const offMsg = on('chat:message', (msg) => {
      if (msg.conversation_id === convId) {
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
      }
    });
    const offTyping = on('chat:typing', ({ conversationId, isTyping, username }) => {
      if (conversationId === convId) {
        setTyping(isTyping ? username : null);
        if (isTyping) setTimeout(() => setTyping(null), 3000);
      }
    });

    return () => { leaveRoom(convId); offMsg?.(); offTyping?.(); };
  }, [convId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');
    emit('chat:message', { conversationId: convId, content: text }, (ack) => {
      if (ack?.error) { setInput(text); return; }
      if (ack?.message) setMessages(prev => prev.some(m => m.id === ack.message.id) ? prev : [...prev, ack.message]);
    });
  };

  const handleTyping = (val) => {
    setInput(val);
    emit('chat:typing', { conversationId: convId, isTyping: true });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => emit('chat:typing', { conversationId: convId, isTyping: false }), 2000);
  };

  const fmtTime = (d) => {
    try { return new Date(d + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
  };

  const isOnline = onlineUserIds.includes(conversation.other_id);

  return (
    <div className="flex flex-col h-full bg-coffee-50">
      {/* Header */}
      <div className="bg-white border-b border-coffee-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="md:hidden p-1"><ArrowLeft className="w-5 h-5" /></button>
          {conversation.other_picture ? (
            <img src={conversation.other_picture} alt="" className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-coffee-200 text-coffee-800 flex items-center justify-center font-bold text-sm">{conversation.other_name?.[0]}</div>
          )}
          <div>
            <p className="font-semibold text-sm text-coffee-900">{conversation.other_name || 'Community Room'}</p>
            <p className="text-xs text-charcoal/40">{isOnline ? 'Online' : 'Offline'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {conversation.other_id && (
            <>
              <button onClick={() => onCall('audio')} className="p-2.5 rounded-xl hover:bg-coffee-50 text-coffee-700"><Phone className="w-5 h-5" /></button>
              <button onClick={() => onCall('video')} className="p-2.5 rounded-xl hover:bg-coffee-50 text-coffee-700"><Video className="w-5 h-5" /></button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-coffee-300 border-t-coffee-700 rounded-full animate-spin" /></div>
        ) : messages.length === 0 ? (
          <div className="text-center py-10">
            <MessageCircle className="w-10 h-10 text-coffee-300 mx-auto mb-3" />
            <p className="text-sm text-charcoal/50">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map(m => {
            const isMine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMine ? 'bg-coffee-700 text-white rounded-br-md' : 'bg-white text-charcoal/80 border border-coffee-100 rounded-bl-md'}`}>
                  {!isMine && <p className="text-xs font-semibold text-coffee-700 mb-0.5">{m.sender_name}</p>}
                  <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                  <p className={`text-[10px] mt-1 ${isMine ? 'text-coffee-300' : 'text-charcoal/30'}`}>{fmtTime(m.created_at)}</p>
                </div>
              </div>
            );
          })
        )}
        {typing && <p className="text-xs text-charcoal/40 italic px-2">{typing} is typing...</p>}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} className="bg-white border-t border-coffee-100 p-3 flex gap-2">
        <input
          value={input}
          onChange={e => handleTyping(e.target.value)}
          placeholder="Type a message..."
          maxLength={5000}
          className="flex-1 px-4 py-2.5 rounded-xl bg-coffee-50 border border-coffee-100 focus:border-coffee-300 outline-none text-sm"
        />
        <button type="submit" disabled={!input.trim()} className="bg-coffee-700 text-white px-4 py-2.5 rounded-xl hover:bg-coffee-800 disabled:opacity-40 transition">
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}

/* ============ MAIN MESSAGES PAGE ============ */
export default function Messages() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { emit, on } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [, setCallType] = useState(null);

  const loadConversations = useCallback(() => {
    api.get('/messages/conversations').then(r => setConversations(asArray(r.data?.conversations))).catch(() => {});
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Select conversation from URL
  useEffect(() => {
    if (conversationId && conversations.length) {
      const c = conversations.find(x => x.id === parseInt(conversationId));
      if (c) setActiveConv(c);
    }
  }, [conversationId, conversations]);

  // Listen for incoming calls
  useEffect(() => {
    const offIncoming = on('call:incoming', (data) => setIncomingCall(data));
    return () => offIncoming?.();
  }, [on]);

  // Search users for new chat
  useEffect(() => {
    if (userSearch.length >= 2) {
      api.get(`/community/users/search?q=${encodeURIComponent(userSearch)}`).then(r => setUsers(asArray(r.data?.users))).catch(() => {});
    } else setUsers([]);
  }, [userSearch]);

  const startChat = async (userId) => {
    try {
      const { data } = await api.post('/messages/conversations', { userId });
      setShowNewChat(false);
      loadConversations();
      const conv = conversations.find(c => c.id === data.conversationId);
      if (conv) { setActiveConv(conv); navigate(`/messages/${conv.id}`); }
      else setTimeout(() => { loadConversations(); }, 500);
    } catch {}
  };

  const startCall = (type) => {
    if (!activeConv?.other_id) return;
    setCallType(type);
    emit('call:initiate', { calleeId: activeConv.other_id, callType: type }, (ack) => {
      if (ack?.error) { alert(ack.error); return; }
      setActiveCall({
        callId: ack.callId,
        calleeId: activeConv.other_id,
        calleeName: activeConv.other_name,
        calleeUsername: activeConv.other_username,
        calleePicture: activeConv.other_picture,
        callType: type
      });
    });
  };

  const acceptIncoming = () => {
    if (!incomingCall) return;
    setCallType(incomingCall.callType);
    setActiveCall({
      callId: incomingCall.callId,
      caller: incomingCall.caller,
      callType: incomingCall.callType
    });
    setIncomingCall(null);
  };

  const rejectIncoming = () => setIncomingCall(null);

  return (
    <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)] max-w-6xl mx-auto md:px-4 md:py-4">
      <div className="h-full md:h-full bg-white md:rounded-2xl md:border md:border-coffee-100 md:shadow-sm overflow-hidden flex">
        {/* Sidebar */}
        <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 ${activeConv ? 'hidden md:flex' : 'flex'} flex-col h-full`}>
          <ConversationList
            conversations={conversations}
            activeId={activeConv?.id}
            onSelect={(c) => { setActiveConv(c); navigate(`/messages/${c.id}`); }}
            onNew={() => setShowNewChat(true)}
          />
        </div>

        {/* Chat area */}
        <div className={`flex-1 ${activeConv ? 'flex' : 'hidden md:flex'} flex-col h-full`}>
          {activeConv ? (
            <ChatWindow
              conversation={activeConv}
              onBack={() => { setActiveConv(null); navigate('/messages'); }}
              onCall={startCall}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-coffee-50">
              <div className="text-center">
                <MessageCircle className="w-14 h-14 text-coffee-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-coffee-900 mb-1">Select a conversation</h3>
                <p className="text-sm text-charcoal/50">Choose a conversation or start a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New chat modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowNewChat(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-coffee-900">New Conversation</h3>
              <button onClick={() => setShowNewChat(false)}><X className="w-5 h-5 text-charcoal/40" /></button>
            </div>
            <input
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              placeholder="Search by name or username..."
              className="w-full px-4 py-3 rounded-xl border border-coffee-200 focus:border-coffee-500 outline-none text-sm mb-3"
            />
            <div className="max-h-64 overflow-y-auto space-y-1">
              {users.map(u => (
                <button key={u.id} onClick={() => startChat(u.id)} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-coffee-50 text-left">
                  <div className="w-9 h-9 rounded-full bg-coffee-200 text-coffee-800 flex items-center justify-center font-bold text-sm">{u.display_name?.[0]}</div>
                  <div>
                    <p className="text-sm font-medium text-coffee-900">{u.display_name}</p>
                    <p className="text-xs text-charcoal/40">@{u.username}</p>
                  </div>
                </button>
              ))}
              {userSearch.length >= 2 && users.length === 0 && (
                <p className="text-sm text-charcoal/40 text-center py-4">No users found</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Incoming call toast */}
      {incomingCall && !activeCall && (
        <IncomingCallToast call={incomingCall} onAccept={acceptIncoming} onReject={rejectIncoming} />
      )}

      {/* Active call overlay */}
      {activeCall && (
        <CallOverlay
          call={activeCall}
          incoming={!!activeCall.caller}
          onEnd={() => { setActiveCall(null); loadConversations(); }}
          onAccept={() => {}}
          onReject={() => setActiveCall(null)}
        />
      )}
    </div>
  );
}
