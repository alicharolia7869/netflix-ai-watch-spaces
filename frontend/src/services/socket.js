import { io } from 'socket.io-client';
import { IS_PRODUCTION, CONFIGURED_API_URL } from '../config/api.config';

let socket = null;

/**
 * Resilient In-Browser Real-Time Sync Channel for Vercel Preview/Decoupled deployments.
 * Enables two browser windows/tabs to synchronize video playback, chat, and voting in real-time
 * without throwing 404 polling errors when an external Socket.IO server is not yet attached.
 */
class LocalBroadcastSocket {
  constructor(partyId = 'global') {
    this.id = 'client_' + Math.random().toString(36).substring(2, 9);
    this.connected = true;
    this.partyId = partyId;
    this.listeners = new Map();
    this.channel = typeof window !== 'undefined' && window.BroadcastChannel
      ? new BroadcastChannel(`watchparty_sync_${partyId}`)
      : null;

    if (this.channel) {
      this.channel.onmessage = (event) => {
        const { eventName, payload, senderId } = event.data || {};
        if (!eventName || senderId === this.id) return;
        this.trigger(eventName, payload);
      };
    }
  }

  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName).add(callback);
    return this;
  }

  off(eventName, callback) {
    if (!this.listeners.has(eventName)) return this;
    if (callback) {
      this.listeners.get(eventName).delete(callback);
    } else {
      this.listeners.delete(eventName);
    }
    return this;
  }

  trigger(eventName, payload) {
    const callbacks = this.listeners.get(eventName);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(payload);
        } catch (err) {
          console.error(`Error in broadcast listener for ${eventName}:`, err);
        }
      });
    }
  }

  emit(eventName, payload = {}) {
    // Local processing & broadcast mapping
    if (this.channel) {
      this.channel.postMessage({
        eventName: this.mapOutboundEvent(eventName),
        payload: this.formatPayload(eventName, payload),
        senderId: this.id,
      });
    }

    // Also trigger locally if event produces an immediate state confirmation
    if (eventName === 'chat:send') {
      const msg = {
        _id: 'msg_' + Date.now(),
        partyId: payload.partyId || this.partyId,
        userName: payload.user?.name || 'You',
        userAvatar: payload.user?.avatar || '',
        message: payload.message,
        videoTime: payload.videoTime || 0,
        createdAt: new Date().toISOString(),
      };
      this.trigger('chat:message', msg);
    }
  }

  mapOutboundEvent(eventName) {
    switch (eventName) {
      case 'playback:play':
      case 'playback:pause':
      case 'playback:seek':
        return 'playback:update';
      case 'chat:send':
        return 'chat:message';
      case 'vote:cast':
        return 'vote:update';
      default:
        return eventName;
    }
  }

  formatPayload(eventName, payload) {
    switch (eventName) {
      case 'playback:play':
        return { isPlaying: true, currentTime: payload.currentTime, updatedAt: Date.now() };
      case 'playback:pause':
        return { isPlaying: false, currentTime: payload.currentTime, updatedAt: Date.now() };
      case 'playback:seek':
        return { isPlaying: payload.isPlaying ?? true, currentTime: payload.currentTime, updatedAt: Date.now() };
      case 'chat:send':
        return {
          _id: 'msg_' + Date.now(),
          partyId: payload.partyId || this.partyId,
          userName: payload.user?.name || 'Participant',
          userAvatar: payload.user?.avatar || '',
          message: payload.message,
          videoTime: payload.videoTime || 0,
          createdAt: new Date().toISOString(),
        };
      case 'vote:cast':
        return {
          variationId: payload.variationId,
          optionId: payload.optionId,
          totalVotes: 1,
          optionsTally: { [payload.optionId]: 1 },
        };
      default:
        return payload;
    }
  }

  disconnect() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.listeners.clear();
    this.connected = false;
  }
}

export function getSocket(partyId = 'global') {
  // If we already have a functional socket connection, return it
  if (socket) {
    return socket;
  }

  const isBrowser = typeof window !== 'undefined';
  const isLocalhost = isBrowser && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '::1'
  );

  // Determine socket target URL
  let targetUrl = '';
  if (CONFIGURED_API_URL) {
    targetUrl = CONFIGURED_API_URL.replace(/\/+$/, '');
  } else if (isLocalhost) {
    // Local dev: Vite proxies /socket.io to port 5000 or connects directly to backend
    targetUrl = window.location.origin;
  }

  // If in production on Vercel and NO external backend URL is configured,
  // do not poll Vercel static origin with 404s. Use high-performance BroadcastChannel sync.
  if (IS_PRODUCTION && !targetUrl) {
    console.info('[Sync Notice] Using real-time BroadcastChannel sync for multi-tab watch party.');
    socket = new LocalBroadcastSocket(partyId);
    return socket;
  }

  // Standalone persistent Node.js / Socket.IO server connection
  socket = io(targetUrl || window.location.origin, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('📡 Socket.IO connected successfully:', socket.id);
  });

  socket.on('connect_error', (err) => {
    // Graceful notice without crashing
    console.warn('📡 Socket.IO connection notice:', err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
