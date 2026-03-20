# Endgame Securities

Endgame Securities is a beginner-first investing simulation game built for StartHack 2026.
Players practice portfolio decisions in a safe environment: read market headlines, allocate capital, advance through rounds, and get scored on performance and risk behavior.

This repository is a monorepo with:
- a React + Vite frontend (`frontend/wealth-arena`)
- a FastAPI backend (`backend`)
- a narrative/news module (`news_agent`)

## What Is In This Repo

- `frontend/wealth-arena`: Main web app (auth, dashboard, daily puzzle, sandbox, party mode, markets pages)
- `backend`: API for auth, party rooms, deterministic scenario simulation, and market data endpoints
- `news_agent`: Historical-news and narrative generation utilities (template/Gemini-capable composer)
- `README GAME.md`, `README BUSINESS.md`, `README BUILD.md`: Product/business/implementation notes from hackathon planning

## Tech Stack

- Frontend: React 19, TypeScript, Vite, Tailwind, Recharts
- Backend: FastAPI, Pydantic, SQLAlchemy, SQLite, JWT auth, WebSockets
- AI/Narrative: `news_agent` composer (template-only by default, Gemini optional)

## Quick Start

### 1) Start the Backend

```bash
cd backend
python3 -m pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend URLs:
- API: `http://localhost:8000`
- Health: `http://localhost:8000/health`
- Swagger: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### 2) Start the Frontend

```bash
cd frontend/wealth-arena
npm install
npm run dev
```

Frontend URL:
- Vite local URL shown in terminal (typically `http://localhost:5173`, or next free port)

## Environment Variables

### Backend (`backend/.env`)

Copy `backend/.env.example` to `backend/.env` and set values as needed.

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | Optional currently | Reserved for summary/hint services (not fully implemented yet) |
| `GEMINI_API_KEY` | Optional | Enables Gemini mode in backend news composer |
| `JWT_SECRET` | Recommended | JWT signing secret (falls back to hackathon default if missing) |

### Frontend (`frontend/wealth-arena/.env`)

Copy `frontend/wealth-arena/.env.example` to `frontend/wealth-arena/.env`.

| Variable | Required | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | Recommended | Backend REST base URL (default fallback: `http://<host>:8000`) |
| `VITE_WS_BASE_URL` | Optional | Backend WS base URL for party mode (default fallback: `ws://<host>:8000`) |
| `VITE_GEMINI_API_KEY` | Optional | Frontend-side news explanation helper |
| `VITE_FIREBASE_API_KEY` | App-dependent | Firebase config |
| `VITE_FIREBASE_AUTH_DOMAIN` | App-dependent | Firebase config |
| `VITE_FIREBASE_PROJECT_ID` | App-dependent | Firebase config |
| `VITE_FIREBASE_STORAGE_BUCKET` | App-dependent | Firebase config |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | App-dependent | Firebase config |
| `VITE_FIREBASE_APP_ID` | App-dependent | Firebase config |
| `VITE_FIREBASE_DATABASE_URL` | App-dependent | Firebase config |

## Product Flow (Current App)

1. Sign up / log in
2. Choose mode:
   - Daily Puzzle
   - Sandbox
   - Party (host/join room)
3. Read round headlines and distinguish signal vs noise
4. Allocate portfolio across supported asset classes
5. Advance rounds and monitor returns/risk
6. Review rankings/results

Branding in current frontend: **Endgame Securities**

## API Overview

### Auth (`/auth`)
- `POST /auth/signup`
- `POST /auth/login`
- `GET /auth/me`
- `PUT /auth/me`

### Party (`/party`)
- `POST /party/create`
- `POST /party/join/{room_code}`
- `GET /party/{room_code}`
- `POST /party/{room_code}/start`
- `GET /party/{room_code}/rankings`
- `WS /party/ws/{room_code}` (real-time room sync and leaderboard updates)

### Scenario Simulation (`/scenario`)
- `POST /scenario/create`
- `GET /scenario/{scenario_id}`
- `POST /scenario/allocate`
- `POST /scenario/advance`

Notes:
- Turn math is deterministic.
- News is generated after turn computation and stored in `news_history`.

### Data (`/data`)
- `GET /data/summary`
- `GET /data/assets`
- `GET /data/calibration`
- `GET /data/calibration/{symbol}`

### Stubbed/Planned Endpoints
- `POST /portfolio/evaluate` (returns 501 currently)
- `POST /summary/generate` (returns 501 currently)
- `POST /summary/hint` (returns 501 currently)

## Testing

### Backend tests

```bash
cd backend
pytest -q
```

### News agent tests

```bash
python3 -m pytest news_agent/tests/ -v
```

## Architecture Notes

- Deterministic game state and turn progression live in backend services.
- Scenario state is currently stored in an in-memory store (`backend/app/services/store.py`).
- User/party data persists in SQLite (`backend/arena.db`) via SQLAlchemy.
- Party mode uses REST for room lifecycle and WebSocket for live updates.
- News/narrative is an output layer and does not drive simulation math.

## Troubleshooting

- Frontend cannot connect to backend:
  - Ensure backend is running on port `8000`
  - Set `VITE_API_BASE_URL=http://localhost:8000` in frontend `.env`
- Vite import errors after pull:
  - run `npm install` again in `frontend/wealth-arena`
  - restart `npm run dev`
- JWT/auth issues:
  - set a stable `JWT_SECRET` in backend `.env`
  - clear stale frontend tokens and log in again
- Port already in use:
  - Vite auto-selects next port; use the exact URL shown in terminal

## Useful Paths

- Frontend entry: `frontend/wealth-arena/src/main.tsx`
- Frontend routes: `frontend/wealth-arena/src/app/App.tsx`
- Backend app entry: `backend/app/main.py`
- Backend API routes: `backend/app/api/routes`
- Party API + WS: `backend/app/api/routes/party.py`
- News adapter: `backend/app/services/news_adapter.py`
- News module docs: `news_agent/README.md`

