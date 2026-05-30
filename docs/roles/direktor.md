# Role: `direktor` — Yoshlar agentligi direktori

> **Demo login**: `direktor@yoshlar.uz` / `direktor123`
> **District scope**: all 14 districts of Toshkent viloyati (read + approve)
> **Team**: Strategic Reporting team

The direktor is the highest **non-technical** stakeholder. They monitor agency-wide KPIs, approve large changes, and rarely create individual records. Frontend work focuses on dashboards, comparative analytics, and approval flows; backend work focuses on aggregations and approval state machines.

## 1. Permissions

### Pages visible
`dashboard`, `yoshlar`, `tashkilotlar`, `masullar`, `rejalar`, `uchrashuvlar`, `monitoring`, `chiqarilgan`, `sozlamalar`.

(❌ No `foydalanuvchilar` — direktor cannot manage users.)

### Data scope
- Reads **all 14 districts**, all entities.
- Can switch district selector to any district or "Barchasi".

### Actions allowed
| Action | Allowed |
|--------|---------|
| View all entities everywhere | ✅ |
| Create / edit youth, plans, meetings, orgs, mas'ullar | ✅ |
| Delete entities | ✅ (with confirm) |
| Approve / reject "Chiqarilgan" status transitions | ✅ |
| Mark youth as `graduated` | ✅ |
| Mark youth as `removed` | ✅ (requires reason) |
| Manage users | ❌ |
| Override district mismatch on youth↔mas'ul pairing | ✅ |
| Export region-wide reports | ✅ |

## 2. Frontend tasks

### 2.1 Dashboard for direktor (`components/pages/dashboard-page.tsx`)
- [ ] Top KPI row: total youth, active youth, graduated, removed, on-track plan %, meeting attendance %.
- [ ] Heatmap or bar chart: district performance ranking. Use `recharts`.
- [ ] Comparison widget: pick 2 districts → side-by-side stats (youth count, plan completion, meeting attendance).
- [ ] Alerts panel: districts where plan completion dropped > 10% week-over-week.
- [ ] AI insights card: call `/api/ai/analyze` with `type: "district-summary"` for a narrative summary of agency-wide trends.

### 2.2 Monitoring page (`components/pages/monitoring-page.tsx`)
- [ ] Time-series chart: weekly active youth across districts (stacked area).
- [ ] Drill-down: click a district row → preserve filter, navigate to `yoshlar` page filtered to that district.
- [ ] Funnel: new intake → active → graduated.

### 2.3 Approval flow UI
- [ ] In `chiqarilgan` page, show a "Tasdiqlash kutilmoqda" tab listing youth proposed for removal by `tashkilot_direktori`.
- [ ] Each row: reason, proposed-by, date, "Tasdiqlash" / "Rad etish" buttons.
- [ ] Rejecting prompts for a comment, sent back to district director.

### 2.4 District selector
- [ ] In `<Topbar />`, direktor sees the full 14-district selector. Default = "Barchasi".
- [ ] Persist selected district in URL (`?district=Bekobod tumani`) so links are shareable.

### 2.5 Export
- [ ] "Hisobotni eksport qilish" button on dashboard and monitoring page. Outputs CSV for v1, PDF for v2.

### 2.6 Acceptance criteria
- [ ] Direktor can compare any two districts without leaving the page.
- [ ] Removal of a youth proposed by a `tashkilot_direktori` does not actually change status until the direktor approves.
- [ ] No "Foydalanuvchilar" link appears in the sidebar.

## 3. Backend tasks

### 3.1 Aggregation endpoints
| Method | Path | Query | Notes |
|--------|------|-------|-------|
| `GET` | `/api/stats/agency` | `?from&to` | All districts totals |
| `GET` | `/api/stats/districts` | `?from&to&districtIds[]` | Per-district breakdown |
| `GET` | `/api/stats/compare` | `?a=districtA&b=districtB&from&to` | Side-by-side comparison |
| `GET` | `/api/stats/trends` | `?metric=youthCount\|planCompletion\|meetingAttendance&granularity=week\|month` | Time-series |

Implementation notes:
- Compute on the server, not in the client.
- Cache results for 60 s per `(role, districtIds, range)` key.
- All four endpoints accept JWTs with role ∈ `admin | direktor | moderator`. `moderator` is read-only (no future write side-effects).

### 3.2 Approval state machine
- [ ] Add column `youth.removalProposal` jsonb: `{proposedBy, reason, proposedAt, status: "pending"|"approved"|"rejected", reviewedBy?, reviewedAt?, reviewerComment?}`.
- [ ] `POST /api/youth/:id/propose-removal` — allowed for `tashkilot_direktori` of the youth's district.
- [ ] `POST /api/youth/:id/approve-removal` — `direktor | admin` only; sets `youth.status = "removed"` and clears proposal.
- [ ] `POST /api/youth/:id/reject-removal` — `direktor | admin` only; requires `comment`; clears proposal.

### 3.3 Override
- [ ] `validateDistrictAssignment` must reject for `tashkilot_direktori` and `masul_hodim`, but allow `direktor | admin` with explicit `?override=true` query flag — log an `audit_log` row with `action = "youth.assign.override"`.

### 3.4 Exports
- [ ] `GET /api/reports/agency.csv?from&to` — streams CSV.
- [ ] `GET /api/reports/agency.pdf?from&to` — PDF via a server-side renderer (v2).

### 3.5 Acceptance criteria
- [ ] `GET /api/stats/agency` as direktor returns counts that match summing each district from `/api/stats/districts`.
- [ ] `POST /api/youth/:id/propose-removal` from a `tashkilot_direktori` user creates a pending proposal; the youth's `status` stays `active`.
- [ ] `POST /api/youth/:id/approve-removal` as direktor flips the status to `removed` and writes an audit row.
- [ ] Direktor receives 403 on any `/api/users/*` route.
