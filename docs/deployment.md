# Production Deployment Guide: Netflix AI Watch Spaces

**Project ID:** `PROJ-NETF-260919`  
**Stack:** Decoupled Full-Stack MERN (React 19 + Node.js Express + Socket.IO + Mongoose + MongoDB Atlas)

---

## 1. Architecture Overview

```text
                  ┌──────────────────────────────┐
                  │ Vercel (Edge CDN)            │
                  │ React 19 Client SPA          │
                  │ https://frontend-ali-charolia.vercel.app │
                  └──────────────┬───────────────┘
                                 │
                   HTTPS (REST)  │  WSS (Socket.IO)
                                 ▼
                  ┌──────────────────────────────┐
                  │ Render / Railway / Fly.io    │
                  │ Persistent Node.js Server    │
                  │ Root directory: /server      │
                  │ Command: npm start           │
                  └──────────────┬───────────────┘
                                 │
                                 ▼ TLS (Mongoose)
                  ┌──────────────────────────────┐
                  │ MongoDB Atlas Cluster        │
                  │ M0 Free Tier or Dedicated    │
                  └──────────────────────────────┘
```

---

## 2. Step 1: Deploy MongoDB Atlas

1. Sign in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new Cluster (e.g. `M0 Free Tier` in your preferred cloud region).
3. Under **Database Access**, create a database user:
   - Authentication Method: `Password`
   - Role: `Read and write to any database`
4. Under **Network Access**, add an IP Access List entry:
   - Add `0.0.0.0/0` (Allow access from anywhere) so cloud platforms like Render or Railway can connect.
5. In **Database → Clusters**, click **Connect → Drivers (Node.js)**.
6. Copy the connection string. It will look like:
   ```text
   mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/watchspaces?retryWrites=true&w=majority
   ```
   *(Replace `<username>` and `<password>` with your database user credentials)*.

---

## 3. Step 2: Deploy Express Backend (Render / Railway / Fly.io)

