# Netflix AI Watch Spaces

**Full-Stack MERN Social Streaming Platform with Grounded AI Intelligence**  
**Project ID:** `PROJ-NETF-260919`  
**Track:** Full-Stack MERN (React 19 + Node.js/Express + Socket.IO + Mongoose + MongoDB Atlas)

---

## 1. Architecture Overview

```text
                    ┌─────────────────────────┐
                    │  React 19 Client (Vite) │
                    │    Hosted on Vercel     │
                    └────────────┬────────────┘
                                 │
                      REST API + Socket.IO
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │  Node.js / Express App  │
                    │  Production Web Service │
                    └────────────┬────────────┘
                                 │
             ┌───────────────────┼───────────────────┐
             │                   │                   │
             ▼                   ▼                   ▼
       ┌───────────┐      ┌─────────────┐     ┌─────────────┐
       │ Socket.IO │      │  AI Engine  │     │ Auth & APIs │
       │ Sync Hub  │      └──────┬──────┘     └─────────────┘
       └───────────┘             │
                                 ▼
                          ┌─────────────┐
                          │ Scene RAG & │
                          │ Timeline DB │
                          └──────┬──────┘
                                 │
                                 ▼
                          ┌─────────────┐
                          │ LLM API /   │
                          │ Fallback    │
                          └─────────────┘
                                 │
                                 ▼
                          ┌─────────────┐
                          │   Mongoose  │
                          └──────┬──────┘
                                 │
                                 ▼
                          ┌─────────────┐
                          │   MongoDB   │
                          │    Atlas    │
                          └─────────────┘
```

---

## 2. Core Capabilities

1. **Movie Catalog**: Browse open licensed creative-commons cinematic works (*Tears of Steel*, *Sintel*, *Big Buck Bunny*) with detailed scene breakdowns, duration, genre, and parental ratings.
2. **Watch Party System**: Instant space generation with unique alphanumeric party codes (`wp-xxxxxx`), host authority, and live participant presence.
3. **Sub-250ms Playback Synchronization**: Socket.IO bi-directional playback engine transmitting host `play`, `pause`, and `seek` commands with automated drift compensation.
4. **Real-Time Watch Party Chat**: Live chat with timestamp tagging linked directly to current video playback time.
5. **Timeline-Grounded AI Co-Pilot**: Active scene detection mapping the video's current second to pre-authored lore, character relationships, and key dialogue, returning grounded answers with timeline citations.
6. **Approved Contextual Trivia**: Real-time filmmaking, easter egg, and behind-the-scenes facts tailored to the active scene.
7. **Narrative & Localization Variations**: Viewers and hosts vote in real-time on alternate subtitle styles, soundtrack moods, and scene variations.
8. **Personalized Recommendations**: Content-based recommendation scoring based on user watch history and favorite genres.
9. **MongoDB Atlas Persistence**: Full Mongoose models for `User`, `Content`, `WatchParty`, `ChatMessage`, `Vote`, and `Recommendation`.

---

## 3. Directory Layout

```text
netflix-ai-watch-spaces/
├── frontend/                     # React 19 Client SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── AuthModal.jsx     # Login / Register / Demo login
│   │   │   ├── ContentCatalog.jsx# Movie browser & recommendations
│   │   │   ├── HostPartyModal.jsx# Create / Join watch parties
│   │   │   └── WatchPartyRoom.jsx# Synced player, chat, AI Co-Pilot, votes
│   │   ├── config/
│   │   │   └── api.config.js     # Universal URL & environment resolution
│   │   ├── services/
│   │   │   ├── api.js            # REST API client with error handling
│   │   │   └── socket.js         # Socket.IO connection manager
│   │   ├── styles/
│   │   │   └── index.css         # Dark cinematic Netflix design system
│   │   ├── App.jsx               # Main root app component
│   │   └── main.jsx
│   ├── vercel.json               # Vercel SPA routing (excludes /api/)
│   └── package.json
├── server/                       # Node.js + Express Backend
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js             # Mongoose MongoDB Atlas + In-Memory fallback
│   │   ├── data/
│   │   │   └── seedContent.js    # Seed catalog with scenes, trivia, variations
│   │   ├── middleware/
│   │   │   └── auth.js           # JWT authentication middleware
│   │   ├── models/
│   │   │   ├── User.js           # User schema & password hashing
│   │   │   ├── Content.js        # Content, scenes, trivia, variations schema
│   │   │   ├── WatchParty.js     # Party room state & playback schema
│   │   │   ├── ChatMessage.js    # Chat messages with video timestamp
│   │   │   ├── Vote.js           # Narrative variation voting schema
│   │   │   └── Recommendation.js # Recommendation schema
│   │   ├── routes/               # Express REST routers
│   │   ├── services/
│   │   │   ├── aiService.js      # Retrieval-grounded AI Co-Pilot & trivia
│   │   │   ├── recommendationService.js # Content-based recommender
│   │   │   └── seedService.js    # Initial catalog & demo user seeding
│   │   ├── socket/
│   │   │   └── socketHandler.js  # Socket.IO real-time synchronization hub
│   │   └── index.js              # Server entrypoint with Helmet, CORS & Socket.IO
│   ├── test/
│   │   └── server.test.js        # 11 Automated integration tests
│   └── package.json
└── README.md
```

---

## 4. Setup & Running Locally

### Prerequisites
- Node.js (v18+) & npm

### 4.1 Backend (Node.js + Express)
```bash
cd server
npm install
npm run dev
```
*Note: If no `MONGODB_URI` is provided, the backend automatically boots a resilient in-memory MongoDB engine for zero-dependency local development!*

### 4.2 Frontend (React 19 + Vite)
```bash
cd frontend
npm install
npm run dev
```
Open your browser at `http://localhost:5173`. Vite automatically proxies `/api` and `/socket.io` to port `5000`.

### 4.3 Running Tests
```bash
cd server
npm test
```
All 11 test suites verify authentication, catalog, watch parties, Socket.IO handlers, AI Q&A, trivia, votes, and recommendations.

---

## 5. Deployment Guide

### Frontend on Vercel
1. Root directory in Vercel project settings: `frontend`.
2. Add Environment Variable in Vercel:
   - `VITE_API_URL`: Your deployed backend URL (e.g. `https://your-backend.railway.app` or `https://your-backend.onrender.com`).
3. Deploy!

### Backend on Node.js Host (Railway, Render, Fly.io, or AWS)
1. Root directory: `server`.
2. Configure Environment Variables:
   - `PORT`: `5000` (or host provided port)
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: Your MongoDB Atlas cluster connection string (`mongodb+srv://...`)
   - `FRONTEND_URL`: `https://frontend-ali-charolia.vercel.app`
   - `JWT_SECRET`: A secure 64-character random string
   - `OPENAI_API_KEY`: (Optional) OpenAI API key for live GPT-4o-mini generation.
3. Start command: `npm start` (runs `node src/index.js`).
