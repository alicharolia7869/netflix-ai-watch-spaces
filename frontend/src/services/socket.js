import { io } from 'socket.io-client';
import { API_BASE_URL } from '../config/api.config';

let socket = null;

export function getSocket() {
  if (!socket) {
    // If API_BASE_URL is set, connect directly; otherwise connect to same origin
    const socketUrl = API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('Socket.IO connected to server:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket.IO connection notice:', err.message);
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
