import {
  getEffectiveApiUrl,
  IS_PRODUCTION,
  ENDPOINTS,
} from '../config/api.config';

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
 * Universal fetch wrapper with dynamic base URL resolution, token injection,
 * and production-grade status error categorization.
 */
async function request(endpoint, options = {}) {
  const baseUrl = getEffectiveApiUrl();
  const url = `${baseUrl}${endpoint}`;
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

    // Catch SPA fallback rewrites returning HTML instead of JSON
    if (contentType.includes('text/html')) {
      const hasNoBackend = IS_PRODUCTION && !baseUrl;
      const msg = hasNoBackend
        ? 'Node.js Express backend is not connected. In Vercel Project Settings → Environment Variables, configure VITE_API_URL pointing to your deployed backend URL.'
        : `Backend endpoint returned HTML instead of JSON (${endpoint}). Verify that your Node.js server is online.`;
      throw new ApiError(msg, res.status, 'HTML_RESPONSE_ERROR');
    }

    if (!res.ok) {
      let serverErrorMsg = '';

      // Try reading backend JSON error payload
      try {
        const errorJson = await res.json();
        if (errorJson?.message) {
          serverErrorMsg = errorJson.message;
        } else if (errorJson?.error) {
          serverErrorMsg = typeof errorJson.error === 'string' ? errorJson.error : JSON.stringify(errorJson.error);
        } else if (errorJson?.detail) {
          serverErrorMsg = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
        }
      } catch {
        // Fallback to standard status interpretations
      }

      if (!serverErrorMsg) {
        if (res.status === 400) {
          serverErrorMsg = 'Invalid request. Please check your input.';
        } else if (res.status === 401) {
          serverErrorMsg = 'Your session has expired. Please sign in again.';
        } else if (res.status === 403) {
          serverErrorMsg = 'You do not have permission to perform this action.';
        } else if (res.status === 404) {
          const hasNoBackend = IS_PRODUCTION && !baseUrl;
          serverErrorMsg = hasNoBackend
            ? 'Node.js Express backend is not connected. In Vercel Project Settings → Environment Variables, configure VITE_API_URL pointing to your deployed backend URL.'
            : `Endpoint not found (${endpoint}). Check that the API route exists on the server.`;
        } else if (res.status === 409) {
          serverErrorMsg = 'An account with this email already exists.';
        } else if (res.status === 500) {
          serverErrorMsg = 'Internal server error. Please try again later.';
        } else {
          serverErrorMsg = `HTTP Error ${res.status}: ${res.statusText || 'Unknown error'}`;
        }
      }

      throw new ApiError(serverErrorMsg, res.status, `HTTP_${res.status}`);
    }

    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    if (err instanceof ApiError) throw err;

    // Detect browser network failure (e.g. server down, CORS rejection, offline)
    const isNetworkError = err instanceof TypeError && err.message.toLowerCase().includes('fetch');
    if (isNetworkError) {
      const hasNoBackend = IS_PRODUCTION && !baseUrl;
      const guidance = hasNoBackend
        ? 'Cannot reach backend. In Vercel Project Settings → Environment Variables, set VITE_API_URL to your deployed backend URL.'
        : `Unable to connect to the backend server at ${baseUrl || 'local'}. Ensure the backend service is running and CORS allows this origin.`;
      throw new ApiError(guidance, null, 'NETWORK_ERROR', err.message);
    }

    throw new ApiError(err.message || 'An unexpected error occurred.', null, 'UNKNOWN_ERROR');
  }
}

// System Health
export async function getHealthStatus(signal) {
  return request(ENDPOINTS.HEALTH, { method: 'GET', signal });
}

// Authentication
export async function registerUser({ name, email, password }) {
  const data = await request(ENDPOINTS.AUTH_REGISTER, {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
  if (data?.token) setAuthToken(data.token);
  return data;
}

export async function loginUser({ email, password }) {
  const data = await request(ENDPOINTS.AUTH_LOGIN, {
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
    const data = await request(ENDPOINTS.AUTH_ME, { method: 'GET' });
    return data.user;
  } catch (err) {
    if (err.status === 401) {
      removeAuthToken();
    }
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
  return request(`${ENDPOINTS.CONTENT}${qs ? `?${qs}` : ''}`, { method: 'GET' });
}

export async function getContentDetails(id) {
  return request(`${ENDPOINTS.CONTENT}/${id}`, { method: 'GET' });
}

// Watch Parties
export async function createWatchParty({ contentId, title }) {
  return request(ENDPOINTS.PARTIES, {
    method: 'POST',
    body: JSON.stringify({ contentId, title }),
  });
}

export async function getWatchParty(partyId) {
  return request(`${ENDPOINTS.PARTIES}/${partyId}`, { method: 'GET' });
}

export async function joinWatchParty(partyId) {
  return request(`${ENDPOINTS.PARTIES}/${partyId}/join`, { method: 'POST' });
}

export async function leaveWatchParty(partyId) {
  return request(`${ENDPOINTS.PARTIES}/${partyId}/leave`, { method: 'POST' });
}

export async function endWatchParty(partyId) {
  return request(`${ENDPOINTS.PARTIES}/${partyId}`, { method: 'DELETE' });
}

// Messages
export async function getPartyMessages(partyId) {
  return request(`${ENDPOINTS.PARTIES}/${partyId}/messages`, { method: 'GET' });
}

export async function sendPartyMessage(partyId, { message, videoTime, type }) {
  return request(`${ENDPOINTS.PARTIES}/${partyId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message, videoTime, type }),
  });
}

// AI Co-Pilot & Trivia
export async function askAiCoPilot({ contentId, currentTime, question }) {
  return request(ENDPOINTS.AI_ASK, {
    method: 'POST',
    body: JSON.stringify({ contentId, currentTime, question }),
  });
}

export async function getSceneTrivia({ contentId, currentTime }) {
  return request(ENDPOINTS.AI_TRIVIA, {
    method: 'POST',
    body: JSON.stringify({ contentId, currentTime }),
  });
}

// Narrative Variations & Voting
export async function getPartyVotes(partyId) {
  return request(`${ENDPOINTS.PARTIES}/${partyId}/votes`, { method: 'GET' });
}

export async function castPartyVote(partyId, { variationId, optionId }) {
  return request(`${ENDPOINTS.PARTIES}/${partyId}/vote`, {
    method: 'POST',
    body: JSON.stringify({ variationId, optionId }),
  });
}

// Recommendations
export async function getRecommendations() {
  return request(ENDPOINTS.RECOMMENDATIONS, { method: 'GET' });
}
