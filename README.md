# LLM HUD

Local token usage monitoring dashboard for LLM APIs. A PWA built with FastAPI + React.

## Features

- **Workspace separation** — organize API keys by project/team
- **OpenAI monitoring** — historical backfill (90 days) + scheduled polling
- **Interactive analytics** — token trends, cost breakdown, model comparison, calendar heatmap
- **Balance tracking** — credit grant balance with expiry
- **Real-time updates** — WebSocket push whenever a poll finds new data
- **Offline-capable PWA** — service worker caches last-known data
- **Encrypted key storage** — Fernet (AES-128) with machine-local key; raw key never returned after save
- **Extensible** — Anthropic / Gemini / GLM stubs ready to implement

## Quick start

### Prerequisites
- Python ≥ 3.11
- Node.js ≥ 20

### Automated setup (recommended)

```bash
python setup.py
python run.py
```

`setup.py` installs both Python and Node dependencies, handles the Google Drive / OneDrive `node_modules` issue automatically, and builds the frontend.

### Manual setup

#### 1. Backend

```bash
python -m venv .venv
.venv\Scripts\pip install -r backend\requirements.txt   # Windows
# or: .venv/bin/pip install -r backend/requirements.txt  # macOS/Linux
python run.py
```

Backend starts at `http://127.0.0.1:8000`. API docs at `/docs`.

#### 2. Frontend (development)

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

#### 3. Production build (serve frontend from backend)

```bash
cd frontend
npm run build
cd ..
python run.py
```

Open `http://127.0.0.1:8000`. Install as a PWA from the browser's "Add to Home Screen" / "Install app" prompt.

> **Google Drive / OneDrive users**: If the project lives on a cloud-synced drive, `npm install` may produce empty package files. Use `python setup.py` which detects this and installs to `~/.llm-hud/build/` automatically.

## Configuration

Copy `backend/.env.example` to `backend/.env` and adjust:

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `127.0.0.1` | Bind address |
| `PORT` | `8000` | Port |
| `DATABASE_URL` | `sqlite+aiosqlite:///./llm_hud.db` | SQLite or PostgreSQL |
| `SECRET_KEY_PATH` | `~/.llm-hud/secret.key` | Fernet key path |
| `CORS_ORIGINS` | localhost Vite ports | Allowed origins |

## Monitoring modes

| Mode | Interval | Notes |
|------|----------|-------|
| Standard | 1h (default) | Configurable per key: 5m – 24h |
| Live / Frequent | 30s | Use sparingly — makes many API requests |

> OpenAI does **not** provide webhooks for token consumption. Both modes are poll-based. New data is pushed to connected browsers via WebSocket immediately after each poll.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI + Uvicorn |
| Scheduling | APScheduler (AsyncIO) |
| Database | SQLite → PostgreSQL (swap `DATABASE_URL`) |
| ORM | SQLAlchemy 2.x async |
| Frontend | React 19 + Vite + TypeScript |
| Charts | Apache ECharts |
| State | Zustand + TanStack Query |
| PWA | Workbox via `vite-plugin-pwa` |
| Styling | Tailwind CSS |

## Future roadmap

- [ ] Anthropic, Gemini, GLM provider implementations
- [ ] Budget alerts (threshold notifications)
- [ ] CSV / JSON export
- [ ] Windows desktop app (PyWebView + PyInstaller)
- [ ] Android — PWA "Add to Home Screen" works today; native APK via Capacitor
- [ ] Cloud sync (swap `DATABASE_URL` to Supabase / PostgreSQL)

## Security

- API keys encrypted with Fernet (AES-128-CBC + HMAC-SHA256)
- Encryption key stored at `~/.llm-hud/secret.key` (chmod 600), outside the project directory
- Raw key never returned by the API after initial save (only last-4 hint shown)
- App binds to `127.0.0.1` by default (not LAN-exposed)
- No telemetry; all network calls go only to the configured LLM provider endpoints
