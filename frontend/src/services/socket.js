import { io } from 'socket.io-client';
import { getWebSocketUrl, DEFAULT_PRODUCTION_BACKEND_URL } from '../config/api.config';
import { getAuthToken } from './api';

let activeSocket = null;
let currentConnectedUrl = null;

/**
 * Socket.IO Real-Time Client Manager
 * Netflix AI Watch Spaces - PROJ-NETF-260919
 *
 * Connects directly to the persistent Node.js Express + Socket.IO backend.
 * Provides bi-directional video playback sync, presence, live chat, and variation voting.
 */
export function getSocket(_partyId = 'global') {
  let targetUrl = getWebSocketUrl();

  const isBrowser = typeof window !== 'undefined';
  const isLocalhost = isBrowser && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '::1'
  );

  // In production on Vercel, prevent connecting to window.location.origin (which returns HTML & triggers parser errors)
  if (isBrowser && !isLocalhost) {
    if (!targetUrl || targetUrl === window.location.origin || targetUrl.includes('vercel.app')) {
      targetUrl = DEFAULT_PRODUCTION_BACKEND_URL;
    }
  }

  const connectionUrl = targetUrl || (isBrowser && isLocalhost ? window.location.origin : 'http://localhost:5000');

  // If already connected to the same backend URL, reuse socket
  if (activeSocket && currentConnectedUrl === connectionUrl) {
    return activeSocket;
  }

  // If connectionUrl changed or socket disconnected, close previous connection
  if (activeSocket) {
    activeSocket.disconnect();
    activeSocket = null;
  }

  currentConnectedUrl = connectionUrl;

  activeSocket = io(connectionUrl, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    auth: {
      token: getAuthToken(),
    },
  });

  activeSocket.on('connect', () => {
    console.log(`📡 Connected to Watch Spaces Real-Time Hub (${activeSocket.id}) at ${connectionUrl}`);
  });

  activeSocket.on('connect_error', (err) => {
    console.warn(`📡 Real-Time connection notice (${connectionUrl}):`, err.message);
  });

  return activeSocket;
}

export function disconnectSocket() {
  if (activeSocket) {
    activeSocket.disconnect();
    activeSocket = null;
    currentConnectedUrl = null;
  }
}
