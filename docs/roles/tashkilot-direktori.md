# Role: `tashkilot_direktori` — Tashkilot direktori (tuman)

> **Demo login**: `bekobod@yoshlar.uz` / `tashkilot123` (Bekobod tumani)
> **District scope**: exactly one district (`User.districtId`)
> **Team**: District Operations team

The district organization director runs day-to-day work for a **single** district. Every screen they see and every API call they make is constrained to that one `districtId`. The UI must never show another district's data, even when the URL is manipulated.

## 1. Permissions

### Pages visible
`dashboard`, `yoshlar`, `masullar`, `rejalar`, `uchrashuvlar`, `chiqarilgan`, `sozlamalar`.

(❌ No `tashkilotlar`, `monitoring`, or `foydalanuvchilar`.)

### Data scope
- Sees only entities where `entity.districtId === currentUser.districtId`.
- District selector is **locked** to their own district (no "Barchasi" option).

### Actions allowed
| Action | Allowed |
|--------|---------|
| Create / edit youth in own district | ✅ |
| Create / edit mas'ullar in own district | ✅ |
| Assign youth to mas'ul **within the same district** | ✅ |
| Create / edit plans for own-district youth | ✅ |
| Schedule / mark-attended meetings for own-district youth | ✅ |
| Propose removal of youth (sends to direktor for approval) | ✅ |
| Directly mark youth as `removed` | ❌ (must go via approval) |
| Mark youth as `graduated` | ✅ |
| Delete entities | ✅ within district only |
| Cross-district reads | ❌ |
| User management | ❌ |

## 2. Frontend tasks

### 2.1 District lock
- [ ] On login, set `selectedDistrict = currentUser.districtId` (already implemented in `lib/app-context.tsx` `login()` callback).
- [ ] `<Topbar />` district selector renders as a **read-only badge** for this role — not a dropdown.
- [ ] `<DistrictSelector />` form input should pre-select user's district and be disabled.

### 2.2 District-scoped dashboard
- [ ] Reuse `dashboard-page.tsx` but show single-district KPIs: own-district youth count, active, in-plan, attended-this-week.
- [ ] Top-5 mas'ul leaderboard (by completed plans this month) within the district.
- [ ] Upcoming meetings list (next 7 days), all clickable to edit.

### 2.3 Youth page
- [ ] Table filtered to own district (already enforced by `getVisibleYouth`).
- [ ] "Yangi yosh qo'shish" form: `districtId` auto-set, disabled.
- [ ] Mas'ul assignment dropdown lists **only own-district mas'ullar** via `getMasullarsForDistrict(currentUser.districtId)`.
- [ ] Show banner if user tries to assign a youth to a mas'ul from another district (server returns 400; toast it).

### 2.4 Mas'ullar page
- [ ] Table of own-district mas'ullar.
- [ ] Add/edit form: `districtId` auto-set, disabled.

### 2.5 Plans & meetings
- [ ] Create-plan form: youth dropdown filtered to own district, mas'ul dropdown filtered to own district.
- [ ] Meetings calendar (week view + list view), own-district meetings only.
- [ ] Mark-attended modal with notes field.

### 2.6 Chiqarilgan flow
- [ ] On youth detail page, button "Chiqarish uchun taklif qilish" (propose removal). Opens modal: reason (textarea, min 20 chars).
- [ ] Posts to `/api/youth/:id/propose-removal`. Shows pending state until direktor approves.
- [ ] In `chiqarilgan` page, show two tabs: "Tasdiqlangan" (approved removals + graduated) and "Kutilmoqda" (own pending proposals + rejection comments from direktor).

### 2.7 Guards
- [ ] Hide `tashkilotlar`, `monitoring`, `foydalanuvchilar` from sidebar (already enforced by `navItems[].roles`).
- [ ] Block direct navigation to those page ids via the `app/page.tsx` switch — fallback to `dashboard`.

### 2.8 Acceptance criteria
- [ ] Logging in as Bekobod director, the topbar shows "Bekobod tumani" as a non-editable chip.
- [ ] Creating a youth never lets the user pick a different district.
- [ ] Removing a youth always goes through the approval queue; status does not change immediately.

## 3. Backend tasks

### 3.1 Scope middleware
- [ ] Middleware `requireDistrictScope` that:
  - For `tashkilot_direktori`, sets `req.districtScope = user.districtId` and rejects any request whose body or query targets a different district.
  - For `masul_hodim`, same but also restricts to youth assigned to `user.id`.
  - For `admin | direktor | moderator`, passes through.
- [ ] Apply on: `/api/youth/*`, `/api/masullar/*`, `/api/plans/*`, `/api/meetings/*`, `/api/youth/:id/propose-removal`.

### 3.2 Endpoints
| Method | Path | Body / Query | Notes |
|--------|------|--------------|-------|
| `GET` | `/api/youth?districtId={own}` | — | 403 if `districtId` ≠ own |
| `POST` | `/api/youth` | full body | Forces `districtId = user.districtId` |
| `PATCH` | `/api/youth/:id` | partial | Reject if existing record's `districtId` ≠ own |
| `DELETE` | `/api/youth/:id` | — | Same scope check |
| `POST` | `/api/youth/:id/assign-masul` | `{masulId}` | Server re-runs `validateDistrictAssignment`; 400 on mismatch |
| `POST` | `/api/youth/:id/propose-removal` | `{reason}` | Reason required, min 20 chars; sets `removalProposal.status="pending"` |
| `GET/POST/PATCH/DELETE` | `/api/masullar/*` | — | Same scope rules |
| `GET/POST/PATCH/DELETE` | `/api/plans/*` | — | Plan inherits youth's district; rejected if youth not in own district |
| `GET/POST/PATCH/DELETE` | `/api/meetings/*` | — | Same |

### 3.3 Cross-district safety
- [ ] Re-validate `districtId` on the server even when the client sends it — never trust the client.
- [ ] When creating a plan or meeting, look up the youth's `districtId` server-side and reject if it differs from `user.districtId`.

### 3.4 Stats endpoints (read-only)
- [ ] `GET /api/stats/district/:districtId` — must equal `user.districtId` for this role.
- [ ] Same shape as the agency-wide stats but pre-filtered.

### 3.5 Acceptance criteria
- [ ] `GET /api/youth` returns only the district director's own-district youth, even if the client sends `?districtId=Boka%20tumani`.
- [ ] `POST /api/youth/:id/assign-masul` with a cross-district mas'ul returns 400 `{error: "district_mismatch"}`.
- [ ] `POST /api/youth/:id/propose-removal` writes the proposal but does **not** update `youth.status` directly.
- [ ] Hitting `/api/users` returns 403.
