# Roles & Team Assignments

This project (Yoshlar Agentligi — Toshkent viloyati monitoring CRM) defines **5 user roles**. Each role has a separate task document so you can assign **one team per role** (frontend + backend pair).

| Code | Uzbek label | Scope | Doc |
|------|-------------|-------|-----|
| `admin` | Administrator | Whole system, all 14 districts, user management | [admin.md](./admin.md) |
| `direktor` | Yoshlar agentligi direktori | All districts, strategic / read + approve | [direktor.md](./direktor.md) |
| `tashkilot_direktori` | Tashkilot direktori (tuman) | One assigned district only | [tashkilot-direktori.md](./tashkilot-direktori.md) |
| `masul_hodim` | Mas'ul hodim | Only youth assigned to them | [masul-hodim.md](./masul-hodim.md) |
| `moderator` | Moderator | All districts, read-only analytics & content review | [moderator.md](./moderator.md) |

## How tasks are split

Each role doc has three sections:

1. **Permissions** — what pages they see, what data they can read, what actions they can perform.
2. **Frontend tasks** — pages, components, forms, charts, guards, and UX flows that the FE team owns for that role.
3. **Backend tasks** — REST endpoints, RBAC rules, DB queries, validation, and AI endpoints the BE team owns for that role.

The tables include explicit **acceptance criteria** so the team knows when their slice is "done".

## Source of truth for the role matrix

- Role union: `lib/types.ts` → `UserRole`
- District tuple: `lib/types.ts` → `TOSHKENT_VILOYATI_DISTRICTS` (14 entries)
- Sidebar visibility per role: `components/layout/sidebar.tsx` (`navItems[].roles`)
- Data filtering per role: `lib/app-context.tsx` → `getVisibleYouth`, `getVisibleOrganizations`, `getVisibleMasullar`, `getVisiblePlans`, `getVisibleMeetings`, `canViewAllDistricts`, `getUserDistrict`
- Demo accounts: `components/pages/login-page.tsx`

If you change any role's permission, you must update **all four** of those source files plus the matching doc here.

## Page × Role access matrix

`✅` = full access, `📍` = own district only, `🎯` = only assigned youth, `👁️` = read-only, `❌` = hidden.

| Page | admin | direktor | tashkilot_direktori | masul_hodim | moderator |
|------|:-----:|:--------:|:-------------------:|:-----------:|:---------:|
| `dashboard` | ✅ | ✅ | 📍 | 🎯 | 👁️ |
| `yoshlar` (Youth) | ✅ | ✅ | 📍 | 🎯 | ❌ |
| `tashkilotlar` (Organizations) | ✅ | ✅ | ❌ | ❌ | 👁️ |
| `masullar` (Mas'ullar) | ✅ | ✅ | 📍 | ❌ | ❌ |
| `rejalar` (Individual plans) | ✅ | ✅ | 📍 | 🎯 | ❌ |
| `uchrashuvlar` (Meetings) | ✅ | ✅ | 📍 | 🎯 | ❌ |
| `monitoring` | ✅ | ✅ | ❌ | ❌ | 👁️ |
| `chiqarilgan` (Graduated/Removed) | ✅ | ✅ | 📍 | ❌ | ❌ |
| `foydalanuvchilar` (Users) | ✅ | ❌ | ❌ | ❌ | ❌ |
| `sozlamalar` (Settings) | ✅ | ✅ | ✅ | ✅ | ✅ |

## Shared global tasks (any team can pick up)

These are not specific to one role but block multiple roles. Track them separately:

- Auth: real session (JWT or NextAuth) replacing the demo-account switcher in `login-page.tsx`.
- Database: replace `lib/mock-data.ts` with persistent storage (Postgres + Prisma recommended).
- Audit log: every create/update/delete must record `{userId, role, action, entity, before, after, timestamp}`.
- i18n: all UI strings currently hard-coded in Uzbek Latin — extract into a translation table.
