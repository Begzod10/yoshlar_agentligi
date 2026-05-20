# Role: `masul_hodim` — Mas'ul hodim

> **Demo login**: `masul1@yoshlar.uz` / `masul123` (Bekobod tumani)
> **District scope**: one district, **and only youth assigned to this mas'ul**
> **Team**: Caseworker Tools team

The mas'ul hodim is a front-line caseworker. They only see the youth they are personally responsible for, and they spend most of their time updating plans and meetings. UX must be optimized for **fast daily logging** on mobile or desktop. Backend must enforce that they can never see another caseworker's youth.

## 1. Permissions

### Pages visible
`dashboard`, `yoshlar`, `rejalar`, `uchrashuvlar`, `sozlamalar`.

(❌ No `tashkilotlar`, `masullar`, `monitoring`, `chiqarilgan`, `foydalanuvchilar`.)

### Data scope
- Youth: only where `youth.masulId === currentUser.id`.
- Plans: only plans whose `youth.masulId === currentUser.id`.
- Meetings: only meetings whose `youth.masulId === currentUser.id`.
- District selector: locked to own district display only.

### Actions allowed
| Action | Allowed |
|--------|---------|
| View own assigned youth | ✅ |
| Edit notes / progress on own youth | ✅ |
| Create new plan for own youth | ✅ |
| Update plan status (`in_progress` → `completed`) | ✅ |
| Schedule meetings for own youth | ✅ |
| Mark meetings attended + add notes | ✅ |
| Upload meeting attachments (photos / docs) | ✅ |
| Reassign youth to another mas'ul | ❌ |
| Add new youth | ❌ |
| Delete youth, plans, or meetings | ❌ |
| Propose removal | ❌ (escalate to district director instead) |
| Mark graduated | ❌ |

## 2. Frontend tasks

### 2.1 "My day" dashboard
- [ ] Replace the generic dashboard with a caseworker dashboard:
  - Today's meetings (chronological list with "Mark attended" button inline).
  - "Reja muddati yaqin" (plans due in ≤ 7 days).
  - "Bu hafta ko'rilmagan yoshlar" (assigned youth with no meeting this week).
  - Quick-add buttons: "Yangi reja", "Uchrashuv belgilash".

### 2.2 Youth list / detail
- [ ] List page filtered to own assigned youth (already enforced by `getVisibleYouth`).
- [ ] Detail page shows: profile, current plan, plan timeline, meeting history, attachments.
- [ ] Inline-edit notes; autosave on blur.
- [ ] Cannot see the "Edit profile" or "Reassign" buttons.

### 2.3 Plans
- [ ] Create-plan form: youth pre-filled (single dropdown of own assigned youth), goal, milestones (repeatable rows), start/end dates.
- [ ] Update plan progress: percent slider, comment per update.
- [ ] AI button: "AI dan reja taklifini olish" → `POST /api/ai/analyze` with `type: "plan-recommendation"`. Display the returned structured plan; user can accept and pre-fill the form, then edit.

### 2.4 Meetings
- [ ] Calendar view + list view of own meetings only.
- [ ] Create meeting modal: youth (own), date, time, location, type (`in_person | online | phone`), agenda.
- [ ] Mark-attended modal: outcome notes, attendance status (`attended | no_show | rescheduled`), attachments.

### 2.5 Mobile-first considerations
- [ ] Forms must be usable at 320 px width.
- [ ] Use the existing Tailwind/shadcn tokens; do not introduce a new style direction.

### 2.6 Guards
- [ ] Sidebar already filters by role.
- [ ] Block any UI path that lets the user select a youth not in their assigned set — dropdowns must be filtered server-side too.

### 2.7 Acceptance criteria
- [ ] Logging in as `masul1@yoshlar.uz`, the youth list shows only the youth assigned to that mas'ul.
- [ ] Creating a meeting cannot reference a youth not assigned to them.
- [ ] No "Foydalanuvchilar", "Mas'ullar", "Tashkilotlar", or "Monitoring" appears in the sidebar.
- [ ] AI plan recommendation request includes the right `youthId` and the response renders without errors.

## 3. Backend tasks

### 3.1 Scoping
- [ ] Extend `requireDistrictScope` middleware: for `masul_hodim`, additionally check `youth.masulId === user.id` on every read and write that targets a youth.
- [ ] Reject `POST /api/youth` outright for `masul_hodim`.
- [ ] Reject `DELETE` on youth/plan/meeting for `masul_hodim`.

### 3.2 Endpoints
| Method | Path | Body / Query | Notes |
|--------|------|--------------|-------|
| `GET` | `/api/youth` | — | Server filters to `masulId = user.id` |
| `GET` | `/api/youth/:id` | — | 403 if `youth.masulId ≠ user.id` |
| `PATCH` | `/api/youth/:id` | `{notes?, contact?}` | Only "notes" / "contact" fields editable; rest stripped |
| `POST` | `/api/plans` | `{youthId, goal, milestones[], startDate, endDate}` | Reject if `youth.masulId ≠ user.id` |
| `PATCH` | `/api/plans/:id` | `{progress, status, milestoneUpdates[]}` | Same check |
| `POST` | `/api/meetings` | `{youthId, date, type, location, agenda}` | Same check |
| `PATCH` | `/api/meetings/:id/attendance` | `{status, notes, attachments[]}` | Same check |

### 3.3 AI endpoints
- [ ] `POST /api/ai/analyze` accepts `type: "plan-recommendation"` with `{youthId}`. Server:
  - Verifies `youth.masulId === user.id` before passing data to the LLM.
  - Loads the youth profile and recent meeting notes server-side; does not trust client-passed PII.
  - Returns Zod-validated `planRecommendationSchema` object (already implemented in `app/api/ai/analyze/route.ts`).
- [ ] `POST /api/ai/chat` should pass `userScope` so the `analyzeYouth` and `getDistrictStats` tools only see allowed records.

### 3.4 Field-level write protection
- [ ] On `PATCH /api/youth/:id`, strip any keys other than the whitelist for `masul_hodim`. Use Zod `.pick({notes:true, contact:true})`.
- [ ] On `PATCH /api/plans/:id`, prevent changing `youthId` or `masulId` once created.

### 3.5 Acceptance criteria
- [ ] As `masul_hodim`, `GET /api/youth/:other-masuls-youth-id` returns 403.
- [ ] `POST /api/plans` referencing a youth not assigned to the caller returns 400 `{error: "youth_not_assigned"}`.
- [ ] `PATCH /api/youth/:id` with `{districtId: "Boka tumani"}` ignores the field and does not change district.
- [ ] AI plan recommendation responses always conform to the Zod schema; malformed LLM output returns 502.
