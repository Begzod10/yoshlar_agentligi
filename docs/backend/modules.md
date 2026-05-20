# Backend Modules — FastAPI

> Backend stack for the Yoshlar Agentligi monitoring CRM. Mirrors the domain in `lib/types.ts` and the role-scoped data filters in `lib/app-context.tsx`.
>
> Companion docs: [docs/roles/README.md](../roles/README.md) for per-role permissions and team assignments.

## 1. Tech stack

| Layer | Choice | Notes |
|------|--------|-------|
| Framework | **FastAPI 0.115+** | Async, OpenAPI auto-docs |
| ASGI server | **Uvicorn** + **Gunicorn** workers in prod | |
| DB | **PostgreSQL 16** | `jsonb` for flexible fields (audit, milestones) |
| ORM | **SQLAlchemy 2.x** (async) + **Alembic** | |
| Schemas | **Pydantic v2** | One folder for request/response models |
| Auth | **OAuth2 password flow** with **JWT** (`python-jose`) + **passlib[bcrypt]** | Short-lived access + refresh tokens |
| Validation | Pydantic + custom validators | Reject cross-district mutations at schema level |
| AI | **`openai` SDK** (or vendor of choice) with **`instructor`** for structured output | Mirrors the Vercel AI SDK Zod schemas |
| Background jobs | **Celery** + **Redis** (v2) | Exports, AI calls if long-running |
| Caching | **Redis** | 60-second stats cache |
| Storage | **S3-compatible** (MinIO local) | Meeting attachments |
| Tests | **pytest** + **pytest-asyncio** + **httpx** | Factories via **factory_boy** |
| Lint / format | **ruff** + **mypy** (strict) | |

## 2. Project structure

```
backend/
├── alembic/
│   └── versions/
├── app/
│   ├── main.py                     # FastAPI() instance, router registration
│   ├── core/
│   │   ├── config.py               # Settings via pydantic-settings
│   │   ├── security.py             # JWT encode/decode, password hashing
│   │   ├── deps.py                 # FastAPI dependencies (current_user, db, scope)
│   │   ├── exceptions.py           # AppError hierarchy + handlers
│   │   └── logging.py              # structlog config
│   ├── db/
│   │   ├── base.py                 # Declarative Base
│   │   ├── session.py              # async_session_maker
│   │   └── init_db.py              # seed districts + demo users
│   ├── middleware/
│   │   ├── rbac.py                 # require_role, require_district_scope, deny_writes
│   │   ├── audit.py                # writes audit_log rows on mutations
│   │   └── request_id.py
│   ├── modules/                    # one folder per business module
│   │   ├── auth/
│   │   ├── users/
│   │   ├── districts/
│   │   ├── organizations/
│   │   ├── masullar/
│   │   ├── youth/
│   │   ├── plans/
│   │   ├── meetings/
│   │   ├── removals/
│   │   ├── flags/
│   │   ├── stats/
│   │   ├── ai/
│   │   ├── audit/
│   │   └── reports/
│   └── utils/
│       ├── csv.py
│       ├── pdf.py
│       └── pagination.py
├── tests/
│   ├── conftest.py
│   ├── unit/
│   └── integration/
├── pyproject.toml
└── README.md
```

Each module folder follows the same layout:

```
modules/<name>/
├── __init__.py
├── router.py        # APIRouter, endpoints
├── schemas.py       # Pydantic request/response models
├── models.py        # SQLAlchemy ORM models
├── repository.py    # SQL queries, no business logic
├── service.py       # business logic, RBAC checks, calls repository
└── tests/
```

## 3. Cross-cutting modules

### 3.1 `core.security`
- `hash_password(plain) -> str` (bcrypt).
- `verify_password(plain, hashed) -> bool`.
- `create_access_token(sub, role, district_id?, expires)` — JWT payload mirrors `User`.
- `decode_token(token) -> TokenPayload`.

### 3.2 `core.deps`
| Dependency | Returns | Use |
|-----------|---------|-----|
| `get_db` | `AsyncSession` | Inject in every router |
| `get_current_user` | `User` | Required for all `/api/*` except `/auth/*` and `/healthz` |
| `get_current_user_optional` | `User \| None` | Public endpoints with optional personalization |
| `get_scope` | `UserScope` | `{role, district_id, user_id}` — used by services for filtering |

### 3.3 `middleware.rbac`
- `require_role(*roles: UserRole)` — dependency factory; 403 otherwise.
- `require_district_scope(target_district_id)` — for `tashkilot_direktori | masul_hodim`, must equal `current_user.district_id`.
- `require_youth_ownership(youth_id)` — for `masul_hodim`, asserts `youth.masul_id == current_user.id`.
- `deny_writes(*roles)` — used to reject mutating methods for `moderator`.

