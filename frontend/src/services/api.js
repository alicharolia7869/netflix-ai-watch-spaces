import { API_BASE_URL, IS_PRODUCTION, CONFIGURED_API_URL } from '../config/api.config';

export class ApiError extends Error {
  constructor(message, status = null, code = 'API_ERROR', details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Token helper
const TOKEN_KEY = 'watchspaces_token';

export function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token) {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function removeAuthToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Universal fetch wrapper with JSON validation, token attachment, and production error formatting.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...options.headers,
  };

  const token = getAuthToken();
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const contentType = res.headers.get('content-type') || '';

    // Catch SPA rewrites returning HTML
    if (contentType.includes('text/html')) {
      const isMissingBackend = IS_PRODUCTION && !CONFIGURED_API_URL;
      const msg = isMissingBackend
        ? 'FastAPI/Node backend is not connected. In Vercel Project Settings > Environment Variables, configure VITE_API_URL pointing to your backend host.'
        : `Endpoint returned HTML instead of JSON (${url}). Check that the API server is running.`;
      throw new ApiError(msg, res.status, 'HTML_RESPONSE_ERROR');
    }

    if (!res.ok) {
      let serverErrorMsg = `HTTP ${res.status}: ${res.statusText}`;
      try {
        const errorJson = await res.json();
        if (errorJson?.message) {
          serverErrorMsg = errorJson.message;
        } else if (errorJson?.detail) {
          serverErrorMsg = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
        }
      } catch {
        // Ignore json parse error on error response
      }
      throw new ApiError(serverErrorMsg, res.status, 'HTTP_ERROR');
    }

    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    if (err instanceof ApiError) throw err;

    const isNetworkError = err instanceof TypeError && err.message.toLowerCase().includes('fetch');
    if (isNetworkError) {
      const guidance = IS_PRODUCTION && !CONFIGURED_API_URL
        ? 'Cannot connect to backend. VITE_API_URL is not set in Vercel project environment variables.'
        : `Cannot reach backend at ${url || 'server'}. Ensure the backend service is running and CORS allows this origin.`;
      throw new ApiError(guidance, null, 'NETWORK_ERROR', err.message);
    }

    throw new ApiError(err.message || 'An unexpected error occurred.', null, 'UNKNOWN_ERROR');
  }
}

// System Health
export async function getHealthStatus(signal) {
  return request('/api/v1/health', { method: 'GET', signal });
}

// Authentication
export async function registerUser({ name, email, password }) {
  const data = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
  if (data?.token) setAuthToken(data.token);
  return data;
}

export async function loginUser({ email, password }) {
  const data = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (data?.token) setAuthToken(data.token);
  return data;
}

export async function getCurrentUser() {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const data = await request('/api/auth/me', { method: 'GET' });
    return data.user;
  } catch {
    removeAuthToken();
    return null;
  }
}

export function logoutUser() {
  removeAuthToken();
}

// Catalog & Content
export async function getContentCatalog(params = {}) {
  const query = new URLSearchParams();
  if (params.genre && params.genre !== 'All') query.append('genre', params.genre);
  if (params.search) query.append('search', params.search);
  if (params.featured) query.append('featured', 'true');
  const qs = query.toString();
  return request(`/api/content${qs ? `?${qs}` : ''}`, { method: 'GET' });
}

export async function getContentDetails(id) {
  return request(`/api/content/${id}`, { method: 'GET' });
}

// Watch Parties
export async function createWatchParty({ contentId, title }) {
  return request('/api/parties', {
    method: 'POST',
    body: JSON.stringify({ contentId, title }),
  });
}

export async function getWatchParty(partyId) {
  return request(`/api/parties/${partyId}`, { method: 'GET' });
}

export async function joinWatchParty(partyId) {
  return request(`/api/parties/${partyId}/join`, { method: 'POST' });
}

export async function leaveWatchParty(partyId) {
  return request(`/api/parties/${partyId}/leave`, { method: 'POST' });
}

export async function endWatchParty(partyId) {
  return request(`/api/parties/${partyId}`, { method: 'DELETE' });
}

// Messages
export async function getPartyMessages(partyId) {
  return request(`/api/parties/${partyId}/messages`, { method: 'GET' });
}

export async function sendPartyMessage(partyId, { message, videoTime, type }) {
  return request(`/api/parties/${partyId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message, videoTime, type }),
  });
}

// AI Co-Pilot & Trivia
export async function askAiCoPilot({ contentId, currentTime, question }) {
  return request('/api/ai/ask', {
    method: 'POST',
    body: JSON.stringify({ contentId, currentTime, question }),
  });
}

export async function getSceneTrivia({ contentId, currentTime }) {
  return request('/api/ai/trivia', {
    method: 'POST',
    body: JSON.stringify({ contentId, currentTime }),
  });
}

// Narrative Variations & Voting
export async function getPartyVotes(partyId) {
  return request(`/api/parties/${partyId}/votes`, { method: 'GET' });
}

export async function castPartyVote(partyId, { variationId, optionId }) {
  return request(`/api/parties/${partyId}/vote`, {
    method: 'POST',
    body: JSON.stringify({ variationId, optionId }),
  });
}

// Recommendations
export async function getRecommendations() {
  return request('/api/recommendations', { method: 'GET' });
}
