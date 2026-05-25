# LLM HUD — PoC Status

**Last updated:** 2026-05-25  
**Stack:** FastAPI + SQLite + React 19 + Vite PWA

---

## PoC Scope vs. Delivered

### Phase 1 — Backend skeleton
| Item | Status | Notes |
|------|--------|-------|
| FastAPI + Uvicorn app factory | ✅ Done | `backend/main.py` |
| Async SQLAlchemy + aiosqlite | ✅ Done | `backend/database.py` |
| ORM models (Workspace, APIKey, UsageRecord, BalanceRecord) | ✅ Done | `backend/models/` |
| Fernet encryption for stored keys | ✅ Done | `backend/encryption.py`, key at `~/.llm-hud/secret.key` |
| `/workspaces` CRUD | ✅ Done | |
| `/api-keys` CRUD + validate endpoint | ✅ Done | |
| OpenAI provider: `fetch_usage()`, `fetch_balance()` | ✅ Done | `backend/services/providers/openai_provider.py` |
| Cost calculator with pricing table | ✅ Done | `backend/services/cost_calculator.py` |
| APScheduler per-key polling jobs | ✅ Done | `backend/services/scheduler.py` |
| `/usage` router: manual fetch + balance | ✅ Done | |
| `/usage/backfill` endpoint (90-day history) | ✅ Done | Added beyond original scope |
| `/analytics/summary` with by_model, by_day, by_project | ✅ Done | |
| `/settings/prices` CRUD (persistent to disk) | ✅ Done | Prices saved to `~/.llm-hud/prices.json` |
| `/settings/unknown-models` tracker | ✅ Done | Added beyond original scope |
| WebSocket `/ws/{workspace_id}` live push | ✅ Done | |
| `run.py` one-command launcher + auto-venv | ✅ Done | |
| Alembic migrations | ❌ Not done | Using `create_all` + inline `ALTER TABLE` for column additions. Acceptable for PoC; use Alembic before production. |

### Phase 2 — Frontend skeleton
| Item | Status | Notes |
|------|--------|-------|
| Vite + React 19 + TypeScript | ✅ Done | |
| Tailwind CSS v3 dark theme | ✅ Done | |
| Apache ECharts (`echarts-for-react`) | ✅ Done | |
| Zustand v5 global store | ✅ Done | All selectors use `useShallow` to prevent infinite re-renders |
| TanStack Query v5 | ✅ Done | |
| vite-plugin-pwa + manifest.json | ✅ Done | `sw.js`, `workbox-*.js`, installable PWA |
| Axios API client (`src/api/client.ts`) | ✅ Done | |
| Workspace selector + API key form | ✅ Done | |
| Dashboard page | ✅ Done | Stat cards, charts, project breakdown, active keys table |
| Analytics page | ✅ Done | Time-series, donut, heatmap, model comparison, by-model table, by-project table |
| Workspaces page | ✅ Done | Create/delete workspace, add/delete/toggle keys, refresh + backfill buttons, error display |
| Settings page | ✅ Done | Editable pricing table, add new model, unknown models banner |
| Poll interval editing in UI | ⚠️ Partial | Interval set at key creation; no edit-in-place UI for changing it after. Editable via API. |

### Phase 3 — Charts & Analytics
| Item | Status | Notes |
|------|--------|-------|
| `TokenTimeSeriesChart` (stacked bar, input/output) | ✅ Done | |
| `CostByModelChart` (donut) | ✅ Done | |
| `BalanceTrendChart` (area) | ✅ Done | |
| `UsageHeatmap` (calendar intensity) | ✅ Done | |
| `ModelComparisonChart` (horizontal bar) | ✅ Done | |
| Global TimeFramePicker (1D/7D/30D/90D) | ✅ Done | |
| Custom date range picker | ✅ Done | Added beyond original scope |
| Project-wise breakdown (Dashboard + Analytics) | ✅ Done | Added beyond original scope |

### Phase 4 — Live updates & UX polish
| Item | Status | Notes |
|------|--------|-------|
| `useWebSocket.ts` hook | ✅ Done | |
| LiveIndicator (pulse dot, last event label) | ✅ Done | |
| On-boot 90-day historical backfill | ✅ Done | Fires as background task on key creation; manual ⏱ button in Workspaces |
| API key validation on save | ✅ Done | `POST /api-keys/{id}/validate` |
| Error display: 403, 400, rate-limited | ✅ Done | Amber banner per key row in Workspaces |
| Offline banner | ❌ Not done | Service worker registered but no offline UI indicator. Low priority for local-only tool. |

### Phase 5 — Testing & Documentation
| Item | Status | Notes |
|------|--------|-------|
| `pytest` unit + integration tests | ❌ Not done | No test suite yet. Covered by manual E2E. |
| README.md setup guide | ❌ Not done | See **Quick Start** below |
| Screenshot in README | ❌ Not done | |

---

## Beyond Original Scope (Added During PoC)

