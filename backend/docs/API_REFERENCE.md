# API Reference

Base URL: `http://192.168.1.32:8000`

All endpoints (except `/api/auth/login` and `/api/auth/refresh`) require:
```
Authorization: Bearer <accessToken>
```

All responses follow the app's standard envelope (where applicable).  
Timestamps are ISO 8601 UTC. UUIDs are lowercase hyphenated.

---

## Table of Contents

- [Auth](#auth)
- [Profile](#profile)
- [Monitoring & Ratings](#monitoring--ratings)
- [Statistics](#statistics)
- [Reports / CSV Export](#reports--csv-export)
- [Admin System](#admin-system)

---

## Auth

### POST `/api/auth/login`

Authenticate and receive tokens. Creates a device session automatically.

**Request body**
```json
{
  "email": "admin@yoshlar.uz",
  "password": "Admin!2026"
}
```

**Response 200**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "bearer",
  "user": {
    "id": "f6ba5d45-3cbe-424b-ae33-1c40a6a75b4f",
    "email": "admin@yoshlar.uz",
    "fullName": "Administrator",
    "role": "admin",
    "districtId": null,
    "phone": "+998901234567",
    "avatarUrl": null,
    "isActive": true,
    "lastLoginAt": "2026-06-02T09:55:04.104390Z",
    "createdAt": "2026-05-20T07:32:07.727445Z"
  }
}
```

> The JWT payload now includes `sid` (session ID) used to track the active device session.

---

### POST `/api/auth/refresh`

Exchange a refresh token for a new token pair.

**Request body**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response 200** — same shape as login response.

> If the session tied to `sid` has been revoked, returns `401 session_revoked`.

---

### POST `/api/auth/logout`

Revokes the current session (prevents further refresh). Returns `204 No Content`.

---

### GET `/api/auth/me`

Returns the currently authenticated user.

**Response 200** — same `user` object from login.

---

## Profile

All `/api/profile` endpoints require any authenticated role.

---

### GET `/api/profile`

Get the current user's full profile.

**Response 200**
```json
{
  "id": "f6ba5d45-3cbe-424b-ae33-1c40a6a75b4f",
  "email": "admin@yoshlar.uz",
  "fullName": "Administrator",
  "role": "admin",
  "districtId": null,
  "phone": "+998901234567",
  "avatarUrl": "https://cdn.example.com/avatars/abc.jpg",
  "isActive": true,
  "lastLoginAt": "2026-06-02T09:55:04Z",
  "createdAt": "2026-05-20T07:32:07Z"
}
```

---

### PATCH `/api/profile`

Update profile fields. All fields are optional — send only what changes.

**Request body**
```json
{
  "fullName": "Aliyev Sherzod Anvarovich",
  "email": "sherzod@yoshlar.uz",
  "phone": "+998901234567",
  "avatarUrl": "https://cdn.example.com/avatars/abc.jpg"
}
```

**Response 200** — updated `ProfileRead` object (same as GET).

**Errors**
| Code | Message |
|------|---------|
| 409 | `email_already_exists` |

---

### POST `/api/profile/change-password`

Change password. Requires the current password for verification.

**Request body**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewSecure456@"
}
```

**Response 204** — No Content on success.

**Errors**
| Code | Message |
|------|---------|
| 401 | `wrong_current_password` |

---

### GET `/api/profile/preferences`

Get stored UI preferences (theme, language) and notification settings in one call.

**Response 200**
```json
{
  "theme": "dark",
  "language": "uz",
  "notifications": {
    "emailEnabled": true,
    "smsEnabled": false,
    "pushEnabled": true,
    "youthUpdates": true,
    "planReminders": true,
    "meetingReminders": true,
    "dailyReport": true,
    "weeklyReport": false
  }
}
```

---

### PUT `/api/profile/preferences`

Update theme and/or language. All fields optional.

**Request body**
```json
{
  "theme": "dark",
  "language": "ru"
}
```

Allowed values:
- `theme`: `light` | `dark` | `system`
- `language`: `uz` | `ru` | `en`

**Response 200** — same as GET preferences.

---

### GET `/api/profile/notifications`

Get notification channel and type settings only.

**Response 200**
```json
{
  "emailEnabled": true,
  "smsEnabled": false,
  "pushEnabled": true,
  "youthUpdates": true,
  "planReminders": true,
  "meetingReminders": true,
  "dailyReport": true,
  "weeklyReport": false
}
```

---

### PUT `/api/profile/notifications`

Save all notification settings at once (all fields required).

**Request body**
```json
{
  "emailEnabled": true,
  "smsEnabled": false,
  "pushEnabled": true,
  "youthUpdates": true,
  "planReminders": false,
  "meetingReminders": true,
  "dailyReport": true,
  "weeklyReport": false
}
```

**Response 200** — same as GET notifications.

---

### GET `/api/profile/sessions`

List all active sessions for the current account across devices.  
`isCurrent: true` marks the session used by the current request's token.

**Response 200**
```json
[
  {
    "id": "952f4f7f-b722-490e-b427-472a43ac8596",
    "ip": "192.168.1.24",
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "createdAt": "2026-06-02T09:55:03Z",
    "lastActiveAt": "2026-06-02T09:55:03Z",
    "expiresAt": "2026-06-16T09:55:04Z",
    "isCurrent": true
  },
  {
    "id": "5fbe8ab0-ccad-4182-8fc3-23c44cf82f6c",
    "ip": "192.168.1.32",
    "userAgent": "Mozilla/5.0 (Linux; Android 13) ...",
    "createdAt": "2026-06-02T08:30:00Z",
    "lastActiveAt": "2026-06-02T09:10:00Z",
    "expiresAt": "2026-06-16T08:30:00Z",
    "isCurrent": false
  }
]
```

---

### DELETE `/api/profile/sessions/{session_id}`

Revoke a specific session (e.g. a session on another device). Returns `204 No Content`.

**Errors**
| Code | Message |
|------|---------|
| 404 | `session_not_found` |

---

### DELETE `/api/profile/sessions`

Revoke all sessions **except** the current one.

**Response 200**
```json
{
  "revoked": 3
}
```

---

## Monitoring & Ratings

Requires role: `admin`, `direktor`, or `moderator`.

### Query parameter: `period`
| Value | Time range |
|-------|-----------|
| `week` | Last 7 days |
| `month` | Last 30 days *(default)* |
| `quarter` | Last 90 days |
| `year` | Last 365 days |
| `all` | All time |

The period filter applies to plans and meetings activity. Youth and staff counts are always totals.

---

### GET `/api/monitoring/overview`

**Query params:** `period`

**Response 200**
```json
{
  "totalYouth": 5,
  "totalDistricts": 14,
  "avgBajarilishPct": 50.0,
  "totalMasullar": 4
}
```

---

### GET `/api/monitoring/districts`

Ranked list of all districts by total score.

**Query params:** `period`

**Response 200**
```json
[
  {
    "rank": 1,
    "districtId": "Bekobod tumani",
    "totalYouth": 4,
    "totalMasullar": 4,
    "totalPlans": 2,
    "totalMeetings": 1,
    "bajarilishPct": 50.0,
    "aiBall": 70.0,
    "umumiyBall": 37.8
  },
  {
    "rank": 2,
    "districtId": "Toshkent tumani",
    "totalYouth": 1,
    "totalMasullar": 0,
    "totalPlans": 0,
    "totalMeetings": 0,
    "bajarilishPct": 0.0,
    "aiBall": 0.0,
    "umumiyBall": 4.0
  }
]
```

**Score formulas:**
- `aiBall` = `(completedPlans/totalPlans × 60 + attendedMeetings/totalMeetings × 40) × 100`
- `umumiyBall` = `totalYouth × 4 + totalMasullar × 2 + bajarilishPct × 0.08 + aiBall × 0.14`

---

### GET `/api/monitoring/organizations`

Ranked list of organizations by AI score.

**Query params:** `period`

**Response 200**
```json
[
  {
    "rank": 1,
    "id": "0f817739-7be3-4cd0-8328-eba079e9a66b",
    "name": "Bekobod 3-maktab",
    "districtId": "Bekobod tumani",
    "totalMasullar": 2,
    "totalYouth": 8,
    "totalPlans": 14,
    "bajarilishPct": 64.3,
    "aiBall": 64.3
  }
]
```

---

### GET `/api/monitoring/masullar`

Ranked list of mas'ullar by AI score.

**Query params:** `period`

**Response 200**
```json
[
  {
    "rank": 1,
    "id": "b77962a7-4882-4cfe-a2e1-6dc4322d0a19",
    "fullName": "Camel Aliyev",
    "districtId": "Bekobod tumani",
    "organizationId": "0f817739-7be3-4cd0-8328-eba079e9a66b",
    "totalYouth": 2,
    "totalPlans": 2,
    "totalMeetings": 1,
    "bajarilishPct": 50.0,
    "aiBall": 70.0
  },
  {
    "rank": 2,
    "id": "eb33f00f-cfd4-4800-a4a2-260f0a26eefb",
    "fullName": "Aliyev Bobur",
    "districtId": "Bekobod tumani",
    "organizationId": "3ef0d8f4-2d03-4ca3-93c5-a444a69ea1ff",
    "totalYouth": 1,
    "totalPlans": 0,
    "totalMeetings": 0,
    "bajarilishPct": 0.0,
    "aiBall": 0.0
  }
]
```

---

## Statistics

Requires role: `admin`, `direktor`, or `moderator`.

---

### GET `/api/stats/agency`

Overall agency-wide totals.

**Query params:** `from` (ISO datetime), `to` (ISO datetime) — both optional.

**Response 200**
```json
{
  "totalYouth": 5,
  "activeYouth": 2,
  "graduatedYouth": 0,
  "removedYouth": 3,
  "totalPlans": 2,
  "completedPlans": 1,
  "totalMeetings": 1,
  "attendedMeetings": 1,
  "totalDistricts": 2,
  "totalOrganizations": 3,
  "totalMasullar": 4
}
```

---

### GET `/api/stats/districts`

Per-district breakdown of all active districts.

**Response 200**
```json
[
  {
    "districtId": "Bekobod tumani",
    "totalYouth": 4,
    "activeYouth": 2,
    "graduatedYouth": 0,
    "removedYouth": 2,
    "totalPlans": 2,
    "totalMeetings": 1
  }
]
```

---

### GET `/api/stats/district/{district_id}`

Detailed stats for one district (completed plans, attended meetings).

**Path param:** `district_id` — e.g. `Bekobod tumani`

**Response 200**
```json
{
  "districtId": "Bekobod tumani",
  "totalYouth": 4,
  "activeYouth": 2,
  "graduatedYouth": 0,
  "removedYouth": 2,
  "totalPlans": 2,
  "completedPlans": 1,
  "totalMeetings": 1,
  "attendedMeetings": 1
}
```

---

### GET `/api/stats/compare`

Compare two districts side by side.

**Query params:** `a`, `b` — district IDs.

**Response 200**
```json
{
  "a": { "districtId": "Bekobod tumani", "totalYouth": 4, "..." : "..." },
  "b": { "districtId": "Toshkent tumani", "totalYouth": 1, "..." : "..." }
}
```

---

### GET `/api/stats/categories`

Youth count grouped by organization type (category).

**Response 200**
```json
[
  { "category": "maktab", "totalYouth": 34 },
  { "category": "kollej", "totalYouth": 18 },
  { "category": "belgilanmagan", "totalYouth": 5 }
]
```

---

### GET `/api/stats/top-yoshlar`

Top active yoshlar ranked by AI score (plan completion + meeting attendance).

**Query params:** `limit` — 1–50, default `10`.

**Response 200**
```json
[
  {
    "id": "aa67d8ce-8234-4555-9849-33dc729a3153",
    "fullName": "Karimov Ali",
    "districtId": "Bekobod tumani",
    "organizationId": null,
    "masulId": "b77962a7-4882-4cfe-a2e1-6dc4322d0a19",
    "status": "active",
    "totalPlans": 2,
    "completedPlans": 1,
    "totalMeetings": 1,
    "attendedMeetings": 1,
    "aiScore": 70.0
  }
]
```

> `aiScore` = `(completedPlans/totalPlans × 60 + attendedMeetings/totalMeetings × 40) × 100`

---

### GET `/api/stats/recent-activity`

Latest audit log entries (newest first).

**Query params:** `limit` — 1–100, default `20`.

**Response 200**
```json
[
  {
    "id": "d17eaa9a-c4d6-47df-8981-d39d9eea0e33",
    "userId": "f6ba5d45-3cbe-424b-ae33-1c40a6a75b4f",
    "role": "admin",
    "action": "auth.login",
    "entityType": "user",
    "entityId": "f6ba5d45-3cbe-424b-ae33-1c40a6a75b4f",
    "createdAt": "2026-06-02T09:54:51Z"
  },
  {
    "id": "4ad939f2-0a47-4ec9-89c0-6760898afa0d",
    "userId": "49b880a5-508b-4f08-90ff-ed6a4fa1f725",
    "role": "direktor",
    "action": "youth.create",
    "entityType": "youth",
    "entityId": "aa67d8ce-8234-4555-9849-33dc729a3153",
    "createdAt": "2026-06-01T14:20:00Z"
  }
]
```

**Known action values:**
`auth.login`, `auth.logout`, `youth.create`, `youth.update`, `youth.status_update`,
`plan.create`, `plan.update`, `meeting.create`, `masul.create`, `profile.update`,
`profile.change_password`, `profile.update_preferences`, `profile.update_notifications`,
`profile.revoke_session`, `backup.create`, `backup.restore`

---

### GET `/api/stats/ai-insights`

Auto-generated Uzbek-language insights based on current data.

**Response 200**
```json
[
  {
    "type": "warning",
    "text": "Faol yoshlar ulushi 40% — diqqat talab etiladi."
  },
  {
    "type": "info",
    "text": "Rejalar bajarilishi 50% — o'rtacha daraja."
  },
  {
    "type": "positive",
    "text": "Uchrashuvlarda qatnashish 100% — a'lo daraja."
  }
]
```

`type` values: `positive` | `warning` | `info`

---

## Reports / CSV Export

Requires role: `admin`, `direktor`, or `moderator`.  
All endpoints return `text/csv` with `Content-Disposition: attachment`.

---

### GET `/api/reports/agency.csv`

All youth (agency-wide).

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `from` | datetime | Filter by created_at ≥ |
| `to` | datetime | Filter by created_at ≤ |
| `include_pii` | bool | Include real names (default: `false`, admin/direktor only) |

**CSV columns:** `id, name, district_id, status, created_at`

---

### GET `/api/reports/district/{district_id}.csv`

Youth for one district.

**Query params:** `include_pii`

**CSV columns:** `id, name, district_id, status, created_at`

---

### GET `/api/reports/organizations.csv`

All organizations.

**Query params:** `district_id` (optional filter)

**CSV columns:** `id, name, district_id, type, head_name, contact_phone, address, created_at`

---

### GET `/api/reports/masullar.csv`

All mas'ullar.

**Query params:** `district_id` (optional filter)

**CSV columns:** `id, full_name, district_id, organization_id, position, phone, created_at`

---

### GET `/api/reports/plans.csv`

All plans with linked youth info.

**Query params:** `district_id`, `include_pii`

**CSV columns:** `id, youth_name, district_id, title, status, progress, start_date, end_date, created_at`

---

### GET `/api/reports/meetings.csv`

All meetings with linked youth info.

**Query params:** `district_id`, `include_pii`

**CSV columns:** `id, youth_name, district_id, type, scheduled_at, attendance_status, location, created_at`

---

## Admin System

Requires role: `admin` only.

---

### GET `/api/admin/system/info`

**Response 200**
```json
{
  "appEnv": "development",
  "appName": "Yoshlar Backend",
  "version": "0.1.0",
  "maintenanceMode": false,
  "maintenanceMessage": null
}
```

---

### GET `/api/admin/system/counts`

Live row counts for all tables.

**Response 200**
```json
{
  "users": 8,
  "organizations": 3,
  "youth": 5,
  "plans": 2,
  "meetings": 1,
  "flags": 0,
  "auditLog": 142
}
```

---

### POST `/api/admin/system/maintenance`

Toggle maintenance mode.

**Request body**
```json
{
  "enabled": true,
  "message": "Tizim yangilanmoqda, 30 daqiqadan keyin qaytib keling."
}
```

**Response 200** — same as `GET /info`.

---

## Error Envelope

All errors follow this structure:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "unauthorized",
    "message": "wrong_current_password"
  }
}
```

Common HTTP codes:
| Status | Meaning |
|--------|---------|
| 400 | Validation error |
| 401 | Unauthorized / wrong credentials |
| 403 | Forbidden (role mismatch) |
| 404 | Resource not found |
| 409 | Conflict (duplicate) |
| 422 | Unprocessable Entity (schema validation) |
| 500 | Internal server error |
