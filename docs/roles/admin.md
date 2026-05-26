# Role: `admin` — Administrator

> **Demo login**: `admin@yoshlar.uz` / `admin123`
> **District scope**: all 14 districts of Toshkent viloyati
> **Team**: System / Platform team

The admin is the **only** role that can manage users and assign other roles. Treat this as the privileged superuser tier. Every admin action must be audit-logged.

## 1. Permissions

### Pages visible
`dashboard`, `yoshlar`, `tashkilotlar`, `masullar`, `rejalar`, `uchrashuvlar`, `monitoring`, `chiqarilgan`, **`foydalanuvchilar`** (admin-only), `sozlamalar`.

### Data scope
- Sees **all districts**, all youth, all organizations, all mas'ullar, all plans, all meetings.
- Can override the district selector to filter for any of the 14 districts or "all".

### Actions allowed
| Action | Allowed |
|--------|---------|
| Create / edit / delete users (any role) | ✅ |
| Reset passwords | ✅ |
| Assign / change role | ✅ |
| Assign user to a district | ✅ |
| Create / edit / delete youth in any district | ✅ |
| Create / edit / delete organizations | ✅ |
| Create / edit / delete mas'ullar | ✅ |
| Create / edit / delete individual plans | ✅ |
| Create / edit / delete / mark-attended meetings | ✅ |
| Mark youth as `graduated` or `removed` | ✅ |
| Override district mismatch warning (with confirmation) | ✅ |
| Access audit log | ✅ |
| Export any report (CSV/PDF) | ✅ |

## 2. Frontend tasks

### 2.1 `components/pages/users-page.tsx` (Foydalanuvchilar)
- [ ] Table of all users: avatar, name, email, role badge, district, last login, status.
- [ ] Filters: role multi-select, district select, status (active/inactive), search by name/email.
- [ ] "Yangi foydalanuvchi" modal with form fields: `fullName`, `email`, `password`, `role` (5-option select), `districtId` (required if role ∈ `tashkilot_direktori | masul_hodim`, hidden otherwise), `phone`.
- [ ] Row actions: edit, reset password, deactivate, delete (with confirm dialog).
- [ ] Reuse `<DistrictSelector />` from `components/ui/district-selector.tsx`.
- [ ] Form validation via Zod schema — district is required for district-scoped roles, must be empty for `admin | direktor | moderator`.

### 2.2 Admin-only UI affordances elsewhere
- [ ] Show "Tahrirlash" / "O'chirish" buttons on every entity card (youth, org, mas'ul, plan, meeting) when `currentUser.role === "admin"`.
- [ ] Add an "Audit log" page or sheet accessible from `sozlamalar` only when admin.
- [ ] In `<Topbar />`, show district selector with **all 14 districts + "Barchasi"** option.

### 2.3 Settings page extensions
- [ ] Section "System" visible only to admin: toggle maintenance mode, edit district list (read-only for v1), edit role permission matrix (read-only for v1).
- [ ] Section "Backups" visible only to admin: list, download, restore (UI only — wire to BE).

### 2.4 Guards
- [ ] `app/page.tsx` switch — render `users-page` only when `currentUser.role === "admin"`. If non-admin manually hits the page id, redirect to `dashboard`.
- [ ] Top-level `<RoleGuard allow={["admin"]}>` wrapper component to reuse.

### 2.5 Acceptance criteria
- [ ] An admin can create a new `tashkilot_direktori` user assigned to "Bekobod tumani" and then log in as that user via the demo switcher and see only Bekobod data.
- [ ] An admin sees the "Foydalanuvchilar" item in the sidebar; no other role does.
- [ ] All entity tables expose row-level edit/delete for admin and hide them for `moderator`.

## 3. Backend tasks

### 3.1 User management endpoints
| Method | Path | Body / Query | Notes |
|--------|------|--------------|-------|
| `GET` | `/api/users` | `?role&districtId&search&page&limit` | List users, admin-only |
| `POST` | `/api/users` | `{fullName,email,password,role,districtId?,phone?}` | Create user |
| `GET` | `/api/users/:id` | — | Single user |
| `PATCH` | `/api/users/:id` | partial | Update profile / role / district |
| `POST` | `/api/users/:id/reset-password` | `{newPassword}` | Reset, log audit |
| `DELETE` | `/api/users/:id` | — | Soft-delete |

### 3.2 RBAC middleware
- [ ] `middleware/requireRole.ts` — accept `UserRole[]`, return 403 otherwise.
- [ ] Apply `requireRole(["admin"])` to every `/api/users/*` route and the audit log route.
- [ ] Validate Zod body — district required for `tashkilot_direktori | masul_hodim`, rejected for the other three.

### 3.3 Audit log
- [ ] DB table `audit_log` with columns `id, userId, role, action, entityType, entityId, before(jsonb), after(jsonb), createdAt`.
- [ ] `GET /api/audit-log` admin-only, supports filters `actor`, `action`, `entityType`, `from`, `to`.
- [ ] Hook every mutating endpoint to write a row.

### 3.4 Cross-cutting admin powers
- [ ] On every CRUD route (`/api/youth`, `/api/organizations`, `/api/masullar`, `/api/plans`, `/api/meetings`), admin bypasses the district scope check.
- [ ] Admin can force-assign a youth to a mas'ul in a different district when query `?override=true` is sent. Log this in audit.
- [ ] Admin endpoint `POST /api/youth/:id/status` accepts `active | graduated | removed` — other roles cannot transition to `removed`.

### 3.5 Acceptance criteria
- [ ] Curl `POST /api/users` with a non-admin JWT returns 403.
- [ ] Creating a user logs an `audit_log` row with `action = "user.create"` and the new user's data in `after`.
- [ ] Admin can `GET /api/youth?districtId=Bekobod%20tumani` and receive Bekobod's youth without owning the district.