- **Custom date range picker** — start/end date inputs inline next to preset buttons
- **Project-wise analytics** — `group_by[]=project_id` in OpenAI calls; `project_id` stored on every `UsageRecord`; breakdown tables and bar chart in Dashboard + Analytics
- **Persistent price overrides** — `~/.llm-hud/prices.json` survives restarts
- **Unknown model tracking** — models seen in usage data but not in the pricing table surface in Settings with a yellow banner; click to configure
- **Manual backfill button** — ⏱ button per API key in Workspaces triggers a fresh 90-day historical fetch
- **Per-fetch error display** — amber inline message on each key row when a fetch returns a permission or API error
- **DB path moved to local disk** — `~/.llm-hud/llm_hud.db` instead of `./llm_hud.db` (avoids SQLite locking failures on Google Drive / OneDrive)

---

## Known Issues & Limitations

| Issue | Severity | Notes |
|-------|----------|-------|
| No Alembic migrations | Medium | Schema changes use inline `ALTER TABLE`; safe for PoC but needs Alembic before shipping |
| Poll interval not editable in UI after creation | Low | Use `PATCH /api/api-keys/{id}` via `/docs` to change it |
| Old usage records (pre-project-grouping) have `project_id = NULL` | Low | Re-run the ⏱ backfill once per key after upgrading; new records all have project IDs |
| Offline banner missing | Low | App works offline (service worker caches assets) but has no visual indicator |
| No test suite | Medium | Manual E2E only |
| Single-file SQLite on local disk | Info | Fine for single-user PoC. For team use: set `DATABASE_URL` in `.env` to PostgreSQL |
| OpenAI org-level admin key required | Info | Standard project keys return 403 on the usage endpoints. Admin key needed. |

---

## Quick Start

```bash
# 1. Clone / copy to a local directory (not Google Drive / OneDrive)
cd C:\projects\llm-hud        # or any local path

# 2. Create Python virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

# 3. Install backend dependencies
pip install -r backend/requirements.txt

# 4. Build frontend (or copy the pre-built dist/ from the repo)
#    Requires Node 18+. Run from a local path — not a cloud-synced drive.
cd frontend && npm install && npm run build && cd ..

# 5. Start
python run.py
# Opens http://127.0.0.1:8000 automatically
```

**First run:**
1. Go to **Workspaces** → create a workspace
2. Add an **OpenAI Admin API key** (platform.openai.com → Settings → API Keys → Admin keys)
3. The app starts a 90-day backfill automatically
4. Click ⏱ on the key row to trigger a manual backfill if needed

---

## File Map

```
llm-hud/
├── backend/
│   ├── main.py                  FastAPI app + SPA serving
│   ├── config.py                Settings (host, port, DB URL, key path)
│   ├── database.py              Async SQLAlchemy engine + init_db()
│   ├── encryption.py            Fernet AES-128 encrypt/decrypt
│   ├── models/                  SQLAlchemy ORM models
│   ├── schemas/                 Pydantic request/response schemas
│   ├── routers/                 FastAPI routers (workspaces, api_keys,
│   │                            usage, analytics, settings, ws)
│   └── services/
│       ├── cost_calculator.py   Token→USD table, persistent overrides
│       ├── fetch_service.py     Fetch + upsert usage records
│       ├── scheduler.py         APScheduler per-key jobs
│       └── providers/
│           ├── base_provider.py Abstract base (UsageEntry, BalanceEntry)
│           ├── openai_provider.py  Full implementation
│           ├── anthropic_provider.py  Stub
│           ├── gemini_provider.py     Stub
│           └── glm_provider.py        Stub
├── frontend/
│   ├── dist/                    Pre-built production bundle (served by FastAPI)
│   └── src/
│       ├── api/client.ts        Axios typed API client
│       ├── store/index.ts       Zustand store (persisted: activeWorkspaceId, timeRange, liveMode)
│       ├── hooks/useUsageQuery.ts  TanStack Query hooks
│       ├── hooks/useWebSocket.ts   WebSocket live-update hook
│       ├── pages/               Dashboard, Analytics, Workspaces, Settings
│       └── components/
│           ├── charts/          5 ECharts components
│           ├── WorkspaceSelector.tsx
│           ├── TimeFramePicker.tsx  (includes custom date range)
│           ├── LiveIndicator.tsx
│           └── ApiKeyForm.tsx
├── run.py                       One-command launcher
├── setup.py                     Cloud-drive build helper (Google Drive workaround)
└── STATUS.md                    This file
```

---

## Next Steps (Post-PoC)

| Priority | Item |
|----------|------|
| High | Add Alembic migrations (replace inline ALTER TABLE) |
| High | pytest suite for routers + cost calculator |
| High | README.md with screenshots |
| Medium | Anthropic provider implementation |
| Medium | Poll interval editable in Workspaces UI |
| Medium | Budget alerts (threshold → email/desktop notification) |
| Medium | CSV/JSON export of usage data |
| Low | Offline banner in the PWA shell |
| Low | Windows `.exe` packaging (PyWebView + PyInstaller) |
| Low | Cloud sync (swap `DATABASE_URL` to PostgreSQL/Supabase) |
| Low | Gemini / GLM provider implementations |
