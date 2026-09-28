import React, { useState } from 'react';
import { X, Server, CheckCircle2, AlertCircle, RefreshCw, Globe } from 'lucide-react';
import {
  getEffectiveApiUrl,
  getRuntimeApiUrl,
  setRuntimeApiUrl,
  clearRuntimeApiUrl,
  IS_PRODUCTION,
} from '../config/api.config';

export function BackendConfigModal({ isOpen, onClose, onConfigUpdated }) {
  const currentUrl = getEffectiveApiUrl();
  const [inputUrl, setInputUrl] = useState(getRuntimeApiUrl() || currentUrl || '');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  if (!isOpen) return null;

  const handleTestConnection = async (urlToTest) => {
    const target = (urlToTest || inputUrl || '').trim().replace(/\/+$/, '');
    if (!target) {
      setTestResult({
        success: false,
        message: 'Please provide a valid backend URL (e.g. https://your-backend.up.railway.app).',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // Test root /health or /api/v1/health
      const res = await fetch(`${target}/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      setTestResult({
        success: true,
        message: `Successfully connected! Service: ${data.service || 'backend'} (Status: ${data.status || 'ok'})`,
        data,
      });
    } catch (err) {
      // Try /api/v1/health as fallback
      try {
        const res2 = await fetch(`${target}/api/v1/health`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
        if (res2.ok) {
          const data2 = await res2.json();
          setTestResult({
            success: true,
            message: `Successfully connected via /api/v1/health! Service: ${data2.service || 'backend'}`,
            data: data2,
          });
          return;
        }
      } catch {
        // Fall through to error
      }

      setTestResult({
        success: false,
        message: `Connection failed: ${err.message}. Verify that the backend is deployed, running, and CORS allows this origin.`,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const clean = inputUrl.trim().replace(/\/+$/, '');
    if (clean) {
      setRuntimeApiUrl(clean);
    } else {
      clearRuntimeApiUrl();
    }
    if (onConfigUpdated) onConfigUpdated();
    onClose();
  };

  const handleReset = () => {
    clearRuntimeApiUrl();
    setInputUrl(import.meta.env.VITE_API_URL || '');
    setTestResult(null);
    if (onConfigUpdated) onConfigUpdated();
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
      zIndex: 1100,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '540px',
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{
            background: 'rgba(229, 9, 20, 0.15)',
            padding: '8px',
            borderRadius: '8px',
            color: 'var(--color-primary)'
          }}>
            <Server size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.3rem', margin: 0 }}>Backend API & Real-Time Hub</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: '2px 0 0 0' }}>
              Connect your frontend client to a deployed Node.js Express service
            </p>
          </div>
        </div>

        {/* Status display */}
        <div style={{
          background: 'var(--color-bg-base)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 14px',
          margin: '18px 0',
          fontSize: '0.85rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Build-Time VITE_API_URL:</span>
            <code style={{ color: import.meta.env.VITE_API_URL ? '#46D369' : '#FF5A5F' }}>
              {import.meta.env.VITE_API_URL || '(not configured at build time)'}
            </code>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Effective Connection URL:</span>
            <code style={{ color: currentUrl ? '#46D369' : '#FFB800' }}>
              {currentUrl || (IS_PRODUCTION ? 'None (Disconnected)' : 'http://localhost:5000 (Vite Proxy)')}
            </code>
          </div>
        </div>

        {/* Input Form */}
        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
            Deployed Backend URL
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Globe size={16} color="var(--color-text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="url"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://your-backend.up.railway.app"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  background: 'var(--color-bg-base)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text-bright)',
                  fontSize: '0.9rem'
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => handleTestConnection(inputUrl)}
              disabled={testing || !inputUrl.trim()}
              className="btn btn-secondary"
              style={{ padding: '0 14px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            >
              {testing ? <RefreshCw size={14} className="spin-icon" /> : 'Test'}
            </button>
          </div>
          <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Enter your Render, Railway, Fly.io, or cloud backend URL without a trailing slash.
          </span>
        </div>

        {/* Test Result Feedback */}
        {testResult && (
          <div style={{
            background: testResult.success ? 'rgba(70, 211, 105, 0.1)' : 'rgba(229, 9, 20, 0.1)',
            border: `1px solid ${testResult.success ? 'rgba(70, 211, 105, 0.3)' : 'rgba(229, 9, 20, 0.3)'}`,
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            color: testResult.success ? '#46D369' : '#FF5A5F',
            fontSize: '0.85rem',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }}>
            {testResult.success ? <CheckCircle2 size={16} style={{ marginTop: '2px', flexShrink: 0 }} /> : <AlertCircle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />}
            <div>{testResult.message}</div>
          </div>
        )}

        {/* Vercel Guidance Note */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 14px',
          fontSize: '0.78rem',
          color: 'var(--color-text-muted)',
          marginBottom: '20px',
          lineHeight: 1.5
        }}>
          <strong style={{ color: 'var(--color-text-bright)' }}>For Permanent Vercel Deployment:</strong>
          <br />
          1. Go to <strong>Vercel Dashboard → Your Project → Settings → Environment Variables</strong>.
          <br />
          2. Add Key: <code style={{ color: '#46D369' }}>VITE_API_URL</code> with Value: your live backend URL.
          <br />
          3. Go to <strong>Deployments → Redeploy</strong> (Vite compiles environment variables at build time).
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={handleReset}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
              fontSize: '0.8rem',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Reset to Default
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="btn btn-primary"
              style={{ padding: '8px 20px', fontSize: '0.85rem' }}
            >
              Save & Connect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
