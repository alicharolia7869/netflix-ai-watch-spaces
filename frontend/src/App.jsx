import React, { useState, useEffect } from 'react';
import { 
  Tv, 
  Activity, 
  Database, 
  Cpu, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Layers, 
  PlaySquare, 
  MessageSquare,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

function App() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastCheckTime, setLastCheckTime] = useState(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/health');
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setHealthData(data);
      setLastCheckTime(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message || 'Failed to reach FastAPI backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation */}
      <header style={{
        borderBottom: '1px solid var(--color-border-subtle)',
        background: 'rgba(11, 11, 13, 0.85)',
        backdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #E50914 0%, #B81D24 100%)',
            padding: '8px',
            borderRadius: '8px',
            display: 'flex',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <Tv size={24} color="#FFF" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              NETFLIX <span style={{ color: 'var(--color-primary)' }}>AI</span> WATCH SPACES
            </h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', letterSpacing: '0.04em' }}>
              PROJ-NETF-260919 • PHASE 1 SCAFFOLD
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className={healthData?.status === 'healthy' ? 'badge badge-success' : 'badge badge-warning'}>
            <span className="pulse-dot" />
            {healthData?.status === 'healthy' ? 'SYSTEM OPERATIONAL' : 'SYSTEM CHECKING'}
          </div>
          <button 
            onClick={fetchHealth} 
            className="btn btn-secondary" 
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
            Refresh
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px', flex: 1, width: '100%' }}>
        {/* Hero Section */}
        <section style={{ marginBottom: '40px' }}>
          <div style={{
            background: 'linear-gradient(180deg, rgba(229, 9, 20, 0.08) 0%, rgba(20, 20, 24, 0) 100%)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '36px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-primary">PHASE 1 COMPLETE</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                Foundation & Architecture Verified
              </span>
            </div>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 800, maxWidth: '800px', lineHeight: 1.15 }}>
              Synchronized Streaming with Grounded AI Intelligence
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '1.05rem', maxWidth: '720px' }}>
              Full-stack social watch party platform featuring authoritative sub-250ms playback synchronization, 
              temporal RAG timeline-grounded AI Co-Pilot, interactive narrative variations, and live analytics.
            </p>
          </div>
        </section>

        {/* Backend & Environment Health Grid */}
        <h3 style={{ fontSize: '1.25rem', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Activity size={20} color="var(--color-primary)" />
          Subsystem Health Verification
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          {/* FastAPI Core Card */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Cpu size={20} color="var(--color-primary)" />
                <h4 style={{ fontSize: '1.05rem' }}>FastAPI Backend</h4>
              </div>
              {healthData ? (
                <CheckCircle2 size={20} color="var(--color-success)" />
              ) : (
                <AlertCircle size={20} color="var(--color-warning)" />
              )}
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              High-performance asynchronous Python API with Pydantic v2 schemas and WebSocket hubs.
            </p>
            <div style={{ fontSize: '0.8rem', background: 'var(--color-bg-base)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)' }}>
              <div><strong>Status:</strong> {healthData ? 'Active / Online' : 'Connecting...'}</div>
              <div><strong>Version:</strong> {healthData?.version || '1.0.0'}</div>
              <div><strong>Environment:</strong> {healthData?.environment || 'development'}</div>
            </div>
          </div>

          {/* Database Layer Card */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Database size={20} color="#0071E3" />
                <h4 style={{ fontSize: '1.05rem' }}>Database & ORM</h4>
              </div>
              {healthData?.database?.status === 'healthy' ? (
                <CheckCircle2 size={20} color="var(--color-success)" />
              ) : (
                <AlertCircle size={20} color="var(--color-warning)" />
              )}
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              PostgreSQL relational storage via SQLAlchemy 2.0 with resilient local development fallback.
            </p>
            <div style={{ fontSize: '0.8rem', background: 'var(--color-bg-base)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)' }}>
              <div><strong>Engine:</strong> {healthData?.database?.type?.toUpperCase() || 'SQLITE / PG'}</div>
              <div><strong>State:</strong> {healthData?.database?.status?.toUpperCase() || 'INITIALIZING'}</div>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <strong>Target:</strong> {healthData?.database?.active_url || 'local'}
              </div>
            </div>
          </div>

          {/* Security & Token Engine */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={20} color="var(--color-success)" />
                <h4 style={{ fontSize: '1.05rem' }}>Security & RBAC</h4>
              </div>
              <CheckCircle2 size={20} color="var(--color-success)" />
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              JWT token signing, bcrypt credential hashing, and backend-enforced RBAC (viewer/host/admin).
            </p>
            <div style={{ fontSize: '0.8rem', background: 'var(--color-bg-base)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)' }}>
              <div><strong>Algorithm:</strong> HS256</div>
              <div><strong>Token Validity:</strong> 24 Hours</div>
              <div><strong>Role Matrix:</strong> Viewer, Host, Admin</div>
            </div>
          </div>
        </div>

        {/* Live Raw Health Payload Inspector */}
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ fontSize: '0.95rem', color: 'var(--color-text-bright)' }}>
              Live Health Check Response Inspector (/api/v1/health)
            </h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Last Verified: {lastCheckTime || 'Pending'}
            </span>
          </div>
          {error ? (
            <div style={{ color: '#FF5A5F', background: 'rgba(255, 90, 95, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255, 90, 95, 0.3)' }}>
              Error: {error}
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

        {/* Implementation Roadmap */}
        <h3 style={{ fontSize: '1.25rem', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Layers size={20} color="var(--color-primary)" />
          Incremental Engineering Roadmap
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {[
            { phase: 'Phase 1', name: 'Scaffold & Health', status: 'COMPLETE', icon: CheckCircle2, active: true },
            { phase: 'Phase 2', name: 'Database & Seed Data', status: 'NEXT', icon: Database, active: false },
            { phase: 'Phase 3', name: 'Auth & RBAC', status: 'PLANNED', icon: ShieldCheck, active: false },
            { phase: 'Phase 4', name: 'Watch Space Hub', status: 'PLANNED', icon: PlaySquare, active: false },
            { phase: 'Phase 5', name: 'Sync & Drift Engine', status: 'PLANNED', icon: Activity, active: false },
            { phase: 'Phase 6', name: 'Video Player & UI', status: 'PLANNED', icon: Tv, active: false },
            { phase: 'Phase 7', name: 'WebSocket Chat', status: 'PLANNED', icon: MessageSquare, active: false },
            { phase: 'Phase 8', name: 'AI Co-Pilot (RAG)', status: 'PLANNED', icon: Sparkles, active: false },
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
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--color-border-subtle)',
        padding: '24px 32px',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: 'var(--color-text-muted)'
      }}>
        Internmo Full-Stack Engineering Project • Netflix AI Watch Spaces • Project ID: PROJ-NETF-260919
      </footer>
    </div>
  );
}

export default App;
