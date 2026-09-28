import { io } from 'socket.io-client';
import { getWebSocketUrl, IS_PRODUCTION } from '../config/api.config';
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
  const targetUrl = getWebSocketUrl();

  // If already connected to the same backend URL, reuse socket
  if (activeSocket && currentConnectedUrl === targetUrl) {
    return activeSocket;
  }

  // If targetUrl changed or socket disconnected, close previous connection
  if (activeSocket) {
    activeSocket.disconnect();
    activeSocket = null;
  }

  currentConnectedUrl = targetUrl;

  const isBrowser = typeof window !== 'undefined';
  const connectionUrl = targetUrl || (isBrowser ? window.location.origin : 'http://localhost:5000');

  // If in production on Vercel and NO external backend URL is configured
  if (IS_PRODUCTION && !targetUrl) {
    console.warn(
      '⚠️ [Real-Time Warning] No deployed backend URL configured. Real-time Socket.IO sync requires VITE_API_URL.'
    );
  }

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
