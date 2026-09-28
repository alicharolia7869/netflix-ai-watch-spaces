import React, { useState, useEffect, useCallback } from 'react';
import { 
  Tv, 
  Activity, 
  Database, 
  Cpu, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Layers, 
  Film, 
  Users, 
  LogIn, 
  LogOut, 
  Globe, 
  Info,
  Sparkles
} from 'lucide-react';
import { 
  getHealthStatus, 
  getCurrentUser, 
  logoutUser, 
  getContentCatalog, 
  getRecommendations 
} from './services/api';
import { ENDPOINTS, CONFIGURED_API_URL, IS_PRODUCTION } from './config/api.config';
import { initialCatalog } from './data/initialCatalog';
import { AuthModal } from './components/AuthModal';
import { HostPartyModal } from './components/HostPartyModal';
import { ContentCatalog } from './components/ContentCatalog';
import { WatchPartyRoom } from './components/WatchPartyRoom';

function App() {
  // Navigation & View state
  const [currentView, setCurrentView] = useState('catalog'); // 'catalog' | 'watch_space' | 'health'

  // User state
  const [user, setUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [hostModalOpen, setHostModalOpen] = useState(false);

  // Content & Recommendations initialized with default catalog for instantaneous display
  const [catalog, setCatalog] = useState(initialCatalog);
  const [recommendations, setRecommendations] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  // Active Watch Party
  const [activeParty, setActiveParty] = useState(null);

  // System Health state (Preserved & Enhanced)
  const [healthData, setHealthData] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [healthError, setHealthError] = useState(null);
  const [lastCheckTime, setLastCheckTime] = useState(null);

  const fetchSystemHealth = useCallback(async (isManual = false) => {
    if (isManual) setLoadingHealth(true);
    setHealthError(null);
    try {
      const data = await getHealthStatus();
      setHealthData(data);
      setLastCheckTime(new Date().toLocaleTimeString());
    } catch (err) {
      setHealthData(null);
      setHealthError(err.message || 'Failed to reach backend services.');
      setLastCheckTime(new Date().toLocaleTimeString());
    } finally {
      setLoadingHealth(false);
    }
  }, []);

  const loadCatalogAndRecommendations = useCallback(async (isManual = false) => {
    if (isManual) setCatalogLoading(true);
    try {
      const catalogData = await getContentCatalog();
      setCatalog(catalogData.items || []);

      const recData = await getRecommendations().catch(() => ({ items: [] }));
      setRecommendations(recData.items || []);
    } catch (err) {
      console.warn('Error loading catalog:', err.message);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  // Load active user, health, and catalog on mount
  useEffect(() => {
    let isMounted = true;

    getCurrentUser().then((u) => {
      if (isMounted && u) setUser(u);
    });

    getHealthStatus()
      .then((data) => {
        if (!isMounted) return;
        setHealthData(data);
        setLastCheckTime(new Date().toLocaleTimeString());
      })
      .catch((err) => {
        if (!isMounted) return;
        setHealthData(null);
        setHealthError(err.message || 'Failed to reach backend services.');
        setLastCheckTime(new Date().toLocaleTimeString());
      })
      .finally(() => {
        if (isMounted) setLoadingHealth(false);
      });

    getContentCatalog()
      .then((catalogData) => {
        if (isMounted) setCatalog(catalogData.items || []);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setCatalogLoading(false);
      });

    getRecommendations()
      .then((recData) => {
        if (isMounted) setRecommendations(recData.items || []);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = () => {
    logoutUser();
    setUser(null);
  };

  const handlePartyJoined = (party) => {
    setActiveParty(party);
    setCurrentView('watch_space');
  };

  const handleLeaveParty = () => {
    setActiveParty(null);
    setCurrentView('catalog');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation */}
      <header style={{
        borderBottom: '1px solid var(--color-border-subtle)',
        background: 'rgba(11, 11, 13, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '14px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {/* Brand */}
          <div
            onClick={() => setCurrentView('catalog')}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          >
            <div style={{
              background: 'linear-gradient(135deg, #E50914 0%, #B81D24 100%)',
              padding: '7px',
              borderRadius: '8px',
              display: 'flex',
              boxShadow: 'var(--shadow-glow)'
            }}>
              <Tv size={22} color="#FFF" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.2rem', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                NETFLIX <span style={{ color: 'var(--color-primary)' }}>AI</span> WATCH SPACES
              </h1>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', letterSpacing: '0.04em' }}>
                FULL-STACK MERN • REAL-TIME AI ORCHESTRATION
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setCurrentView('catalog')}
              style={{
                background: currentView === 'catalog' ? 'rgba(229, 9, 20, 0.15)' : 'transparent',
                color: currentView === 'catalog' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                border: 'none',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Film size={15} />
              Browse & Watch
            </button>

            {activeParty && (
              <button
                onClick={() => setCurrentView('watch_space')}
                style={{
                  background: currentView === 'watch_space' ? 'rgba(229, 9, 20, 0.15)' : 'transparent',
                  color: currentView === 'watch_space' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Users size={15} />
                Live Watch Space ({activeParty.partyId})
              </button>
            )}

            <button
              onClick={() => setCurrentView('health')}
              style={{
                background: currentView === 'health' ? 'rgba(229, 9, 20, 0.15)' : 'transparent',
                color: currentView === 'health' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                border: 'none',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Activity size={15} />
              System Health
            </button>
          </nav>
        </div>

        {/* Action Controls & User Account */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={() => setHostModalOpen(true)}
            className="btn btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <Users size={15} />
            Host / Join Party
          </button>

          {user ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'var(--color-bg-base)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-full)',
              padding: '4px 12px 4px 6px'
            }}>
              <img
                src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                alt={user.name}
                style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-bright)' }}>
                {user.name}
              </span>
              <button
                onClick={handleLogout}
                style={{ background: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer', marginLeft: '4px' }}
                title="Logout"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="btn btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            >
              <LogIn size={15} />
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1240px', margin: '0 auto', padding: '32px 24px', flex: 1, width: '100%' }}>
        {/* VIEW 1: Browse Movie Catalog & Recommendations */}
        {currentView === 'catalog' && (
          <ContentCatalog
            catalog={catalog}
            recommendations={recommendations}
            loading={catalogLoading}
            onSelectMovie={(movie) => {
              // Quick solo watch space
              setActiveParty({
                partyId: 'solo-space',
                contentId: movie,
                title: `${movie.title} Solo Space`,
                hostId: user?.id || 'viewer',
                participants: [{ name: user?.name || 'Solo Viewer', role: 'host' }],
              });
              setCurrentView('watch_space');
            }}
            onHostPartyForMovie={() => setHostModalOpen(true)}
          />
        )}

        {/* VIEW 2: Active Watch Party Room */}
        {currentView === 'watch_space' && activeParty && (
          <WatchPartyRoom
            party={activeParty}
            user={user}
            onLeaveParty={handleLeaveParty}
          />
        )}

        {/* VIEW 3: System Architecture & Subsystem Health Grid */}
        {currentView === 'health' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Full-Stack Subsystem Verification</h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                  Live architectural health diagnostics for Node.js Express, MongoDB Mongoose, and Socket.IO real-time engine.
                </p>
              </div>

              <button
                onClick={fetchSystemHealth}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                disabled={loadingHealth}
              >
                <RefreshCw size={14} className={loadingHealth ? 'spin-icon' : ''} />
                Refresh Status
              </button>
            </div>

            {/* Subsystem Health Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
              {/* Express Backend Card */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Cpu size={20} color="var(--color-primary)" />
                    <h4 style={{ fontSize: '1.05rem' }}>Node.js / Express</h4>
                  </div>
                  {healthData ? (
                    <CheckCircle2 size={20} color="var(--color-success)" />
                  ) : (
                    <AlertCircle size={20} color={loadingHealth ? 'var(--color-warning)' : '#FF5A5F'} />
                  )}
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                  Asynchronous REST API powering authentication, catalog queries, and AI Co-Pilot retrieval.
                </p>
                <div style={{ fontSize: '0.8rem', background: 'var(--color-bg-base)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)' }}>
                  <div><strong>Status:</strong> {healthData ? 'Active / Online' : (loadingHealth ? 'Connecting...' : 'Offline')}</div>
                  <div><strong>Version:</strong> {healthData?.version || '2.0.0'}</div>
                  <div><strong>Environment:</strong> {healthData?.environment || (IS_PRODUCTION ? 'production' : 'development')}</div>
                </div>
              </div>

              {/* MongoDB Atlas Card */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Database size={20} color="#0071E3" />
                    <h4 style={{ fontSize: '1.05rem' }}>MongoDB Atlas / Mongoose</h4>
                  </div>
                  {healthData?.database?.status === 'healthy' ? (
                    <CheckCircle2 size={20} color="var(--color-success)" />
                  ) : (
                    <AlertCircle size={20} color="var(--color-warning)" />
                  )}
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                  Document persistence for users, parties, chat history, variations, and recommendations.
                </p>
                <div style={{ fontSize: '0.8rem', background: 'var(--color-bg-base)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)' }}>
                  <div><strong>Engine:</strong> {healthData?.database?.type?.toUpperCase() || 'MONGODB ATLAS'}</div>
                  <div><strong>State:</strong> {healthData?.database?.status?.toUpperCase() || (loadingHealth ? 'INITIALIZING' : 'STANDBY')}</div>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <strong>Database:</strong> {healthData?.database?.database || 'watchspaces'}
                  </div>
                </div>
              </div>

              {/* Socket.IO Real-Time Hub */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Activity size={20} color="var(--color-success)" />
                    <h4 style={{ fontSize: '1.05rem' }}>Socket.IO Real-Time</h4>
                  </div>
                  <CheckCircle2 size={20} color="var(--color-success)" />
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                  Bi-directional WebSocket hub with sub-250ms drift correction and live chat dispatch.
                </p>
                <div style={{ fontSize: '0.8rem', background: 'var(--color-bg-base)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)' }}>
                  <div><strong>Engine:</strong> WebSocket / Polling Fallback</div>
                  <div><strong>Sync Threshold:</strong> &lt; 250ms</div>
                  <div><strong>Features:</strong> Playback Sync, Live Chat, Live Votes</div>
                </div>
              </div>
            </div>

            {/* Live Raw Health Payload Inspector */}
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '40px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Globe size={16} color="var(--color-primary)" />
                  <h4 style={{ fontSize: '0.95rem', color: 'var(--color-text-bright)' }}>
                    Live Endpoint Response Inspector (/api/v1/health)
                  </h4>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  <span>Target: <code style={{ color: 'var(--color-text-main)', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>{ENDPOINTS.HEALTH}</code></span>
                  <span>Last Checked: {lastCheckTime || 'Pending'}</span>
                </div>
              </div>

              {loadingHealth && !healthData ? (
                <div style={{
                  background: 'var(--color-bg-base)',
                  padding: '24px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border-subtle)',
                  textAlign: 'center',
                  color: 'var(--color-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px'
                }}>
                  <RefreshCw size={18} className="spin-icon" color="var(--color-primary)" />
                  <span>Querying backend health endpoint...</span>
                </div>
              ) : healthError ? (
                <div style={{
                  background: 'rgba(229, 9, 20, 0.06)',
                  border: '1px solid rgba(229, 9, 20, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <AlertCircle size={20} color="#FF5A5F" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#FF5A5F', marginBottom: '4px' }}>
                        Backend Service Notice
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-main)', lineHeight: 1.5 }}>
                        {healthError}
                      </div>
                    </div>
                  </div>

                  {IS_PRODUCTION && !CONFIGURED_API_URL && (
                    <div style={{
                      background: 'rgba(0, 0, 0, 0.35)',
                      border: '1px solid var(--color-border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 16px',
                      fontSize: '0.8rem',
                      color: 'var(--color-text-muted)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px'
                    }}>
                      <Info size={16} color="var(--color-info)" style={{ marginTop: '2px', flexShrink: 0 }} />
                      <div>
                        <strong style={{ color: 'var(--color-text-bright)' }}>Production Deployment Notice: </strong>
                        The frontend is hosted on Vercel as a decoupled client SPA. To connect it to your live Node.js / Express backend, 
                        set the <code style={{ color: '#46D369' }}>VITE_API_URL</code> environment variable in your Vercel project settings to your backend host.
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <pre style={{
                  background: 'var(--color-bg-base)',
                  padding: '16px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border-subtle)',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  color: '#46D369',
                  overflowX: 'auto'
                }}>
                  {JSON.stringify(healthData, null, 2)}
                </pre>
              )}
            </div>

            {/* Incremental Engineering Roadmap */}
            <h3 style={{ fontSize: '1.25rem', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Layers size={20} color="var(--color-primary)" />
              Full MERN Architecture Milestone Matrix
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              {[
                { phase: 'Phase 1', name: 'Scaffold & Vercel Deploy', status: 'COMPLETE', icon: CheckCircle2, active: true },
                { phase: 'Phase 2', name: 'Mongoose & MongoDB Atlas', status: 'COMPLETE', icon: Database, active: true },
                { phase: 'Phase 3', name: 'JWT Auth & Sessions', status: 'COMPLETE', icon: CheckCircle2, active: true },
                { phase: 'Phase 4', name: 'Watch Party Hub & Codes', status: 'COMPLETE', icon: CheckCircle2, active: true },
                { phase: 'Phase 5', name: 'Real-Time Sync Engine', status: 'COMPLETE', icon: CheckCircle2, active: true },
                { phase: 'Phase 6', name: 'Synchronized Video Player', status: 'COMPLETE', icon: CheckCircle2, active: true },
                { phase: 'Phase 7', name: 'Socket.IO Live Chat', status: 'COMPLETE', icon: CheckCircle2, active: true },
                { phase: 'Phase 8', name: 'AI Co-Pilot (Temporal RAG)', status: 'COMPLETE', icon: Sparkles, active: true },
                { phase: 'Phase 9', name: 'Narrative Variations Voting', status: 'COMPLETE', icon: CheckCircle2, active: true },
                { phase: 'Phase 10', name: 'Content Recommendations', status: 'COMPLETE', icon: Film, active: true },
              ].map((item, idx) => (
                <div 
                  key={idx} 
                  style={{
                    background: item.active ? 'rgba(229, 9, 20, 0.08)' : 'var(--color-bg-surface)',
                    border: item.active ? '1px solid var(--color-primary)' : '1px solid var(--color-border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.75rem', color: item.active ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: 600 }}>
                      {item.phase}
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text-bright)' }}>
                      {item.name}
                    </div>
                  </div>
                  <span className={item.active ? 'badge badge-primary' : 'badge badge-secondary'} style={{ fontSize: '0.65rem' }}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--color-border-subtle)',
        padding: '24px 32px',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: 'var(--color-text-muted)'
      }}>
        Full-Stack MERN Engineering Project • Netflix AI Watch Spaces • Project ID: PROJ-NETF-260919
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={(u) => {
          setUser(u);
          loadCatalogAndRecommendations();
        }}
      />

      <HostPartyModal
        isOpen={hostModalOpen}
        onClose={() => setHostModalOpen(false)}
        catalog={catalog}
        user={user}
        onPartyJoined={handlePartyJoined}
        onOpenAuth={() => setAuthModalOpen(true)}
      />
    </div>
  );
}

export default App;
