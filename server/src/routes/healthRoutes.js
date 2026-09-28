import express from 'express';
import { getDbStatus } from '../config/db.js';

const router = express.Router();

function getHealthPayload() {
  const dbStatus = getDbStatus();
  return {
    status: dbStatus.isHealthy ? 'healthy' : 'degraded',
    service: 'Netflix AI Watch Spaces (MERN Backend)',
    project_id: 'PROJ-NETF-260919',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStatus.isHealthy ? 'healthy' : 'degraded',
      type: dbStatus.host.includes('in-memory') ? 'in-memory' : 'mongodb-atlas',
      active_url: dbStatus.host,
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

// GET /api/health
router.get('/health', (req, res) => {
  res.json(getHealthPayload());
});

// GET /api/v1/health (Frontend compatibility)
router.get('/v1/health', (req, res) => {
  res.json(getHealthPayload());
});

export default router;
