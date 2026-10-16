import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Users, 
  MessageSquare, 
  Sparkles, 
  Vote as VoteIcon, 
  HelpCircle, 
  Copy, 
  Check, 
  LogOut, 
  Clock, 
  Send, 
  Layers, 
  Crown
} from 'lucide-react';
import { getSocket } from '../services/socket';
import { askAiCoPilot, getSceneTrivia, getPartyVotes } from '../services/api';

function formatTimestamp(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

const EMOJI_REACTIONS = ['❤️', '🔥', '👏', '🍿', '😱', '😂'];

export function WatchPartyRoom({ party, user, onLeaveParty }) {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'ai' | 'trivia' | 'voting' | 'participants'
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [copiedCode, setCopiedCode] = useState(false);

  // Participants roster
  const [participants, setParticipants] = useState(party.participants || []);
  const [participantNotification, setParticipantNotification] = useState(null);

  // Floating reactions overlay
  const [reactions, setReactions] = useState([]);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  // AI Co-Pilot state
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  // Trivia state
  const [triviaData, setTriviaData] = useState(null);
  const [triviaLoading, setTriviaLoading] = useState(false);
  const [triviaError, setTriviaError] = useState(null);

  // Voting state
  const [votesData, setVotesData] = useState({});
  const [userVotedOptions, setUserVotedOptions] = useState({});

  // Video and Socket refs
  const videoRef = useRef(null);
  const isRemoteSyncRef = useRef(false);
  const chatScrollRef = useRef(null);

  const content = party.contentId || {};

  // Host determination
  const isHost = party.partyId === 'solo-space' ||
    party.partyId?.startsWith('solo-') ||
    party.hostId === user?.id ||
    party.hostId?._id === user?.id ||
    party.hostId === user?._id ||
    (party.participants && party.participants.some(p => (p.userId === user?.id || p.userId === user?._id) && p.role === 'host'));

  // Active scene detection grounded in playback timeline (gap-safe to prevent snapping back to Scene 1)
  const scenes = content.scenes || [];
  let activeScene = scenes.find(
    (s) => currentTime >= s.startTime && currentTime <= s.endTime
  );
  if (!activeScene && scenes.length > 0) {
    activeScene = scenes.filter((s) => s.startTime <= currentTime).pop() ||
      scenes.reduce((prev, curr) =>
        Math.abs(curr.startTime - currentTime) < Math.abs(prev.startTime - currentTime) ? curr : prev
      );
  }

  // Socket setup and real-time event listeners
  useEffect(() => {
    const socket = getSocket();

    socket.emit('party:join', {
      partyId: party.partyId,
      user: { id: user?.id, name: user?.name, avatar: user?.avatar },
    });

    // Initial state upon joining
    socket.on('party:state', (data) => {
      if (data.playback && videoRef.current) {
        isRemoteSyncRef.current = true;
        let targetTime = Number(data.playback.currentTime) || 0;
        const serverTime = data.playback.serverTimestamp || data.playback.updatedAt;
        if (data.playback.isPlaying && serverTime) {
          const elapsed = Math.max(0, (Date.now() - serverTime) / 1000);
          targetTime += elapsed;
        }

        videoRef.current.currentTime = targetTime;
        setCurrentTime(targetTime);

        if (data.playback.isPlaying) {
          videoRef.current.play().catch(() => {});
          setIsPlaying(true);
        } else {
          videoRef.current.pause();
          setIsPlaying(false);
        }
        setTimeout(() => { isRemoteSyncRef.current = false; }, 400);
      }

      if (data.messages) {
        setMessages(data.messages);
      }

      if (data.participants && data.participants.length > 0) {
        setParticipants(data.participants);
      }
    });

    // Real-time participant roster updates
    socket.on('party:participants', (roster) => {
      if (Array.isArray(roster)) {
        setParticipants(roster);
      }
    });

    socket.on('party:participant_joined', ({ user: joinedUser }) => {
      if (joinedUser) {
        setParticipantNotification(`${joinedUser.name || 'A new viewer'} joined the watch space.`);
        setTimeout(() => setParticipantNotification(null), 3000);
      }
    });

    socket.on('party:participant_left', ({ user: leftUser }) => {
      if (leftUser) {
        setParticipantNotification(`${leftUser.name || 'A viewer'} left the space.`);
        setTimeout(() => setParticipantNotification(null), 3000);
      }
    });

    // Synchronized playback updates
    socket.on('playback:update', (data) => {
      if (!videoRef.current) return;
      isRemoteSyncRef.current = true;

      let targetTime = Number(data.currentTime) || 0;
      const serverTime = data.serverTimestamp || data.updatedAt;
      if (data.isPlaying && serverTime) {
        const elapsed = Math.max(0, (Date.now() - serverTime) / 1000);
        targetTime += elapsed;
      }

      // Drift Correction Threshold (only apply to guests, preserving authoritative host timeline)
      if (!isHost) {
        const drift = Math.abs(videoRef.current.currentTime - targetTime);
        if (drift > 1.2) {
          videoRef.current.currentTime = targetTime;
          setCurrentTime(targetTime);
        }
      }

      if (data.isPlaying && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      } else if (!data.isPlaying && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
      }

      setTimeout(() => { isRemoteSyncRef.current = false; }, 400);
    });

    // Live chat messages
    socket.on('chat:message', (newMsg) => {
      setMessages((prev) => {
        // Prevent duplicate append if message with same _id exists
        if (newMsg?._id && prev.some((m) => m._id === newMsg._id)) {
          return prev;
        }
        return [...prev, newMsg];
      });
    });

    // Live emoji reactions (deduplicated against locally dispatched reactions)
    socket.on('reaction:receive', (reactionPayload) => {
      const reactionId = reactionPayload.id || `${Date.now()}-${Math.random()}`;
      setReactions((prev) => {
        if (prev.some((r) => r.id === reactionId)) return prev;
        const randomLeft = Math.floor(15 + Math.random() * 70); // 15% to 85% width
        const newReaction = {
          id: reactionId,
          emoji: reactionPayload.emoji,
          left: `${randomLeft}%`,
          userName: reactionPayload.user?.name || 'Viewer',
        };
        setTimeout(() => {
          setReactions((p) => p.filter((r) => r.id !== reactionId));
        }, 2400);
        return [...prev.slice(-15), newReaction];
      });
    });

    // Live variation votes
    socket.on('vote:update', ({ variationId, totalVotes, optionsTally }) => {
      setVotesData((prev) => ({
        ...prev,
        [variationId]: { total: totalVotes, options: optionsTally },
      }));
    });

    // Server-side party notices/errors
    socket.on('party:error', (err) => {
      console.warn('📡 Watch Space Notice:', err?.message || 'Server notice');
    });

    return () => {
      try {
        socket.emit('party:leave', { partyId: party.partyId });
      } catch {}
      socket.off('party:state');
      socket.off('party:participants');
      socket.off('party:participant_joined');
      socket.off('party:participant_left');
      socket.off('playback:update');
      socket.off('chat:message');
      socket.off('reaction:receive');
      socket.off('vote:update');
      socket.off('party:error');
    };
  }, [party.partyId, user, isHost]);

  // Scroll chat to bottom on new message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Load initial party votes
  useEffect(() => {
    getPartyVotes(party.partyId)
      .then((data) => {
        if (data?.tallies) setVotesData(data.tallies);
      })
      .catch(() => {});
  }, [party.partyId]);

  // Handle Play/Pause by Host
  const togglePlayPause = () => {
    if (!videoRef.current || !isHost) return;
    const socket = getSocket();
    const time = videoRef.current.currentTime;

    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      socket.emit('playback:play', { partyId: party.partyId, currentTime: time });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      socket.emit('playback:pause', { partyId: party.partyId, currentTime: time });
    }
  };

  // Handle Seek by Host
  const handleSeek = (e) => {
    if (!isHost || !videoRef.current) return;
    const seekTime = Number(e.target.value);
    videoRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
    const socket = getSocket();
    socket.emit('playback:seek', { partyId: party.partyId, currentTime: seekTime });
  };

  // Video timeupdate hook
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Send Chat message
  const handleSendMessage = (e) => {
    e.preventDefault();
    const cleanMsg = chatInput.trim().slice(0, 500);
    if (!cleanMsg) return;

    const socket = getSocket();
    const msgId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const payload = {
      _id: msgId,
      partyId: party.partyId,
      userId: user?.id || 'viewer',
      userName: user?.name || 'Viewer',
      userAvatar: user?.avatar || '',
      message: cleanMsg,
      videoTime: currentTime,
      createdAt: new Date().toISOString(),
      type: 'chat',
    };

    // If socket is disconnected or this is a solo space, optimistically append to chat
    if (!socket.connected || party.partyId === 'solo-space' || party.partyId?.startsWith('solo-')) {
      setMessages((prev) => [...prev, payload]);
    }

    socket.emit('chat:message', payload);
    setChatInput('');
  };

  // Send Live Reaction (instant local display + socket broadcast)
  const handleSendReaction = (emoji) => {
    const reactionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const randomLeft = Math.floor(15 + Math.random() * 70);
    const newReaction = {
      id: reactionId,
      emoji,
      left: `${randomLeft}%`,
      userName: user?.name || 'You',
    };
    setReactions((prev) => [...prev.slice(-15), newReaction]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== reactionId));
    }, 2400);

    const socket = getSocket();
    socket.emit('reaction:send', {
      partyId: party.partyId,
      id: reactionId,
      emoji,
      user: { id: user?.id, name: user?.name, avatar: user?.avatar },
    });
  };

  // Quick timestamp jump (Host only seeks room; guests seek locally)
  const jumpToTime = (timestamp) => {
    if (videoRef.current && isHost) {
      videoRef.current.currentTime = timestamp;
      setCurrentTime(timestamp);
      const socket = getSocket();
      socket.emit('playback:seek', { partyId: party.partyId, currentTime: timestamp });
    } else if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
      setCurrentTime(timestamp);
    }
  };

  // Ask AI Co-Pilot (with client-side grounded retrieval fallback when backend is offline)
  const handleAskAi = async (customPrompt) => {
    const prompt = customPrompt || aiQuestion;
    if (!prompt.trim()) return;

    setAiLoading(true);
    setAiError(null);
    const targetContentId = content._id || content.id;

    try {
      const res = await askAiCoPilot({
        contentId: targetContentId,
        currentTime,
        question: prompt.trim(),
      });
      setAiAnswer(res);
      setAiQuestion('');
    } catch (err) {
      console.warn('Backend AI API unavailable, engaging client-side scene intelligence:', err.message);
      if (activeScene) {
        const timeFormatted = formatTimestamp(currentTime);
        const range = `${formatTimestamp(activeScene.startTime)} - ${formatTimestamp(activeScene.endTime)}`;
        let synthesizedAnswer = '';
        const q = prompt.toLowerCase();
        if (q.includes('who') || q.includes('character') || q.includes('actor')) {
          synthesizedAnswer = `In "${activeScene.title}", active characters are ${activeScene.characters?.join(', ') || 'the squad'}. ${activeScene.summary} ${activeScene.context?.[0] || ''}`;
        } else if (q.includes('dialogue') || q.includes('said') || q.includes('say')) {
          const dialogueStr = activeScene.keyDialogue?.map((d) => `${d.speaker}: "${d.line}"`).join(' ') || 'The dramatic tension is conveyed atmospherically.';
          synthesizedAnswer = `In "${activeScene.title}", dialogue: ${dialogueStr}`;
        } else {
          synthesizedAnswer = `At ${timeFormatted} in "${activeScene.title}": ${activeScene.summary} Context: ${activeScene.context?.join(' ') || ''}`;
        }

        setAiAnswer({
          answer: `${synthesizedAnswer} [Timeline Citation: Scene "${activeScene.title}" (${range})]`,
          scene: activeScene.title,
          timeRange: range,
          characters: activeScene.characters || [],
          grounded: true,
          provider: 'offline-scene-retriever',
        });
        setAiQuestion('');
      } else {
        setAiError(err.message || 'AI Co-Pilot is currently offline. Connect backend to restore live responses.');
      }
    } finally {
      setAiLoading(false);
    }
  };

  // Fetch Trivia (with embedded catalog fallback when backend is offline)
  const handleFetchTrivia = async () => {
    setTriviaLoading(true);
    setTriviaError(null);
    const targetContentId = content._id || content.id;

    try {
      const res = await getSceneTrivia({
        contentId: targetContentId,
        currentTime,
      });
      setTriviaData(res);
    } catch (err) {
      console.warn('Backend trivia unavailable, reading embedded film trivia:', err.message);
      const allTrivia = content.trivia || [];
      const sceneTrivia = allTrivia.filter((t) => activeScene && t.sceneId === activeScene.sceneId);
      const candidates = sceneTrivia.length > 0 ? sceneTrivia : allTrivia;

      if (candidates.length > 0) {
        const picked = candidates[Math.floor(Math.random() * candidates.length)];
        setTriviaData({
          fact: picked.fact,
          category: picked.category || 'Behind the Scenes',
          scene: activeScene ? activeScene.title : 'General',
          timestamp: formatTimestamp(currentTime),
        });
      } else {
        setTriviaData({
          fact: `"${content.title || 'This film'}" was created as an open-format creative benchmark showcasing cutting-edge visual artistry.`,
          category: 'Behind the Scenes',
          scene: activeScene ? activeScene.title : 'General',
          timestamp: formatTimestamp(currentTime),
        });
      }
    } finally {
      setTriviaLoading(false);
    }
  };

  // Cast Vote (optimistic UI update)
  const handleVote = (variationId, optionId) => {
    const socket = getSocket();
    socket.emit('vote:cast', {
      partyId: party.partyId,
      variationId,
      optionId,
      user: { id: user?.id, name: user?.name },
    });
    setUserVotedOptions((prev) => ({ ...prev, [variationId]: optionId }));
    setVotesData((prev) => {
      const current = prev[variationId] || { total: 0, options: {} };
      const currentOptCount = current.options[optionId] || 0;
      return {
        ...prev,
        [variationId]: {
          total: current.total + 1,
          options: {
            ...current.options,
            [optionId]: currentOptCount + 1,
          },
        },
      };
    });
  };

  // Leave Watch Space
  const handleLeave = () => {
    try {
      const socket = getSocket();
      socket.emit('party:leave', { partyId: party.partyId });
    } catch {}
    if (onLeaveParty) onLeaveParty();
  };

  // Copy party code
  const copyPartyCode = () => {
    navigator.clipboard.writeText(party.partyId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const activeParticipantsCount = participants.length > 0 ? participants.length : 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '85vh' }}>
      {/* Toast Notification for Join/Leave */}
      {participantNotification && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '24px',
          zIndex: 1000,
          background: 'rgba(20, 20, 24, 0.95)',
          border: '1px solid var(--color-primary)',
          color: 'var(--color-text-bright)',
          padding: '10px 18px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.85rem',
          boxShadow: 'var(--shadow-glow)',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {participantNotification}
        </div>
      )}

      {/* Space Header Toolbar */}
      <div className="glass-panel" style={{
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{content.title || party.title}</h2>
              {isHost ? (
                <span className="badge badge-primary" style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Crown size={12} /> ROOM HOST
                </span>
              ) : (
                <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>
                  VIEWER
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
              <span>Watch Space Code: <strong style={{ color: 'var(--color-text-bright)', fontFamily: 'monospace' }}>{party.partyId}</strong></span>
              <button
                onClick={copyPartyCode}
                style={{
                  background: 'transparent',
                  color: copiedCode ? 'var(--color-success)' : 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                {copiedCode ? <Check size={12} /> : <Copy size={12} />}
                {copiedCode ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="badge badge-success" style={{ fontSize: '0.75rem' }}>
            <span className="pulse-dot" />
            REAL-TIME SYNC ACTIVE
          </div>

          <button
            onClick={() => setActiveTab('participants')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: activeTab === 'participants' ? 'rgba(0, 113, 227, 0.2)' : 'var(--color-bg-base)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              border: activeTab === 'participants' ? '1px solid #0071E3' : '1px solid var(--color-border-subtle)',
              color: 'var(--color-text-bright)',
              cursor: 'pointer'
            }}
            title="View Room Participants"
          >
            <Users size={14} color="#0071E3" />
            <span>{activeParticipantsCount} {activeParticipantsCount === 1 ? 'Viewer' : 'Viewers'}</span>
          </button>

          <button
            onClick={handleLeave}
            className="btn btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.8rem', color: '#FF5A5F' }}
          >
            <LogOut size={14} />
            Leave Space
          </button>
        </div>
      </div>

      {/* Main Streaming & Social Layout */}
      <div className="watch-room-grid">
        {/* Left Column: Synchronized Video Stream */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div
            onClick={togglePlayPause}
            style={{
              position: 'relative',
              background: '#000',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              aspectRatio: '16/9',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--color-border-subtle)',
              cursor: isHost ? 'pointer' : 'default'
            }}
            title={isHost ? (isPlaying ? 'Click to Pause' : 'Click to Play') : 'Host controls video playback'}
          >
            <video
              ref={videoRef}
              src={content.videoUrl}
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />

            {/* Floating Reactions Animated Overlay */}
            {reactions.map((r) => (
              <div
                key={r.id}
                className="floating-reaction"
                style={{ left: r.left }}
              >
                {r.emoji}
              </div>
            ))}

            {/* Active Scene Overlay HUD */}
            {activeScene && (
              <div style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                background: 'rgba(11, 11, 13, 0.85)',
                backdropFilter: 'blur(10px)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 14px',
                maxWidth: '400px',
                pointerEvents: 'none'
              }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-primary)', fontWeight: 700, letterSpacing: '0.05em' }}>
                  ACTIVE SCENE • {formatTimestamp(activeScene.startTime)} - {formatTimestamp(activeScene.endTime)}
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#FFF' }}>
                  {activeScene.title}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  Characters: {activeScene.characters?.join(', ') || 'Atmospheric Scene'}
                </div>
              </div>
            )}
          </div>

          {/* Emoji Reactions Quick Bar */}
          <div className="glass-panel" style={{
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Live Reactions:
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {EMOJI_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSendReaction(emoji)}
                  style={{
                    background: 'var(--color-bg-base)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '1.25rem',
                    padding: '4px 10px',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  title={`Send ${emoji} reaction`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Synchronized Player Control Bar */}
          <div className="glass-panel" style={{
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <button
              onClick={togglePlayPause}
              className="btn btn-primary"
              disabled={!isHost}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                padding: 0,
                flexShrink: 0,
                opacity: isHost ? 1 : 0.6,
                cursor: isHost ? 'pointer' : 'not-allowed'
              }}
              title={isHost ? (isPlaying ? 'Pause' : 'Play') : 'Playback is synchronized to Room Host'}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
            </button>

            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontFamily: 'monospace', minWidth: '95px' }}>
              {formatTimestamp(currentTime)} / {formatTimestamp(content.duration)}
            </span>

            {/* Seek Bar */}
            <input
              type="range"
              min={0}
              max={content.duration || 100}
              value={currentTime}
              onChange={handleSeek}
              disabled={!isHost}
              style={{
                flex: 1,
                cursor: isHost ? 'pointer' : 'not-allowed',
                accentColor: 'var(--color-primary)'
              }}
              title={isHost ? 'Seek video timeline' : 'Only the Host can seek playback'}
            />

            {!isHost && (
              <span style={{ fontSize: '0.75rem', color: '#FFB800', background: 'rgba(255,184,0,0.1)', padding: '4px 8px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                👑 Host Controlled
              </span>
            )}
          </div>

          {/* Scene Breakdown Progress Markers */}
          <div className="glass-panel" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={14} color="var(--color-primary)" />
              Timeline Grounding Scenes ({content.scenes?.length || 0})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              {(content.scenes || []).map((scene) => {
                const isActive = currentTime >= scene.startTime && currentTime <= scene.endTime;
                return (
                  <div
                    key={scene.sceneId}
                    onClick={() => jumpToTime(scene.startTime)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: isActive ? 'rgba(229, 9, 20, 0.15)' : 'var(--color-bg-base)',
                      border: isActive ? '1px solid var(--color-primary)' : '1px solid var(--color-border-subtle)',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontSize: '0.7rem', color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                      {formatTimestamp(scene.startTime)} - {formatTimestamp(scene.endTime)}
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: isActive ? '#FFF' : 'var(--color-text-main)' }}>
                      {scene.title}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Multi-Tab Interactive Watch Space Hub */}
        <div className="glass-panel" style={{
          height: '660px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Hub Tab Switcher */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--color-border-subtle)',
            background: 'var(--color-bg-surface)'
          }}>
            {[
              { id: 'chat', label: 'Chat', icon: MessageSquare },
              { id: 'participants', label: `Users (${activeParticipantsCount})`, icon: Users },
              { id: 'ai', label: 'AI Co-Pilot', icon: Sparkles },
              { id: 'trivia', label: 'Trivia', icon: HelpCircle },
              { id: 'voting', label: 'Variations', icon: VoteIcon },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1,
                    padding: '10px 4px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: isActive ? 'rgba(229, 9, 20, 0.08)' : 'transparent',
                    color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                >
                  <Icon size={15} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB 1: Real-Time Chat */}
          {activeTab === 'chat' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div
                ref={chatScrollRef}
                style={{
                  flex: 1,
                  padding: '16px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: 'auto' }}>
                    Welcome to the Watch Space! Say hello to other viewers.
                  </div>
                ) : (
                  messages.map((m, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <img
                        src={m.userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(m.userName)}`}
                        alt={m.userName}
                        style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-bright)' }}>
                            {m.userName}
                          </span>
                          {m.videoTime !== undefined && (
                            <button
                              onClick={() => jumpToTime(m.videoTime)}
                              style={{
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: 'none',
                                borderRadius: '3px',
                                padding: '1px 6px',
                                fontSize: '0.7rem',
                                color: '#FFB800',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title="Click to jump video to this scene timestamp"
                            >
                              <Clock size={10} /> {formatTimestamp(m.videoTime)}
                            </button>
                          )}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-main)', lineHeight: 1.4 }}>
                          {m.message}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={handleSendMessage}
                style={{
                  padding: '12px 16px',
                  borderTop: '1px solid var(--color-border-subtle)',
                  display: 'flex',
                  gap: '8px',
                  background: 'var(--color-bg-base)'
                }}
              >
                <input
                  type="text"
                  value={chatInput}
                  maxLength={500}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={`Chat as ${user?.name || 'Viewer'}...`}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-bg-surface)',
                    border: '1px solid var(--color-border-subtle)',
                    color: 'var(--color-text-bright)',
                    fontSize: '0.85rem'
                  }}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '8px 14px' }}
                  disabled={!chatInput.trim()}
                >
                  <Send size={14} />
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: Live Room Participants */}
          {activeTab === 'participants' && (
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                Connected Viewers ({activeParticipantsCount}):
              </div>

              {participants.length === 0 ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'var(--color-bg-base)',
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border-subtle)'
                }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                      {user?.name?.[0] || 'V'}
                    </div>
                    <span className="pulse-dot" style={{ position: 'absolute', bottom: '0', right: '0', color: 'var(--color-success)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-bright)' }}>
                      {user?.name || 'Viewer'} (You)
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                      {isHost ? '👑 Space Host' : 'Viewer'}
                    </span>
                  </div>
                </div>
              ) : (
                participants.map((p, idx) => (
                  <div
                    key={p.socketId || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      background: 'var(--color-bg-base)',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border-subtle)'
                    }}
                  >
                    <div style={{ position: 'relative' }}>
                      <img
                        src={p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(p.name || 'Viewer')}`}
                        alt={p.name}
                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <span className="pulse-dot" style={{ position: 'absolute', bottom: '-2px', right: '-2px', color: 'var(--color-success)' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-bright)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{p.name}</span>
                        {(p.userId === user?.id || p.userId === user?._id) && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>(You)</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: p.role === 'host' ? '#FFB800' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {p.role === 'host' && <Crown size={11} />}
                        {p.role === 'host' ? 'Space Host' : 'Active Viewer'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: AI Co-Pilot (Grounded Temporal RAG) */}
          {activeTab === 'ai' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', overflowY: 'auto' }}>
              <div style={{
                background: 'rgba(138, 43, 226, 0.12)',
                border: '1px solid rgba(138, 43, 226, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#B388FF', fontWeight: 600 }}>
                  <Sparkles size={14} />
                  TIMELINE-GROUNDED AI CO-PILOT
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-main)', marginTop: '4px' }}>
                  Ask questions strictly grounded in the active scene without future spoilers.
                </div>
              </div>

              {/* Quick Prompt Suggestions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Quick Questions:</span>
                {[
                  'Who is in this scene and what is happening?',
                  'Why did the characters make this decision?',
                  'Explain the dialogue in this scene',
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleAskAi(prompt)}
                    style={{
                      textAlign: 'left',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--color-bg-base)',
                      border: '1px solid var(--color-border-subtle)',
                      fontSize: '0.8rem',
                      color: 'var(--color-text-bright)',
                      cursor: 'pointer'
                    }}
                  >
                    💬 {prompt}
                  </button>
                ))}
              </div>

              {/* Latest AI Answer */}
              {aiLoading ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                  <Sparkles size={20} className="spin-icon" color="var(--color-primary)" style={{ margin: '0 auto 8px' }} />
                  Analyzing scene context and temporal timeline...
                </div>
              ) : aiAnswer ? (
                <div style={{
                  background: 'var(--color-bg-base)',
                  border: '1px solid rgba(138, 43, 226, 0.4)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontSize: '0.7rem', color: '#B388FF', fontWeight: 600, marginBottom: '4px' }}>
                    {aiAnswer.scene} ({aiAnswer.timeRange})
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-bright)', lineHeight: 1.5 }}>
                    {aiAnswer.answer}
                  </div>
                </div>
              ) : aiError ? (
                <div style={{
                  background: 'rgba(229, 9, 20, 0.1)',
                  border: '1px solid rgba(229, 9, 20, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px',
                  color: '#FF5A5F',
                  fontSize: '0.82rem',
                  marginBottom: '16px'
                }}>
                  {aiError}
                </div>
              ) : null}

              {/* Custom Question Form */}
              <div style={{ marginTop: 'auto', display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAskAi()}
                  placeholder="Ask anything about this scene..."
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-bg-surface)',
                    border: '1px solid var(--color-border-subtle)',
                    color: 'var(--color-text-bright)',
                    fontSize: '0.85rem'
                  }}
                />
                <button
                  onClick={() => handleAskAi()}
                  className="btn btn-primary"
                  style={{ padding: '8px 14px' }}
                  disabled={aiLoading || !aiQuestion.trim()}
                >
                  Ask
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: Scene Trivia */}
          {activeTab === 'trivia' && (
            <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                background: 'rgba(255, 184, 0, 0.08)',
                border: '1px solid rgba(255, 184, 0, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FFB800', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                  <HelpCircle size={16} />
                  SCENE TRIVIA & EASTER EGGS
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-main)', lineHeight: 1.5 }}>
                  {triviaData
                    ? triviaData.fact
                    : 'Discover certified production secrets, easter eggs, and behind-the-scenes filmmaking facts synced to what is on screen.'}
                </div>
                {triviaData && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '10px' }}>
                    Category: <strong>{triviaData.category}</strong> • Scene: <strong>{triviaData.scene}</strong>
                  </div>
                )}
              </div>

              {triviaError && (
                <div style={{
                  background: 'rgba(229, 9, 20, 0.1)',
                  border: '1px solid rgba(229, 9, 20, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px',
                  color: '#FF5A5F',
                  fontSize: '0.8rem'
                }}>
                  {triviaError}
                </div>
              )}

              <button
                onClick={handleFetchTrivia}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '10px' }}
                disabled={triviaLoading}
              >
                {triviaLoading ? 'Fetching Fact...' : 'Discover Scene Trivia'}
              </button>
            </div>
          )}

          {/* TAB 5: Narrative & Subtitle Variations Voting */}
          {activeTab === 'voting' && (
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                Vote on pre-approved narrative and subtitle variations for this scene. Tallies sync live across all participants.
              </div>

              {(content.variations || []).length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem', padding: '30px 0' }}>
                  No active variations scheduled for this title.
                </div>
              ) : (
                content.variations.map((v) => {
                  const tally = votesData[v.variationId] || { total: 0, options: {} };
                  const userChoice = userVotedOptions[v.variationId];

                  return (
                    <div
                      key={v.variationId}
                      style={{
                        background: 'var(--color-bg-base)',
                        border: '1px solid var(--color-border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '16px'
                      }}
                    >
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600, marginBottom: '4px' }}>
                        SCENE VARIATION • {formatTimestamp(v.triggerTime)}
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#FFF', marginBottom: '14px' }}>
                        {v.question}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {v.options.map((opt) => {
                          const optionCount = tally.options[opt.id] || 0;
                          const pct = tally.total > 0 ? Math.round((optionCount / tally.total) * 100) : 0;
                          const isVoted = userChoice === opt.id;

                          return (
                            <button
                              key={opt.id}
                              onClick={() => handleVote(v.variationId, opt.id)}
                              style={{
                                position: 'relative',
                                overflow: 'hidden',
                                padding: '10px 14px',
                                borderRadius: 'var(--radius-sm)',
                                background: isVoted ? 'rgba(229, 9, 20, 0.15)' : 'var(--color-bg-surface)',
                                border: isVoted ? '1px solid var(--color-primary)' : '1px solid var(--color-border-subtle)',
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}
                            >
                              <div
                                style={{
                                  position: 'absolute',
                                  left: 0,
                                  top: 0,
                                  bottom: 0,
                                  width: `${pct}%`,
                                  background: 'rgba(229, 9, 20, 0.1)',
                                  pointerEvents: 'none',
                                  transition: 'width 0.3s ease'
                                }}
                              />
                              <div style={{ position: 'relative', zIndex: 2 }}>
                                <div style={{ fontSize: '0.85rem', color: isVoted ? '#FFF' : 'var(--color-text-main)', fontWeight: isVoted ? 600 : 400 }}>
                                  {opt.text}
                                </div>
                                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                  {opt.badge}
                                </span>
                              </div>
                              <div style={{ position: 'relative', zIndex: 2, fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                                {pct}% ({optionCount})
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
