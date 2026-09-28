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

export function WatchPartyRoom({ party, user, onLeaveParty }) {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'ai' | 'trivia' | 'voting'
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [copiedCode, setCopiedCode] = useState(false);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  // AI Co-Pilot state
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Trivia state
  const [triviaData, setTriviaData] = useState(null);
  const [triviaLoading, setTriviaLoading] = useState(false);

  // Voting state
  const [votesData, setVotesData] = useState({});
  const [userVotedOptions, setUserVotedOptions] = useState({});

  // Video and Socket refs
  const videoRef = useRef(null);
  const isRemoteSyncRef = useRef(false);
  const chatScrollRef = useRef(null);

  const content = party.contentId || {};
  const isHost = party.hostId === user?.id || party.hostId?._id === user?.id;

  // Active scene detection
  const activeScene = (content.scenes || []).find(
    (s) => currentTime >= s.startTime && currentTime <= s.endTime
  ) || content.scenes?.[0] || null;

  // Socket setup and real-time event listeners
  useEffect(() => {
    const socket = getSocket();

    socket.emit('party:join', {
      partyId: party.partyId,
      user: { id: user?.id, name: user?.name, avatar: user?.avatar },
    });

    socket.on('party:state', (data) => {
      if (data.playback && videoRef.current) {
        isRemoteSyncRef.current = true;
        videoRef.current.currentTime = data.playback.currentTime;
        if (data.playback.isPlaying) {
          videoRef.current.play().catch(() => {});
          setIsPlaying(true);
        } else {
          videoRef.current.pause();
          setIsPlaying(false);
        }
        setTimeout(() => { isRemoteSyncRef.current = false; }, 300);
      }
      if (data.messages) {
        setMessages(data.messages);
      }
    });

    socket.on('playback:update', (data) => {
      if (!videoRef.current) return;
      isRemoteSyncRef.current = true;

      const delta = Math.abs(videoRef.current.currentTime - data.currentTime);
      if (delta > 0.25) {
        videoRef.current.currentTime = data.currentTime;
      }

      if (data.isPlaying && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      } else if (!data.isPlaying && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
      }

      setTimeout(() => { isRemoteSyncRef.current = false; }, 300);
    });

    socket.on('chat:message', (newMsg) => {
      setMessages((prev) => [...prev, newMsg]);
    });

    socket.on('vote:update', ({ variationId, totalVotes, optionsTally }) => {
      setVotesData((prev) => ({
        ...prev,
        [variationId]: { total: totalVotes, options: optionsTally },
      }));
    });

    return () => {
      socket.off('party:state');
      socket.off('playback:update');
      socket.off('chat:message');
      socket.off('vote:update');
    };
  }, [party.partyId, user]);

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
    if (!videoRef.current) return;
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
    if (!chatInput.trim()) return;

    const socket = getSocket();
    const payload = {
      partyId: party.partyId,
      userId: user?.id,
      userName: user?.name || 'Viewer',
      userAvatar: user?.avatar || '',
      message: chatInput.trim(),
      videoTime: currentTime,
    };

    socket.emit('chat:message', payload);
    setChatInput('');
  };

  // Quick timestamp jump
  const jumpToTime = (timestamp) => {
    if (videoRef.current && isHost) {
      videoRef.current.currentTime = timestamp;
      const socket = getSocket();
      socket.emit('playback:seek', { partyId: party.partyId, currentTime: timestamp });
    } else if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
    }
  };

  // Ask AI Co-Pilot
  const handleAskAi = async (customPrompt) => {
    const prompt = customPrompt || aiQuestion;
    if (!prompt.trim()) return;

    setAiLoading(true);
    try {
      const res = await askAiCoPilot({
        contentId: content._id,
        currentTime,
        question: prompt.trim(),
      });
      setAiAnswer(res);
      setAiQuestion('');
    } catch (err) {
      console.error('Error asking AI:', err);
    } finally {
      setAiLoading(false);
    }
  };

  // Fetch Trivia
  const handleFetchTrivia = async () => {
    setTriviaLoading(true);
    try {
      const res = await getSceneTrivia({
        contentId: content._id,
        currentTime,
      });
      setTriviaData(res);
    } catch (err) {
      console.error('Error getting trivia:', err);
    } finally {
      setTriviaLoading(false);
    }
  };

  // Cast Vote
  const handleVote = (variationId, optionId) => {
    const socket = getSocket();
    socket.emit('vote:cast', {
      partyId: party.partyId,
      variationId,
      optionId,
      user: { id: user?.id, name: user?.name },
    });
    setUserVotedOptions((prev) => ({ ...prev, [variationId]: optionId }));
  };

  // Copy party code
  const copyPartyCode = () => {
    navigator.clipboard.writeText(party.partyId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '85vh' }}>
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
              {isHost && (
                <span className="badge badge-primary" style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Crown size={12} /> HOST
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
            SUB-250MS SYNC ACTIVE
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--color-bg-base)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8rem',
            border: '1px solid var(--color-border-subtle)'
          }}>
            <Users size={14} color="#0071E3" />
            <span>{party.participants?.length || 1} Viewers</span>
          </div>

          <button
            onClick={onLeaveParty}
            className="btn btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.8rem', color: '#FF5A5F' }}
          >
            <LogOut size={14} />
            Leave Space
          </button>
        </div>
      </div>

      {/* Main Streaming & Social Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 380px',
        gap: '24px',
        alignItems: 'start'
      }}>
        {/* Left Column: Synchronized Video Stream */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{
            position: 'relative',
            background: '#000',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            aspectRatio: '16/9',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--color-border-subtle)'
          }}>
            <video
              ref={videoRef}
              src={content.videoUrl}
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />

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
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                padding: 0,
                flexShrink: 0
              }}
              title={isHost ? (isPlaying ? 'Pause' : 'Play') : 'Synchronized to Host'}
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
            />

            {!isHost && (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Host-Controlled
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
                    padding: '12px 6px',
                    fontSize: '0.8rem',
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
                  <Icon size={16} />
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

          {/* TAB 2: AI Co-Pilot (Grounded Temporal RAG) */}
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
                    background: 'var(--color-bg-base)',
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

          {/* TAB 3: Scene Trivia */}
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

          {/* TAB 4: Narrative & Subtitle Variations Voting */}
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
