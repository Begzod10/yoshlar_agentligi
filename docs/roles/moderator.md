# Role: `moderator` — Moderator

> **Demo login**: `moderator@yoshlar.uz` / `moderator123`
> **District scope**: all 14 districts, **read-only**
> **Team**: Analytics & Compliance team

The moderator is a read-only analyst. They watch agency-wide data, flag content for review, and produce reports — but never edit operational records. Frontend work focuses on filterable, exportable analytics views; backend work focuses on read-optimized endpoints, denying all writes, and a lightweight flagging workflow.

## 1. Permissions

### Pages visible
`dashboard`, `tashkilotlar`, `monitoring`, `sozlamalar`.

(❌ No `yoshlar`, `masullar`, `rejalar`, `uchrashuvlar`, `chiqarilgan`, `foydalanuvchilar`.)

> Note: the current `sidebar.tsx` lists `yoshlar`/`rejalar`/`uchrashuvlar` only for the operational roles — moderator does not see them. If you want moderator to see read-only youth/plan listings (without write actions), expand the `roles` arrays and add explicit `readOnly` guards. Update this doc and `sidebar.tsx` together if you make that change.

### Data scope
- Reads all 14 districts.
- Cannot mutate anything operational.

### Actions allowed
| Action | Allowed |
|--------|---------|
| View aggregated agency-wide stats | ✅ |
| View any organization profile | ✅ (read-only) |
| Export reports (CSV, PDF) | ✅ |
| Flag a youth profile, plan, or organization for review | ✅ |
| Resolve / dismiss flags they own | ✅ |
| Edit any operational entity | ❌ |
| Approve removals / graduations | ❌ |
| Manage users | ❌ |

## 2. Frontend tasks

### 2.1 Moderator dashboard
- [ ] Same layout as direktor dashboard but **all buttons that mutate are removed**.
- [ ] Show "Read-only" badge in the topbar next to the user avatar.
- [ ] Filter persistence in URL (`?district=&from=&to=`).

### 2.2 Monitoring deep view
- [ ] District ranking table sortable by every column.
- [ ] Outlier detection panel: districts whose plan completion or attendance is > 1.5 σ below mean — call them out visually.
- [ ] Compare-N feature: pick up to 4 districts → small multiples chart.
- [ ] Anomaly drill-down: clicking a row shows youth-level data **anonymized** by default (initials + ID only); a "Reveal PII" toggle requires a written reason (logged) before showing full names.

### 2.3 Organizations page (read-only)
- [ ] Table of all organizations across districts.
- [ ] Detail page: org profile, list of mas'ullar, list of youth aggregated counts.
- [ ] No "Edit" or "Delete" buttons.

### 2.4 Flagging
- [ ] On any read-only detail view (org, profile), expose a "Bayroq qo'yish" button.
- [ ] Modal: category (`data-quality | suspected-fraud | safeguarding | other`), comment (min 30 chars).
- [ ] `Flags` page (accessible from `sozlamalar` sub-menu for moderator) showing own flags, status (`open | resolved | dismissed`), and the responder's notes when resolved.

### 2.5 Exports
- [ ] CSV export button on dashboard and monitoring.
- [ ] PDF export uses server-side renderer (v2).

### 2.6 Guards
- [ ] Block sidebar items not in their allowed set (already filtered).
- [ ] Every shared component (e.g. youth table) must accept a `readOnly` prop and hide row actions when `true`.

### 2.7 Acceptance criteria
- [ ] No edit/delete buttons appear anywhere when logged in as moderator.
- [ ] Filters survive page refresh because they live in the URL.
- [ ] Flagging an org records a flag visible to admin / direktor.

## 3. Backend tasks

### 3.1 Read-only enforcement
- [ ] Middleware `denyWrites` returning 403 for `moderator` on any non-`GET` operational route (`/api/youth`, `/api/organizations`, `/api/masullar`, `/api/plans`, `/api/meetings`, `/api/users`).
- [ ] Allowed POST/PATCH endpoints for moderator: `/api/flags/*` only.

### 3.2 Read endpoints (shared with direktor but reused here)
| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/api/stats/agency` | Allowed |
| `GET` | `/api/stats/districts` | Allowed |
| `GET` | `/api/stats/compare` | Allowed |
| `GET` | `/api/stats/trends` | Allowed |
| `GET` | `/api/organizations` | Allowed (read) |
| `GET` | `/api/organizations/:id` | Allowed (read) |

### 3.3 Flag system
- [ ] DB table `flags`: `id, raisedBy, role, entityType, entityId, category, comment, status, createdAt, resolvedBy?, resolvedAt?, resolution?`.
- [ ] `POST /api/flags` — moderator-only writer (admin / direktor can also write). Validates category + comment (min 30 chars).
- [ ] `GET /api/flags` — filter by `status`, `entityType`, `raisedBy`.
- [ ] `PATCH /api/flags/:id` — only `raisedBy` or `admin | direktor` can update status to `resolved | dismissed` with `resolution` text.

### 3.4 PII reveal audit
- [ ] When the moderator clicks "Reveal PII", the client posts `POST /api/pii/reveal` with `{entityType, entityId, reason}` and the server logs to `audit_log` with `action = "pii.reveal"`.
- [ ] Server then returns the full record. No PII reveal without a logged reason ≥ 30 chars.

### 3.5 Exports
- [ ] `GET /api/reports/agency.csv?from&to` — same endpoint as direktor; role-allowed.
- [ ] Confirm CSV does not contain any field the moderator should not see (no plaintext phone numbers, ID numbers, etc. — anonymize by default; provide a separate `?includePII=true` variant that requires PII reveal log).

### 3.6 Acceptance criteria
- [ ] `POST /api/youth` from moderator returns 403.
- [ ] `POST /api/flags` from moderator succeeds and creates a flag with `status = "open"`.
- [ ] `GET /api/stats/agency` returns identical numbers for moderator and direktor.
- [ ] Every PII reveal writes one `audit_log` row.
