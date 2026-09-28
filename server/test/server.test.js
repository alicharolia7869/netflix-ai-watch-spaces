import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { seedDatabaseIfEmpty } from '../src/services/seedService.js';
import { setupSocketIO } from '../src/socket/socketHandler.js';

import authRoutes from '../src/routes/authRoutes.js';
import contentRoutes from '../src/routes/contentRoutes.js';
import partyRoutes from '../src/routes/partyRoutes.js';
import chatRoutes from '../src/routes/chatRoutes.js';
import aiRoutes from '../src/routes/aiRoutes.js';
import voteRoutes from '../src/routes/voteRoutes.js';
import recommendationRoutes from '../src/routes/recommendationRoutes.js';
import healthRoutes from '../src/routes/healthRoutes.js';

let server;
let baseUrl;
let authToken = '';
let createdPartyId = '';
let sampleContentId = '';

test.before(async () => {
  await connectDB();
  await seedDatabaseIfEmpty();

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/content', contentRoutes);
  app.use('/api/parties', partyRoutes);
  app.use('/api/parties', chatRoutes);
  app.use('/api/parties', voteRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/recommendations', recommendationRoutes);
  app.use('/api', healthRoutes);

  server = http.createServer(app);
  const io = new Server(server);
  setupSocketIO(io);

  await new Promise((resolve) => {
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await disconnectDB();
});

test('GET /api/v1/health returns healthy status and DB metadata', async () => {
  const res = await fetch(`${baseUrl}/api/v1/health`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'healthy');
  assert.equal(data.database.status, 'healthy');
  assert.equal(data.realtime.engine, 'Socket.IO');
});

test('GET /api/content retrieves seeded catalog', async () => {
  const res = await fetch(`${baseUrl}/api/content`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.count >= 3);
  assert.ok(data.items[0].title);
  assert.ok(data.items[0].scenes.length > 0);
  sampleContentId = data.items[0]._id;
});

test('POST /api/auth/register creates new account and returns JWT token', async () => {
  const email = `test-${Date.now()}@netflix.ai`;
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Jordan Lee',
      email,
      password: 'SecurePassword123!',
    }),
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  assert.ok(data.token);
  assert.equal(data.user.name, 'Jordan Lee');
  authToken = data.token;
});

test('POST /api/auth/login authenticates registered user', async () => {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'alex@netflix.ai',
      password: 'Password123!',
    }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.token);
  assert.equal(data.user.email, 'alex@netflix.ai');
});

test('POST /api/parties creates a watch party with unique partyId', async () => {
  const res = await fetch(`${baseUrl}/api/parties`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      contentId: sampleContentId,
      title: 'Tears of Steel Premiere Space',
    }),
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  assert.ok(data.partyId.startsWith('wp-'));
  assert.equal(data.title, 'Tears of Steel Premiere Space');
  assert.equal(data.status, 'active');
  createdPartyId = data.partyId;
});

test('GET /api/parties/:partyId fetches party details', async () => {
  const res = await fetch(`${baseUrl}/api/parties/${createdPartyId}`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.partyId, createdPartyId);
  assert.ok(data.contentId);
});

test('POST /api/parties/:partyId/join adds participant', async () => {
  const res = await fetch(`${baseUrl}/api/parties/${createdPartyId}/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.participants.length >= 1);
});

test('POST /api/ai/ask answers scene-grounded questions with citations', async () => {
  const res = await fetch(`${baseUrl}/api/ai/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contentId: sampleContentId,
      currentTime: 120,
      question: 'Who is Thom talking to in this scene?',
    }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.answer.includes('Thom'));
  assert.ok(data.answer.includes('[Timeline Citation:'));
  assert.equal(data.grounded, true);
});

test('POST /api/ai/trivia retrieves contextual facts', async () => {
  const res = await fetch(`${baseUrl}/api/ai/trivia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contentId: sampleContentId,
      currentTime: 50,
    }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.fact);
  assert.ok(data.category);
});

test('POST /api/parties/:partyId/vote records variation vote and prevents duplicates', async () => {
  const res = await fetch(`${baseUrl}/api/parties/${createdPartyId}/vote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      variationId: 'var-tos-01',
      optionId: 'opt-synth',
    }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.userChoice, 'opt-synth');
  assert.equal(data.totalVotes, 1);
});

test('GET /api/recommendations returns scored content suggestions', async () => {
  const res = await fetch(`${baseUrl}/api/recommendations`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.items));
  assert.ok(data.items.length > 0);
  assert.ok(data.items[0].score > 0);
});
