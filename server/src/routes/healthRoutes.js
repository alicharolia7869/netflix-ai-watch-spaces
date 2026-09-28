import express from 'express';
import { getDbStatus } from '../config/db.js';

const router = express.Router();

function getHealthPayload() {
  const dbStatus = getDbStatus();
  return {
    status: dbStatus.isHealthy ? 'ok' : 'degraded',
    service: 'netflix-ai-watch-spaces-backend',
    project_id: 'PROJ-NETF-260919',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStatus.isHealthy ? 'healthy' : 'degraded',
      type: dbStatus.type,
      database: dbStatus.name,
    },
    realtime: {
      engine: 'Socket.IO',
      status: 'active',
    },
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  };
}

// GET /health (Root Health Check for Cloud PaaS: Render, Railway, Fly.io, AWS)
router.get('/health', (req, res) => {
  res.json(getHealthPayload());
});

// GET /v1/health & /api/v1/health (Frontend Compatibility)
router.get('/v1/health', (req, res) => {
  res.json(getHealthPayload());
});

export default router;

