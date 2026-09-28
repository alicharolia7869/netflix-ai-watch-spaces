import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { connectDB, disconnectDB } from './config/db.js';
import { seedDatabaseIfEmpty } from './services/seedService.js';
import { setupSocketIO } from './socket/socketHandler.js';

import authRoutes from './routes/authRoutes.js';
import contentRoutes from './routes/contentRoutes.js';
import partyRoutes from './routes/partyRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import voteRoutes from './routes/voteRoutes.js';
import recommendationRoutes from './routes/recommendationRoutes.js';
import healthRoutes from './routes/healthRoutes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

// Permitted CORS origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'https://frontend-ali-charolia.vercel.app',
  'https://frontend-snowy-nine-54.vercel.app',
];

if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL.split(',').forEach((url) => {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    if (cleanUrl && !allowedOrigins.includes(cleanUrl)) {
      allowedOrigins.push(cleanUrl);
    }
  });
}

const isProduction = process.env.NODE_ENV === 'production';

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. curl, server-to-server, health probes)
    if (!origin) return callback(null, true);

    const isExplicitlyAllowed = allowedOrigins.includes(origin);
    const isVercelPreview = origin.endsWith('.vercel.app');
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');

    if (isExplicitlyAllowed || isVercelPreview || (!isProduction && isLocalhost)) {
      return callback(null, true);
    }

    if (!isProduction) {
      // In development, be permissive to facilitate testing
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS policy.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // Don't block external video media / CDNs
  })
);
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoints (Mounted at root /health for cloud platforms, and /api for compatibility)
app.use('/', healthRoutes);
app.use('/api', healthRoutes);

// Rate limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication requests from this IP, please try again later.' },
});

// Mount Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/parties', partyRoutes);
app.use('/api/parties', chatRoutes);
app.use('/api/parties', voteRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/recommendations', recommendationRoutes);

// Root informational endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Netflix AI Watch Spaces (MERN Backend)',
    status: 'online',
    version: '2.0.0',
    documentation: '/api/health',
    endpoints: {
      health: '/api/v1/health',
      content: '/api/content',
      parties: '/api/parties',
      ai: '/api/ai/ask',
      recommendations: '/api/recommendations',
    },
  });
});

// Initialize Socket.IO
const io = new Server(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
});
setupSocketIO(io);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found.` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'production' ? undefined : err.message,
  });
});

// Start Server
async function startServer() {
  try {
    await connectDB();
    await seedDatabaseIfEmpty();

    server.listen(PORT, () => {
      console.log(`==================================================`);
      console.log(`🚀 Netflix AI Watch Spaces Backend running on port ${PORT}`);
      console.log(`📡 WebSocket / Socket.IO Hub ready`);
      console.log(`🔍 Health Check: http://localhost:${PORT}/api/v1/health`);
      console.log(`🎬 Movie Catalog: http://localhost:${PORT}/api/content`);
      console.log(`==================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful termination
process.on('SIGINT', async () => {
  console.log('\nGracefully shutting down server...');
  await disconnectDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nSIGTERM received. Shutting down...');
  await disconnectDB();
  process.exit(0);
});

startServer();