### Option A: Deploy on Render (Recommended & Zero Configuration)
1. Sign in to [Render](https://dashboard.render.com/).
2. Click **New + → Web Service**.
3. Connect your GitHub repository: `alicharolia7869/netflix-ai-watch-spaces`.
4. Configure service settings:
   - **Name:** `netflix-ai-watch-spaces-backend`
   - **Root Directory:** `server`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Configure Environment Variables (under **Advanced → Environment Variables**):
   | Key | Value | Purpose |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | Enforces production optimizations & CORS checks |
   | `PORT` | `10000` *(or left blank, Render auto-sets PORT)* | HTTP & WebSocket server port |
   | `MONGODB_URI` | `mongodb+srv://...` | MongoDB Atlas cluster connection string |
   | `FRONTEND_URL` | `https://frontend-ali-charolia.vercel.app` | Whitelists your Vercel domain for CORS & credentials |
   | `JWT_SECRET` | *`<Generate a 64-char random string>`* | Signs session JWT authentication tokens |
   | `OPENAI_API_KEY` | *(Optional: your OpenAI API key)* | Optional for live GPT-4o-mini generation |
6. Click **Deploy Web Service**.
7. Once deployed, Render will provide your public backend URL, e.g.:
   ```text
   https://netflix-ai-watch-spaces-backend.onrender.com
   ```

### Option B: Deploy on Railway
1. Sign in to [Railway](https://railway.app/).
2. Click **New Project → Deploy from GitHub Repo**.
3. Select `netflix-ai-watch-spaces`.
4. In Settings:
   - Set **Root Directory** to `/server`.
5. In Variables, add:
   - `NODE_ENV=production`
   - `MONGODB_URI=mongodb+srv://...`
   - `FRONTEND_URL=https://frontend-ali-charolia.vercel.app`
   - `JWT_SECRET=<your-64-character-jwt-secret>`
6. In Settings → Networking, click **Generate Domain**. You will receive:
   ```text
   https://netflix-ai-watch-spaces.up.railway.app
   ```

---

## 4. Step 3: Populate Movie Catalog & Demo Account

The backend automatically seeds 3 open-licensed films and the demo user (`alex@netflix.ai` / `Password123!`) on initial connection if the database is empty.

To manually re-seed or populate your remote database at any time, run:
```bash
cd server
MONGODB_URI="mongodb+srv://..." npm run seed
```

---

## 5. Step 4: Configure VITE_API_URL in Vercel

Because Vite bundles environment variables into the static JavaScript application at **build time**, `VITE_API_URL` must be configured in Vercel before the production build runs.

1. Navigate to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Select project: `frontend-ali-charolia` (or `netflix-ai-watch-spaces`).
3. Go to **Settings → Environment Variables**.
4. Add the following variable:
   - **Key:** `VITE_API_URL`
   - **Value:** `https://your-backend.onrender.com` *(your actual deployed backend URL, without trailing slash)*
   - **Target Environments:** Check `Production`, `Preview`, and `Development`.
5. Click **Save**.

---

## 6. Step 5: Redeploy Vercel Frontend

To compile the newly configured `VITE_API_URL` into your client bundle:
1. In Vercel, go to the **Deployments** tab.
2. Click the three dots (`...`) next to the latest production deployment.
3. Click **Redeploy** (ensure "Use existing Build Cache" is unchecked for a clean build).
4. Once completed, your Vercel frontend at `https://frontend-ali-charolia.vercel.app/` will be directly connected to your persistent backend.

---

## 7. Step 6: Verify Production Subsystems

Open `https://frontend-ali-charolia.vercel.app/`:

1. **Root Health Check**:
   In your browser, visit `https://your-backend.onrender.com/health`.
   Expected response:
   ```json
   {
     "status": "ok",
     "service": "netflix-ai-watch-spaces-backend",
     "project_id": "PROJ-NETF-260919",
     "version": "2.0.0",
     "environment": "production",
     "database": {
       "status": "healthy",
       "type": "mongodb-atlas",
       "database": "watchspaces"
     },
     "realtime": {
       "engine": "Socket.IO",
       "status": "active"
     }
   }
   ```
2. **Frontend Subsystem Health View**:
   Click **System Health** tab in the top navigation. Verify that:
   - Node.js / Express displays **Active / Online** (Green).
   - MongoDB Atlas displays **HEALTHY** (Green).
   - Socket.IO Real-Time displays **Active** (Green).
3. **Authentication**:
   Click **Sign In → Use Pre-Seeded Demo Account (alex@netflix.ai) → Sign In**.
   Or click **Register Now**, enter your name, email, and password to test account registration.
4. **Host / Join Watch Space**:
   Click **Host / Join Party → Create Watch Space**. A unique party code (`wp-xxxxxx`) is issued.
5. **Multi-Window Playback Sync**:
   Open a second incognito browser window, join the party using the invite code, and test host playback `Play`, `Pause`, and `Seek` controls. Sub-250ms synchronization will coordinate both player states.

---

## 8. Diagnostic & Troubleshooting Checklist

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| `Node.js Express backend is not connected...` | `VITE_API_URL` missing or frontend not redeployed | In Vercel Project Settings, verify `VITE_API_URL` is set, then trigger **Redeploy**. Alternatively, click **Backend Online/Offline** in the header to set the URL dynamically in browser storage. |
| `CORS Error / Origin not allowed` | Backend `FRONTEND_URL` does not match Vercel domain | Add your Vercel domain to `FRONTEND_URL` environment variable on Render/Railway. |
| `MongoServerSelectionError` | MongoDB Atlas Network Access blocked | In MongoDB Atlas → Network Access, verify `0.0.0.0/0` is added to the IP Access List. |
| `Socket.IO 404 polling error` | Frontend trying to connect to Vercel origin for WebSockets | Verify `VITE_API_URL` is configured pointing to the persistent Node.js server. |
| `Invalid authentication token` | `JWT_SECRET` changed or mismatch between sessions | Log out and log back in, or clear browser cookies/localStorage. |
