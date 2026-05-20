# Yoshlar Agentligi — Toshkent Viloyati Monitoring CRM

Monorepo containing the frontend (Next.js) and backend (FastAPI) for the Yoshlar Agentligi (Youth Agency) monitoring system across the 14 districts of Toshkent viloyati.

## Layout

```
yoshlar_agentligi/
├── frontend/      # Next.js 16, React 19, Tailwind v4, TanStack Query
├── backend/       # FastAPI, SQLAlchemy 2.x async, PostgreSQL, Alembic
└── docs/
    ├── roles/     # Per-role task documents (admin, direktor, … moderator)
    └── backend/   # FastAPI module map
```

## Quick start

Two terminals, one for each side. The backend runs on port 8000; the frontend reads it via `NEXT_PUBLIC_API_URL`.

### Infrastructure (PostgreSQL 16 + Redis)

```bash
docker compose up -d postgres redis
```

Exposes Postgres on `localhost:5432` (db: `yoshlar`, user/pwd: `yoshlar`/`yoshlar`) and Redis on `localhost:6379`. There's also a `postgres_test` container on `5433` for the test suite.

### Backend (FastAPI)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env        # set JWT_SECRET (>= 32 chars)
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

OpenAPI docs at <http://localhost:8000/docs>.

### Frontend (Next.js)

```bash
cd frontend
pnpm install
cp .env.example .env.local  # set NEXT_PUBLIC_API_URL=http://localhost:8000
pnpm dev
```

App at <http://localhost:3000>.

## Documentation

Start here:

- [`docs/roles/README.md`](docs/roles/README.md) — 5 user roles, page × role matrix, team assignments.
- [`docs/backend/modules.md`](docs/backend/modules.md) — every FastAPI module, its endpoints, and which roles consume it.

Per-role task docs (frontend + backend work per team):

- [`docs/roles/admin.md`](docs/roles/admin.md)
- [`docs/roles/direktor.md`](docs/roles/direktor.md)
- [`docs/roles/tashkilot-direktori.md`](docs/roles/tashkilot-direktori.md)
- [`docs/roles/masul-hodim.md`](docs/roles/masul-hodim.md)
- [`docs/roles/moderator.md`](docs/roles/moderator.md)

## Contract sync rules

Two pairs of files **must stay in lockstep** between FE and BE:

| Frontend | Backend | What |
|----------|---------|------|
| `frontend/lib/api/types.ts` → `UserRole` | `backend/app/core/constants.py` → `UserRole` | 5 role identifiers |
| (none — read from `/api/districts`) | `backend/app/core/constants.py` → `TOSHKENT_VILOYATI_DISTRICTS` | 14 district name strings |

If you change one side without updating the other, the role/district validators will silently reject valid requests in production.

## Tech decisions pending

See open questions in [`docs/backend/modules.md`](docs/backend/modules.md) §9. The big ones:

- AI module placement (keep in Next.js routes vs move to FastAPI).
- Auth: localStorage JWT vs HTTP-only cookie session.
- i18n: stay Uzbek-only or extract strings now.
