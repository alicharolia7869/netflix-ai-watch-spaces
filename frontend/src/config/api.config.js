/**
 * API & Environment Configuration
 * Netflix AI Watch Spaces - PROJ-NETF-260919
 *
 * Provides centralized resolution for backend REST API and WebSocket connections.
 * In production on Vercel: VITE_API_URL is configured in Vercel project environment variables.
 * Also supports runtime override via localStorage / URL query parameter (?backend=https://...)
 * for seamless testing before or during Vercel redeployment.
 */

const isBrowser = typeof window !== 'undefined';

const isLocalhost = isBrowser && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '::1'
);

export const IS_PRODUCTION = import.meta.env.PROD || (isBrowser && !isLocalhost);

const STORAGE_OVERRIDE_KEY = 'watchspaces_api_url_override';

// Check query param for on-the-fly URL linking (?backend=https://...)
function getQueryParamBackend() {
  if (!isBrowser) return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const backend = params.get('backend');
    if (backend && (backend.startsWith('http://') || backend.startsWith('https://'))) {
      const clean = backend.trim().replace(/\/+$/, '');
      localStorage.setItem(STORAGE_OVERRIDE_KEY, clean);
      return clean;
    }
  } catch {
    // Ignore URL parse error
  }
  return null;
}

// Get user configured runtime override
export function getRuntimeApiUrl() {
  if (!isBrowser) return null;
  const fromQuery = getQueryParamBackend();
  if (fromQuery) return fromQuery;
  const stored = localStorage.getItem(STORAGE_OVERRIDE_KEY);
  if (stored && (stored.startsWith('http://') || stored.startsWith('https://'))) {
    return stored.trim().replace(/\/+$/, '');
  }
  if (window.__NETFLIX_API_URL__) {
    return window.__NETFLIX_API_URL__.trim().replace(/\/+$/, '');
  }
  return null;
}

// Set custom backend URL from UI
export function setRuntimeApiUrl(url) {
  if (!isBrowser) return;
  if (!url) {
    localStorage.removeItem(STORAGE_OVERRIDE_KEY);
  } else {
    const clean = url.trim().replace(/\/+$/, '');
    localStorage.setItem(STORAGE_OVERRIDE_KEY, clean);
  }
}

// Clear custom backend URL
export function clearRuntimeApiUrl() {
  if (!isBrowser) return;
  localStorage.removeItem(STORAGE_OVERRIDE_KEY);
}

// Resolve the active base API URL
export function getEffectiveApiUrl() {
  // 1. Runtime override (localStorage or query param)
  const runtime = getRuntimeApiUrl();
  if (runtime) {
    return runtime;
  }

  // 2. Build-time environment variable VITE_API_URL
  const buildTime = (import.meta.env.VITE_API_URL || '').trim();
  if (buildTime) {
    return buildTime.replace(/\/+$/, '');
  }

  // 3. Localhost fallback
  if (isLocalhost) {
    // In local dev, Vite proxies /api to port 5000; or connects directly
    return '';
  }

  // 4. Production on Vercel without VITE_API_URL configured
  return '';
}

// Static export for default imports
export const API_BASE_URL = getEffectiveApiUrl();
export const CONFIGURED_API_URL = (import.meta.env.VITE_API_URL || '').trim() || getRuntimeApiUrl() || '';

// Resolve proper WebSocket URL for Socket.IO
export function getWebSocketUrl() {
  const effective = getEffectiveApiUrl();
  if (effective) {
    return effective;
  }
  if (isBrowser && isLocalhost) {
    return window.location.origin;
  }
  return '';
}

export const ENDPOINTS = {
  HEALTH: '/api/v1/health',
  ROOT_HEALTH: '/health',
  CONTENT: '/api/content',
  AUTH_REGISTER: '/api/auth/register',
  AUTH_LOGIN: '/api/auth/login',
  AUTH_ME: '/api/auth/me',
  PARTIES: '/api/parties',
  AI_ASK: '/api/ai/ask',
  AI_TRIVIA: '/api/ai/trivia',
  RECOMMENDATIONS: '/api/recommendations',
};