### 3.4 `middleware.audit`
- ASGI middleware OR explicit `AuditContext` per-request, wired into every mutating service.
- Writes `audit_log` row with `{user_id, role, action, entity_type, entity_id, before, after, request_id, created_at}`.
- See [`modules/audit`](#39-modulesaudit).

## 4. Business modules

### 4.1 `modules/auth`
- Endpoints:
  - `POST /api/auth/login` → `{access_token, refresh_token, user}`.
  - `POST /api/auth/refresh` → new access token.
  - `POST /api/auth/logout` → invalidate refresh (Redis blocklist).
  - `GET /api/auth/me` → current user profile.
- No RBAC required (login is the entry).
- Mirrors the demo accounts in `components/pages/login-page.tsx`; v1 seeds them in `db/init_db.py`.

### 4.2 `modules/users`
- Owner role: **admin** only (see [docs/roles/admin.md](../roles/admin.md)).
- Endpoints (all `require_role("admin")`):
  - `GET /api/users` — filter by `role`, `district_id`, `search`, paginate.
  - `POST /api/users` — Pydantic validator enforces `district_id` required for `tashkilot_direktori | masul_hodim`, forbidden for `admin | direktor | moderator`.
  - `GET /api/users/{id}`.
  - `PATCH /api/users/{id}`.
  - `POST /api/users/{id}/reset-password`.
  - `DELETE /api/users/{id}` — soft delete (`deleted_at`).
- Schema: `UserCreate`, `UserUpdate`, `UserRead`, `UserRole` enum (matches TS union).

### 4.3 `modules/districts`
- Static list mirrors `TOSHKENT_VILOYATI_DISTRICTS` (14 names).
- Seed via Alembic migration `0002_seed_districts.py`.
- Endpoints:
  - `GET /api/districts` — public-ish, returned to all logged-in users.
- No write endpoints in v1 (admin would change via SQL).

### 4.4 `modules/organizations`
- Owner roles: **admin**, **direktor** (write); **moderator** (read).
- Endpoints:
  - `GET /api/organizations` — filter by `district_id`. Hidden from `tashkilot_direktori | masul_hodim` (403).
  - `POST /api/organizations` — `admin | direktor` only.
  - `GET /api/organizations/{id}` — `admin | direktor | moderator`.
  - `PATCH /api/organizations/{id}` — `admin | direktor`.
  - `DELETE /api/organizations/{id}` — `admin | direktor` with confirm flag.

### 4.5 `modules/masullar`
- Owner roles: **admin**, **direktor**, **tashkilot_direktori** (within own district).
- Endpoints:
  - `GET /api/masullar?district_id=` — `tashkilot_direktori` forced to own district.
  - `POST /api/masullar` — server sets `district_id` from JWT for `tashkilot_direktori`.
  - `GET /api/masullar/{id}` — district scope check.
  - `PATCH /api/masullar/{id}`.
  - `DELETE /api/masullar/{id}`.

### 4.6 `modules/youth`
- Most heavily scoped module. See [docs/roles/tashkilot-direktori.md](../roles/tashkilot-direktori.md) and [docs/roles/masul-hodim.md](../roles/masul-hodim.md).
- Endpoints:
  - `GET /api/youth` — service auto-applies scope:
    - `admin | direktor`: all (filter via `?district_id`).
    - `tashkilot_direktori`: own district.
    - `masul_hodim`: own `masul_id`.
    - `moderator`: 403 unless feature-flag enabled.
  - `POST /api/youth` — denied for `masul_hodim`. `district_id` overridden by server for `tashkilot_direktori`.
  - `GET /api/youth/{id}` — scope check (district + ownership for `masul_hodim`).
  - `PATCH /api/youth/{id}`:
    - `masul_hodim`: Pydantic `YouthUpdateByMasul` whitelists `notes`, `contact` only.
    - others: full `YouthUpdate`.
  - `POST /api/youth/{id}/assign-masul` — `service.validate_district_assignment(youth, masul)` runs **server-side** even if client thinks it's fine.
  - `POST /api/youth/{id}/status` — `admin | direktor` only (graduated, removed bypass approval).
- Repository: `list_for_scope(scope: UserScope)` translates the scope object into SQL.

### 4.7 `modules/plans`
- Owner roles: **admin**, **direktor**, **tashkilot_direktori** (own district), **masul_hodim** (own youth).
- Endpoints:
  - `GET /api/plans` — service applies scope.
  - `POST /api/plans` — looks up `youth.district_id` and `youth.masul_id` server-side; rejects if scope violated.
  - `PATCH /api/plans/{id}` — `youth_id` and `masul_id` immutable post-create.
  - `DELETE /api/plans/{id}` — `admin | direktor | tashkilot_direktori` (own district).
- Stores `milestones: list[Milestone]` as JSONB.

### 4.8 `modules/meetings`
- Owner roles: same as plans.
- Endpoints:
  - `GET /api/meetings?from&to` — scope-filtered.
  - `POST /api/meetings` — scope + same-day collision check.
  - `PATCH /api/meetings/{id}`.
  - `PATCH /api/meetings/{id}/attendance` — `masul_hodim` allowed; status enum `attended | no_show | rescheduled`.
  - `POST /api/meetings/{id}/attachments` — S3 upload; returns presigned URL.
  - `DELETE /api/meetings/{id}`.

### 4.9 `modules/removals` (approval workflow)
- See [docs/roles/direktor.md](../roles/direktor.md) §3.2 and [docs/roles/tashkilot-direktori.md](../roles/tashkilot-direktori.md) §2.6.
- Endpoints:
  - `POST /api/youth/{id}/propose-removal` — `tashkilot_direktori` only; body `{reason: str (>=20 chars)}`. Sets `youth.removal_proposal = {...status:"pending"}`. **Does not** flip status.
  - `POST /api/youth/{id}/approve-removal` — `admin | direktor`; sets `youth.status = "removed"`, clears proposal, writes audit row.
  - `POST /api/youth/{id}/reject-removal` — `admin | direktor`; requires `comment` (>=10 chars); clears proposal.
  - `GET /api/removals?status=pending` — `admin | direktor` queue view.
- Service is a finite state machine; raise `IllegalTransitionError` on invalid edges.

### 4.10 `modules/flags`
- Owner role: **moderator** (writer); **admin | direktor** can also write and resolve.
- Endpoints:
  - `POST /api/flags` — `{entity_type, entity_id, category, comment (>=30 chars)}`.
  - `GET /api/flags?status&entity_type&raised_by` — `admin | direktor | moderator` (own + others).
  - `PATCH /api/flags/{id}` — resolve / dismiss with `resolution` text.
- Categories enum: `data_quality | suspected_fraud | safeguarding | other`.

### 4.11 `modules/stats`
- Owner roles: **admin**, **direktor**, **moderator** (read); **tashkilot_direktori** for own-district variant.
- Endpoints (all GET, cached 60 s per scope):
  - `/api/stats/agency?from&to` — agency totals.
  - `/api/stats/districts?from&to&district_ids[]`.
  - `/api/stats/district/{district_id}?from&to` — `tashkilot_direktori` allowed if equals own.
  - `/api/stats/compare?a&b&from&to`.
  - `/api/stats/trends?metric&granularity&from&to`.
- Service uses SQL aggregations; do not compute in Python.
- Cache key: `f"stats:{endpoint}:{scope_hash}:{params_hash}"`.

### 4.12 `modules/ai`
- Mirrors `app/api/ai/chat/route.ts` and `app/api/ai/analyze/route.ts`.
- Endpoints:
  - `POST /api/ai/chat` — streaming text via FastAPI `StreamingResponse`. System prompt is the Uzbek "YOSH-AI" assistant. Tools: `analyzeYouth`, `suggestPlan`, `getDistrictStats` — each implemented as a Python function the LLM can call. All tool data is loaded **server-side** with the caller's scope.
  - `POST /api/ai/analyze` — structured output. Two `type` values:
    - `"youth-analysis"` → `YouthAnalysisSchema` (riskLevel, riskScore, strengths, concerns, recommendations, priorityActions, estimatedTimeline, successProbability).
    - `"plan-recommendation"` → `PlanRecommendationSchema` (title, description, activities, milestones, expectedOutcomes).
- Validation: re-validate LLM output with Pydantic; 502 on malformed.
- Rate limit per user (Redis token bucket).
- Cost guard: per-day token budget per user (config).

### 4.13 `modules/audit`
- Owner role: **admin** only for reads.
- Table `audit_log`:
  ```sql
  CREATE TABLE audit_log (
    id            uuid PRIMARY KEY,
    user_id       uuid NOT NULL,
    role          text NOT NULL,
    action        text NOT NULL,      -- e.g. "youth.create", "user.reset_password", "pii.reveal"
    entity_type   text NOT NULL,
    entity_id     uuid,
    before        jsonb,
    after         jsonb,
    request_id    text,
    ip            inet,
    user_agent    text,
    created_at    timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX ON audit_log (user_id, created_at DESC);
  CREATE INDEX ON audit_log (entity_type, entity_id);
  CREATE INDEX ON audit_log (action, created_at DESC);
  ```
- Helper: `audit.record(action, entity_type, entity_id, before, after)` called from every mutating service.
- Endpoint: `GET /api/audit-log?actor&action&entity_type&from&to` — paginated.

### 4.14 `modules/reports`
- Owner roles: **admin**, **direktor**, **moderator**.
- Endpoints:
  - `GET /api/reports/agency.csv?from&to` — streaming CSV.
  - `GET /api/reports/agency.pdf?from&to` — PDF (WeasyPrint / ReportLab) (v2).
  - `GET /api/reports/district/{district_id}.csv` — scoped.
- PII rules:
  - Default columns anonymize personal fields (initials + UUID).
  - `?include_pii=true` requires a recent `pii.reveal` audit entry within last 5 minutes, else 403.

## 5. Database schema overview

```
users (id, email, password_hash, full_name, role, district_id?, phone?, is_active, last_login_at, created_at, deleted_at?)
districts (id text PK, name_uz, region)
organizations (id, name, district_id, type, contact_phone, created_at, ...)
masullar (id, full_name, district_id, organization_id, phone, created_at, ...)
youth (id, full_name, district_id, masul_id, organization_id, status, contact, notes jsonb, removal_proposal jsonb?, created_at)
plans (id, youth_id, masul_id, title, goal, milestones jsonb, status, progress, start_date, end_date, created_at)
meetings (id, youth_id, masul_id, scheduled_at, type, location, agenda, attendance_status, attendance_notes, attachments jsonb, created_at)
flags (id, raised_by, role, entity_type, entity_id, category, comment, status, resolved_by?, resolved_at?, resolution?, created_at)
audit_log (see §4.13)
ai_usage (id, user_id, endpoint, tokens_in, tokens_out, cost_usd, created_at)
```

Constraints:
- `youth.masul_id` FK to `masullar.id`; cross-district enforced in `service.youth.assign_masul` (DB doesn't know about the rule).
- `users.district_id` nullable; CHECK constraint: nullable iff `role IN ('admin','direktor','moderator')`.
- All FKs `ON DELETE RESTRICT` (soft-delete instead).

## 6. Module ↔ Role consumer matrix

| Module | admin | direktor | tashkilot_direktori | masul_hodim | moderator |
|--------|:-----:|:--------:|:-------------------:|:-----------:|:---------:|
| auth | R/W | R/W | R/W | R/W | R/W |
| users | R/W | — | — | — | — |
| districts | R | R | R | R | R |
| organizations | R/W | R/W | — | — | R |
| masullar | R/W | R/W | R/W (own) | — | — |
| youth | R/W | R/W | R/W (own district) | R/W (own youth) | — |
| plans | R/W | R/W | R/W (own district) | R/W (own youth) | — |
| meetings | R/W | R/W | R/W (own district) | R/W (own youth) | — |
| removals | R/W | R/W | propose only | — | — |
| flags | R/W | R/W | — | — | R/W |
| stats (agency) | R | R | — | — | R |
| stats (own district) | R | R | R | — | R |
| ai/chat | R/W | R/W | R/W (own district context) | R/W (own youth context) | R |
| ai/analyze | R/W | R/W | R/W (own district) | R/W (own youth) | — |
| audit | R | — | — | — | — |
| reports | R/W | R/W | R (own district) | — | R |

## 7. Implementation order (suggested sprints)

1. **Sprint 1 — foundation**: `core.security`, `core.deps`, `db.session`, `modules/auth`, `modules/users`, `modules/districts`, RBAC middleware, audit middleware. Seed demo accounts.
2. **Sprint 2 — operational**: `modules/youth`, `modules/masullar`, `modules/organizations`. End-to-end CRUD + scope tests for every role.
3. **Sprint 3 — case work**: `modules/plans`, `modules/meetings`, attachments to S3.
4. **Sprint 4 — workflows**: `modules/removals`, `modules/flags`.
5. **Sprint 5 — analytics**: `modules/stats` with Redis caching, `modules/reports` CSV.
6. **Sprint 6 — AI**: `modules/ai/chat` (streaming), `modules/ai/analyze` (structured), rate limiting + cost guards.
7. **Sprint 7 — hardening**: PII reveal flow, audit log read API, PDF export, observability.

## 8. Testing requirements

- Per-module pytest suite. Minimum 80% coverage (per [common/testing.md](../../README.md)).
- Integration tests must cover each role's scope:
  - `tashkilot_direktori` cannot read another district.
  - `masul_hodim` cannot read another caseworker's youth.
  - `moderator` cannot perform writes outside `flags`.
  - `direktor` cannot hit `/api/users/*`.
  - `admin` can do everything and every action writes one `audit_log` row.
- AI module: contract tests that LLM responses match the Pydantic schema (use recorded VCR cassettes).

## 9. Open questions

- Token revocation strategy: blocklist on logout vs short-lived access only?
- Per-tenant rate limiting on AI endpoints — per user or per district?
- File storage backend in prod (S3 vs internal MinIO).
- PII reveal window: 5 minutes correct, or should each reveal request the reason again?
- Localization: are we storing Uzbek (Latin) names with proper collation? Need `pg_collation` decision.
