# Netflix AI Watch Spaces

**Full-Stack Engineering Project**  
**Project ID:** `PROJ-NETF-260919`  
**Track:** Full-Stack (React + FastAPI)  

---

## 1. Product Vision

Netflix AI Watch Spaces is an engineering-grade, real-time social streaming platform that blends synchronized video playback with a temporal, timeline-grounded AI Co-Pilot.

Key Capabilities:
- **Synchronized Playback:** Host-authoritative playback state machine (`play`, `pause`, `seek`, `buffering`) with sub-250ms drift correction across distributed clients.
- **Timeline-Grounded AI Co-Pilot:** RAG-based context engine answering audience questions strictly grounded in pre-authored video metadata (characters, scene context, glossary) and citing source timeline entries.
- **Interactive Narrative Variations & Trivia:** Dynamic timeline-triggered trivia cards and real-time voting on pre-authored subtitle/dialogue variations.
- **Social Watch Rooms:** Real-time WebSocket chat, typing indicators, emoji reactions, presence tracking, and host moderation.
- **Analytics & Recommendations:** Hybrid content/collaborative recommendations and watch session telemetry.

---

## 2. Technology Stack

- **Frontend:** React 19 + Vite (JavaScript / JSX)
- **Styling:** Custom Vanilla CSS Design System (Dark cinematic Netflix-inspired aesthetic)
- **Backend:** Python 3.11+ / FastAPI
- **Database:** PostgreSQL (with automatic resilient SQLite fallback for zero-dependency local dev)
- **ORM:** SQLAlchemy 2.0
- **Real-Time:** FastAPI WebSockets
- **Authentication:** JWT (JSON Web Tokens) + Passlib / Bcrypt password hashing
- **Data Validation:** Pydantic v2
- **Testing:** Pytest + HTTPX TestClient
- **Environment Management:** Python-dotenv & Pydantic-Settings

---

## 3. Directory Structure

```text
netflix-ai-watch-spaces/
├── backend/
│   ├── app/
│   │   ├── ai/              # Grounded AI Content Engine & RAG
│   │   ├── core/            # App settings and environment config
│   │   ├── database/        # Engine, sessions, and DB health
│   │   ├── models/          # SQLAlchemy database models
│   │   ├── routers/         # REST API routers (health, auth, spaces, etc.)
│   │   ├── schemas/         # Pydantic validation schemas
│   │   ├── services/        # Business logic services
│   │   ├── utils/           # Helper utilities
│   │   ├── websocket/       # WebSocket hubs, presence, & sync manager
│   │   └── main.py          # FastAPI application entrypoint
│   ├── tests/               # Pytest automated test suites
│   ├── requirements.txt     # Python backend dependencies
│   └── .env                 # Backend environment file
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # React Context providers (Auth, Sync)
│   │   ├── hooks/           # Custom React hooks
│   │   ├── pages/           # Application views
│   │   ├── services/        # API and WebSocket client services
│   │   ├── styles/          # Design system and CSS variables
│   │   ├── utils/           # Formatters and math helpers
│   │   ├── App.jsx          # Root application component
│   │   └── main.jsx         # React DOM mount point
│   ├── package.json
│   └── vite.config.js       # Vite configuration with reverse proxy
├── docs/                    # Architecture and API specifications
├── docker-compose.yml       # Containerized multi-service deployment
├── README.md                # Project documentation
├── .env.example             # Documented environment template
└── .gitignore               # Version control exclusions
```

---

## 4. Setup & Running Locally

### Prerequisites
- Node.js (v18+) & npm
- Python (3.11+)

### 4.1 Backend Setup
1. Open a terminal in the project root:
   ```bash
   # Windows PowerShell
   backend\venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
2. Interactive Swagger API Docs will be available at:
   - `http://127.0.0.1:8000/api/v1/docs`
   - Health endpoint: `http://127.0.0.1:8000/api/v1/health`

### 4.2 Frontend Setup
1. In another terminal:
   ```bash
   cd frontend
   npm run dev
   ```
2. Open your browser at `http://localhost:5173`.
   - The frontend automatically proxies API requests to port `8000`.

### 4.3 Running Automated Tests
```bash
backend\venv\Scripts\pytest.exe backend\tests -v
```

---

## 5. Development Roadmap & Status

| Phase | Description | Status |
|---|---|---|
| **Phase 1** | Architecture, Scaffolding, Health Check & Environment | **COMPLETE** |
| **Phase 2** | Database Models, Alembic Migrations, Seed Data | Next Up |
| **Phase 3** | Authentication, JWT, Roles & Protected Routes | Planned |
| **Phase 4** | Watch Space Hub & Room Controls | Planned |
| **Phase 5** | Real-Time Sync & Drift Engine | Planned |
| **Phase 6** | Video Player & Synchronized UI | Planned |
| **Phase 7** | Real-Time WebSocket Chat & Message Persistence | Planned |
| **Phase 8** | AI Content Engine (Timeline-Grounded RAG) | Planned |
| **Phase 9** | Interactive Trivia Engine | Planned |
| **Phase 10** | Subtitle & Localization Variations | Planned |
| **Phase 11** | Group Narrative Variation Voting | Planned |
| **Phase 12** | Analytics Dashboard & Telemetry | Planned |
| **Phase 13** | Hybrid Recommendation Engine | Planned |
| **Phase 14** | Admin Timeline Management | Planned |
| **Phase 15** | Automated Testing & Performance Verification | Planned |
| **Phase 16** | Documentation & Final Demo Validation | Planned |
