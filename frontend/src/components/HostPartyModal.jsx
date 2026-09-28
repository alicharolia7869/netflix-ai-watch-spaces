import React, { useState } from 'react';
import { X, PlaySquare, Users, Sparkles, CheckCircle2, Film } from 'lucide-react';
import { createWatchParty, joinWatchParty } from '../services/api';

export function HostPartyModal({ isOpen, onClose, catalog = [], user, onPartyJoined, onOpenAuth }) {
  const [activeTab, setActiveTab] = useState('host'); // 'host' | 'join'
  const [selectedContentId, setSelectedContentId] = useState(catalog[0]?._id || '');
  const [partyTitle, setPartyTitle] = useState('');
  const [joinPartyCode, setJoinPartyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleHost = async (e) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const party = await createWatchParty({
        contentId: selectedContentId || catalog[0]?._id,
        title: partyTitle.trim() || undefined,
      });
      onPartyJoined(party);
      onClose();
    } catch (err) {
      setError(err.message || 'Error creating watch party.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }

    if (!joinPartyCode.trim()) {
      setError('Please enter a party code');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const code = joinPartyCode.trim().toLowerCase();
      const party = await joinWatchParty(code);
      onPartyJoined(party);
      onClose();
    } catch (err) {
      setError(err.message || 'Error joining watch party. Please verify the code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '520px',
        width: '100%',
        padding: '32px',
        position: 'relative',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            color: 'var(--color-text-muted)',
            cursor: 'pointer'
          }}
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        {/* Tab switchers */}
        <div style={{
          display: 'flex',
          background: 'var(--color-bg-base)',
          borderRadius: 'var(--radius-sm)',
          padding: '4px',
          marginBottom: '24px'
        }}>
          <button
            type="button"
            onClick={() => { setActiveTab('host'); setError(null); }}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              background: activeTab === 'host' ? 'var(--color-bg-elevated)' : 'transparent',
              color: activeTab === 'host' ? 'var(--color-text-bright)' : 'var(--color-text-muted)',
              fontWeight: 600,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <PlaySquare size={16} color="var(--color-primary)" />
            Host New Party
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('join'); setError(null); }}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              background: activeTab === 'join' ? 'var(--color-bg-elevated)' : 'transparent',
              color: activeTab === 'join' ? 'var(--color-text-bright)' : 'var(--color-text-muted)',
              fontWeight: 600,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Users size={16} color="#0071E3" />
            Join with Code
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(229, 9, 20, 0.1)',
            border: '1px solid rgba(229, 9, 20, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            color: '#FF5A5F',
            fontSize: '0.85rem',
            marginBottom: '18px'
          }}>
            {error}
          </div>
        )}

        {!user && (
          <div style={{
            background: 'rgba(255, 184, 0, 0.08)',
            border: '1px solid rgba(255, 184, 0, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 14px',
            fontSize: '0.85rem',
            color: 'var(--color-warning)',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>Sign in is required to host or join persistent rooms.</span>
            <button
              onClick={onOpenAuth}
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            >
              Sign In
            </button>
          </div>
        )}

        {activeTab === 'host' ? (
          <form onSubmit={handleHost} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                Select Movie to Stream
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                {catalog.map((movie) => {
                  const isSelected = (selectedContentId || catalog[0]?._id) === movie._id;
                  return (
                    <div
                      key={movie._id}
                      onClick={() => setSelectedContentId(movie._id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        background: isSelected ? 'rgba(229, 9, 20, 0.12)' : 'var(--color-bg-base)',
                        border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--color-border-subtle)',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Film size={18} color={isSelected ? 'var(--color-primary)' : 'var(--color-text-muted)'} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: isSelected ? 'var(--color-text-bright)' : 'var(--color-text-main)' }}>
                            {movie.title}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            {movie.genre?.join(', ')} • {Math.floor(movie.duration / 60)} min
                          </div>
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 size={18} color="var(--color-primary)" />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                Party Title (Optional)
              </label>
              <input
                type="text"
                value={partyTitle}
                onChange={(e) => setPartyTitle(e.target.value)}
                placeholder="Friday Movie Night with Friends"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'var(--color-bg-base)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text-bright)',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', marginTop: '6px' }}
              disabled={loading || !user}
            >
              <Sparkles size={16} />
              {loading ? 'Creating Watch Space...' : 'Launch Watch Space'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                Enter Watch Space Code
              </label>
              <input
                type="text"
                required
                value={joinPartyCode}
                onChange={(e) => setJoinPartyCode(e.target.value)}
                placeholder="e.g. wp-1a2b3c"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'var(--color-bg-base)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text-bright)',
                  fontSize: '1rem',
                  fontFamily: 'monospace',
                  letterSpacing: '0.05em'
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                Ask your host for their 6-character party ID.
              </span>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', marginTop: '6px' }}
              disabled={loading || !user}
            >
              <Users size={16} />
              {loading ? 'Joining Space...' : 'Join Watch Space'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
