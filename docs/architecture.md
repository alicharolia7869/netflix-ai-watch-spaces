# System Architecture — Netflix AI Watch Spaces

**Project ID:** PROJ-NETF-260919  
**Platform:** Netflix AI Watch Spaces  

## 1. Executive Overview

Netflix AI Watch Spaces provides an immersive, synchronized social streaming experience with:
- **Authoritative Playback Synchronization:** Host controls state machine (play/pause/seek) with sub-250ms target client drift correction.
- **Timeline-Grounded AI Co-Pilot:** RAG-based context engine answering questions strictly against authored narrative timelines and returning source event IDs.
- **Interactive Narrative Variations & Trivia:** Dynamic timeline-triggered trivia cards and participant voting on pre-authored subtitle/dialogue variations.
- **Real-Time Collaboration & Analytics:** WebSocket chat, participant presence, and session-level engagement tracking.

---

## 2. High-Level Architecture Diagram

```mermaid
graph TD
    subgraph Frontend [React + Vite Client (JavaScript)]
        UI[Cinematic Streaming UI]
        VP[HTML5 Synchronized Video Player]
        WS_C[WebSocket Client & Drift Corrector]
        AI_P[AI Co-Pilot Panel]
        CHAT_P[Live Chat & Reactions]
    end

    subgraph Backend [FastAPI Application]
        ROUTER[REST Routers /api/v1]
        WS_HUB[WebSocket Room Hub & Event Dispatcher]
        SYNC_MGR[Authoritative Playback Sync Manager]
        AI_ENG[AI Content Engine]
        AUTH_SVC[JWT & RBAC Security Service]
    end

    subgraph Data_Stores [Persistence Layer]
        PG[(PostgreSQL / SQLite Storage)]
        TL_META[Authored Video Timelines & Variation Data]
    end

    subgraph External_AI [Inference]
        LLM[OpenAI-Compatible LLM API / Local Fallback]
    end

    UI -->|User Interactions| ROUTER
    VP <-->|Sync State Updates| WS_C
    WS_C <-->|Bi-directional WebSocket Events| WS_HUB
    WS_HUB --> SYNC_MGR
    ROUTER --> AUTH_SVC
    ROUTER --> AI_ENG
    AI_ENG -->|Retrieve Grounded Context| TL_META
    AI_ENG -->|Inference Query| LLM
    AUTH_SVC --> PG
    ROUTER --> PG
```

---

## 3. Core Subsystems

### 3.1 Real-Time Synchronization Subsystem
- **Authoritative Host:** Host client emits playback state mutations (`play`, `pause`, `seek`, `buffering`).
- **Heartbeat & Drift Measurement:** Clients periodically report `(currentTime, clientTimestamp)`. The server computes drift relative to the authoritative clock and emits gentle speed adjustment or soft seek recommendations when drift exceeds threshold.
- **Host Disconnect Safeguard:** If the host drops, the room state transitions to `paused` with clear notifications to all participants.

### 3.2 AI Content Engine
- **Pre-Authored Timeline Indexing:** Events (character entries, plot points, trivia, glossary definitions) are timestamped and ingested.
- **Windowed Temporal Retrieval:** Upon user query at timestamp $T$, the engine fetches metadata in window $[T - \Delta t, T]$.
- **Strict Grounding:** The prompt forbids extrapolation and requires citing source timeline event IDs. If context is missing, it returns an explicit unanswerable fallback.

### 3.3 Security & Role-Based Access Control (RBAC)
- **Roles:** `viewer`, `host`, `admin`.
- **Enforcement:** Enforced at both FastAPI dependency layer (REST) and WebSocket event envelope validation.
