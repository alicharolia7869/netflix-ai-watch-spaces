/**
 * API and Environment Configuration
 * Netflix AI Watch Spaces - PROJ-NETF-260919
 */

const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim();

// Production check: running in production build or non-local host
const isBrowser = typeof window !== 'undefined';
const isLocalhost = isBrowser && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '::1'
);
export const IS_PRODUCTION = import.meta.env.PROD || (isBrowser && !isLocalhost);

export const API_BASE_URL = (() => {
  if (!rawApiUrl) {
    return '';
  }
  // Strip trailing slashes
  const cleanUrl = rawApiUrl.replace(/\/+$/, '');

  if (IS_PRODUCTION && (cleanUrl.includes('localhost') || cleanUrl.includes('127.0.0.1'))) {
    console.warn(
      `[Config Warning] VITE_API_URL is configured as "${cleanUrl}" in production. ` +
      `Browsers on user devices cannot connect to localhost. ` +
      `Set VITE_API_URL in Vercel to your deployed FastAPI backend URL.`
    );
  }

  return cleanUrl;
})();

export const ENDPOINTS = {
  HEALTH: `${API_BASE_URL}/api/v1/health`,
  ROOT: `${API_BASE_URL}/`,
};

export const CONFIGURED_API_URL = rawApiUrl;
