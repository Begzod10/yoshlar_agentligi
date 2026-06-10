# Mobile API — Masul Hodim Profile

Base URL: `https://agency.gennis.uz`

All protected endpoints require:
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [My Profile](#2-my-profile)
3. [Change Password](#3-change-password)
4. [Preferences & Notifications](#4-preferences--notifications)
5. [Sessions](#5-sessions)
6. [My Youth List](#6-my-youth-list)
7. [Youth Detail](#7-youth-detail)
8. [Update Youth (restricted)](#8-update-youth-restricted)
9. [Plans](#9-plans)
10. [Meetings](#10-meetings)
11. [Meeting Attendance](#11-meeting-attendance)
12. [Error Reference](#12-error-reference)

---

## 1. Authentication

### POST `/api/auth/login`

Login with email and password. Returns access + refresh tokens.

**Request**
```json
{
  "email": "masul1@yoshlar.uz",
  "password": "12345678"
}
```

**Response `200`**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "bearer",
  "user": {
    "id": "f6ba5d45-3cbe-424b-ae33-1c40a6a75b4f",
    "email": "masul1@yoshlar.uz",
    "fullName": "Aliyev Bobur Anvarovich",
    "role": "masul_hodim",
    "districtId": "Bekobod tumani",
    "phone": "+998901234567",
    "avatarUrl": null,
    "isActive": true,
    "lastLoginAt": "2026-06-10T08:00:00Z",
    "createdAt": "2026-05-20T07:32:07Z"
  }
}
```

> Store both tokens. `accessToken` expires — use `refreshToken` to get a new one without re-login.

---

### POST `/api/auth/refresh`

Get a new access token using the refresh token.

**Request**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response `200`** — same shape as `/login`

---

### GET `/api/auth/me`

Get the currently authenticated user.

**Response `200`**
```json
{
  "id": "f6ba5d45-3cbe-424b-ae33-1c40a6a75b4f",
  "email": "masul1@yoshlar.uz",
  "fullName": "Aliyev Bobur Anvarovich",
  "role": "masul_hodim",
  "districtId": "Bekobod tumani",
  "phone": "+998901234567",
  "avatarUrl": null,
  "isActive": true,
  "lastLoginAt": "2026-06-10T08:00:00Z",
  "createdAt": "2026-05-20T07:32:07Z"
}
```

---

### POST `/api/auth/logout`

Revoke the current session.

**Response `204`** — no body

---

## 2. My Profile

### GET `/api/profile`

Full profile of the logged-in masul hodim.

**Response `200`**
```json
{
  "id": "f6ba5d45-3cbe-424b-ae33-1c40a6a75b4f",
  "email": "masul1@yoshlar.uz",
  "fullName": "Aliyev Bobur Anvarovich",
  "role": "masul_hodim",
  "districtId": "Bekobod tumani",
  "phone": "+998901234567",
  "avatarUrl": null,
  "isActive": true,
  "lastLoginAt": "2026-06-10T08:00:00Z",
  "createdAt": "2026-05-20T07:32:07Z"
}
```

---

### PATCH `/api/profile`

Update own name, email, phone, or avatar URL.

All fields are optional — send only what changed.

**Request**
```json
{
  "fullName": "Aliyev Bobur",
  "phone": "+998905554433",
  "email": "bobur@yoshlar.uz",
  "avatarUrl": "https://cdn.example.com/avatars/bobur.jpg"
}
```

**Response `200`** — same shape as `GET /api/profile`

---

## 3. Change Password

### POST `/api/profile/change-password`

Change own password. Requires current password for verification.

**Request**
```json
{
  "currentPassword": "12345678",
  "newPassword": "NewSecure456@"
}
```

| Field | Rules |
|-------|-------|
| `currentPassword` | must match current password |
| `newPassword` | min 8 chars, max 72 chars |

**Response `204`** — no body

**Error `400`** if current password is wrong:
```json
{ "detail": "invalid_current_password" }
```

---

## 4. Preferences & Notifications

### GET `/api/profile/preferences`

Get theme, language, and notification settings.

**Response `200`**
```json
{
  "theme": "system",
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

Update theme and/or language.

**Request**
```json
{
  "theme": "dark",
  "language": "ru"
}
```

| Field | Allowed values |
|-------|---------------|
| `theme` | `"light"`, `"dark"`, `"system"` |
| `language` | `"uz"`, `"ru"`, `"en"` |

**Response `200`** — same shape as `GET /api/profile/preferences`

---

### GET `/api/profile/notifications`

Get notification settings only.

**Response `200`**
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

Update notification settings.

**Request**
```json
{
  "emailEnabled": false,
  "smsEnabled": true,
  "pushEnabled": true,
  "youthUpdates": true,
  "planReminders": true,
  "meetingReminders": true,
  "dailyReport": false,
  "weeklyReport": true
}
```

**Response `200`** — same shape as above

---

## 5. Sessions

### GET `/api/profile/sessions`

List all active sessions for this account.

**Response `200`**
```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "ip": "192.168.1.100",
    "userAgent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36",
    "createdAt": "2026-06-01T10:00:00Z",
    "lastActiveAt": "2026-06-10T08:30:00Z",
    "expiresAt": "2026-07-10T08:30:00Z",
    "isCurrent": true
  },
  {
    "id": "b2c3d4e5-f6a7-8901-bcde-f01234567891",
    "ip": "10.0.0.5",
    "userAgent": "okhttp/4.11.0",
    "createdAt": "2026-06-08T14:22:00Z",
    "lastActiveAt": "2026-06-09T16:10:00Z",
    "expiresAt": "2026-07-09T16:10:00Z",
    "isCurrent": false
  }
]
```

`isCurrent: true` marks the session making this request.

---

### DELETE `/api/profile/sessions/{sessionId}`

Revoke a specific session (e.g. log out another device).

**Response `204`** — no body

---

### DELETE `/api/profile/sessions`

Revoke all sessions except the current one.

**Response `200`**
```json
{ "revoked": 2 }
```

---

## 6. My Youth List

### GET `/api/youth`

List youth assigned to this masul hodim. The backend automatically filters to only show youth assigned to the logged-in masul.

**Query params**

| Param | Type | Description |
|-------|------|-------------|
| `page` | int | Page number, default `1` |
| `limit` | int | Per page, default `20`, max `1000` |
| `status` | string | Filter: `active`, `graduated`, `removed` |
| `search` | string | Search by name (1–255 chars) |

**Example**
```
GET /api/youth?page=1&limit=50&status=active
```

**Response `200`**
```json
{
  "items": [
    {
      "id": "6d41303a-29eb-4589-b80f-a60f27367e71",
      "fullName": "Karimov Ali Akmaljonovich",
      "districtId": "Bekobod tumani",
      "masulId": "eb33f00f-cfd4-4800-a4a2-260f0a26eefb",
      "masulName": "Aliyev Bobur Anvarovich",
      "organizationId": "3ef0d8f4-2d03-4ca3-93c5-a444a69ea1ff",
      "status": "active",
      "category": "xavf guruhidagi yoshlar",
      "contact": "+998905554433",
      "dateOfBirth": "2005-06-15",
      "address": "Bekobod sh., Yangi yo'l 7",
      "notes": "Faol yosh, sport bilan shug'ullanadi",
      "removalProposal": null,
      "createdAt": "2026-05-28T07:33:28Z"
    }
  ],
  "total": 14,
  "page": 1,
  "limit": 50
}
```

---

## 7. Youth Detail

### GET `/api/youth/{youthId}`

Get a single youth record.

**Response `200`** — same object shape as items above

**Error `403`** if the youth is not assigned to this masul.

---

## 8. Update Youth (restricted)

`masul_hodim` can only update `contact` and `notes`. All other fields are ignored.

### PATCH `/api/youth/{youthId}`

**Request**
```json
{
  "contact": "+998 99 111 22 33",
  "notes": "Telefon raqami yangilandi"
}
```

**Response `200`** — full `YouthRead` object

---

## 9. Plans

### GET `/api/plans`

List plans. Filtered to youth assigned to this masul.

**Query params**

| Param | Type | Description |
|-------|------|-------------|
| `youthId` | UUID | Filter by a specific youth |
| `status` | string | `draft`, `in_progress`, `completed`, `cancelled` |
| `page` | int | default `1` |
| `limit` | int | default `20`, max `1000` |

**Example**
```
GET /api/plans?youthId=6d41303a-29eb-4589-b80f-a60f27367e71&status=in_progress
```

**Response `200`**
```json
{
  "items": [
    {
      "id": "9a8b7c6d-5e4f-3a2b-1c0d-987654321abc",
      "youthId": "6d41303a-29eb-4589-b80f-a60f27367e71",
      "masulId": "eb33f00f-cfd4-4800-a4a2-260f0a26eefb",
      "masulName": "Aliyev Bobur Anvarovich",
      "title": "Universitetga tayyorgarlik",
      "goal": "Yoshni 2027-yilgi davlat testiga tayyorlash",
      "milestones": [
        {
          "title": "Test markazidan ro'yxatdan o'tish",
          "done": true,
          "dueDate": "2026-04-01",
          "notes": "DTM hujjatlarini topshirish"
        },
        {
          "title": "Repetitor bilan keladi",
          "done": false,
          "dueDate": "2026-09-01",
          "notes": null
        }
      ],
      "status": "in_progress",
      "progress": 25,
      "startDate": "2026-06-01",
      "endDate": "2027-07-30",
      "createdAt": "2026-05-28T08:00:00Z"
    }
  ],
  "total": 3,
  "page": 1,
  "limit": 20
}
```

---

### POST `/api/plans`

Create a new plan for a youth.

**Request**
```json
{
  "youthId": "6d41303a-29eb-4589-b80f-a60f27367e71",
  "title": "Universitetga tayyorgarlik",
  "goal": "Yoshni 2027-yilgi davlat testiga tayyorlash",
  "milestones": [
    {
      "title": "Test markazidan ro'yxatdan o'tish",
      "done": false,
      "dueDate": "2026-09-01",
      "notes": "DTM hujjatlarini topshirish"
    }
  ],
  "startDate": "2026-06-01",
  "endDate": "2027-07-30"
}
```

| Field | Rules |
|-------|-------|
| `youthId` | required, must be assigned to this masul |
| `title` | required, 2–255 chars |
| `goal` | optional, max 2000 chars |
| `milestones` | optional list; `dueDate` format: `"YYYY-MM-DD"` |
| `startDate` / `endDate` | optional, format: `"YYYY-MM-DD"` |

**Response `201`** — full `PlanRead` object (same shape as list items)

---

### GET `/api/plans/{planId}`

Get a single plan.

**Response `200`** — `PlanRead` object

---

### PATCH `/api/plans/{planId}`

Update a plan. All fields optional.

**Request**
```json
{
  "status": "in_progress",
  "progress": 40,
  "milestones": [
    {
      "title": "Test markazidan ro'yxatdan o'tish",
      "done": true,
      "dueDate": "2026-04-01",
      "notes": null
    }
  ]
}
```

| Field | Allowed values |
|-------|---------------|
| `status` | `draft`, `in_progress`, `completed`, `cancelled` |
| `progress` | 0–100 |

**Response `200`** — updated `PlanRead` object

---

## 10. Meetings

### GET `/api/meetings`

List meetings. Filtered to youth assigned to this masul.

**Query params**

| Param | Type | Description |
|-------|------|-------------|
| `youthId` | UUID | Filter by youth |
| `from` | datetime | Start range (ISO 8601) |
| `to` | datetime | End range (ISO 8601) |
| `page` | int | default `1` |
| `limit` | int | default `20`, max `1000` |

**Example**
```
GET /api/meetings?youthId=6d41303a-29eb-4589-b80f-a60f27367e71&limit=50
```

**Response `200`**
```json
{
  "items": [
    {
      "id": "2fe27ca2-1234-5678-9abc-def012345678",
      "youthId": "6d41303a-29eb-4589-b80f-a60f27367e71",
      "masulId": "eb33f00f-cfd4-4800-a4a2-260f0a26eefb",
      "masulName": "Aliyev Bobur Anvarovich",
      "scheduledAt": "2026-06-15T10:00:00Z",
      "type": "individual",
      "location": "Bekobod tumani yoshlar markazi",
      "agenda": "Oylik baholash va keyingi qadamlarni belgilash",
      "attendanceStatus": "scheduled",
      "attendanceNotes": null,
      "attachments": [],
      "createdAt": "2026-05-28T08:00:00Z",
      "updatedAt": "2026-05-28T08:00:00Z"
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 20
}
```

---

### POST `/api/meetings`

Schedule a new meeting.

**Request**
```json
{
  "youthId": "6d41303a-29eb-4589-b80f-a60f27367e71",
  "masulId": "eb33f00f-cfd4-4800-a4a2-260f0a26eefb",
  "scheduledAt": "2026-06-15T10:00:00Z",
  "type": "individual",
  "location": "Bekobod tumani yoshlar markazi",
  "agenda": "Oylik baholash va keyingi qadamlarni belgilash"
}
```

| Field | Rules |
|-------|-------|
| `youthId` | required |
| `scheduledAt` | required, ISO 8601 datetime |
| `type` | optional, max 64 chars |
| `location` | optional, max 255 chars |
| `agenda` | optional, max 2000 chars |
| `masulId` | optional, defaults to logged-in masul |

**Response `201`** — `MeetingRead` object

---

### GET `/api/meetings/{meetingId}`

Get a single meeting.

**Response `200`** — `MeetingRead` object

---

### PATCH `/api/meetings/{meetingId}`

Update meeting details (time, location, agenda).

**Request**
```json
{
  "scheduledAt": "2026-06-22T14:00:00Z",
  "location": "Onlayn (Zoom)",
  "agenda": "Vaqt va joy o'zgardi"
}
```

**Response `200`** — updated `MeetingRead` object

---

## 11. Meeting Attendance

### PATCH `/api/meetings/{meetingId}/attendance`

Mark attendance result after the meeting. Uses **multipart/form-data** (to support optional file attachment).

**Content-Type:** `multipart/form-data`

**Form fields**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `attendanceStatus` | string | yes | `attended`, `no_show`, `rescheduled` |
| `status` | string | yes | Meeting status label (free text) |
| `attendanceNotes` | string | no | Notes about the meeting |
| `rescheduledDate` | string | no | Required if `attendanceStatus=rescheduled`, format: `YYYY-MM-DD` |
| `rescheduledTime` | string | no | Required if rescheduled, format: `HH:MM` |
| `attachment` | file | no | Photo or document from the meeting |

**Example (attended, no file)**
```
POST /api/meetings/2fe27ca2-1234-5678-9abc-def012345678/attendance
Content-Type: multipart/form-data

attendanceStatus=attended
status=completed
attendanceNotes=Yosh keldi, faol qatnashdi. Maqsadlar yangilandi.
```

**Example (rescheduled)**
```
attendanceStatus=rescheduled
status=rescheduled
attendanceNotes=Bemor bo'lib qoldi
rescheduledDate=2026-06-25
rescheduledTime=11:00
```

**Example (with attachment)**
```
attendanceStatus=attended
status=completed
attendanceNotes=Hujjatlar topshirildi
attachment=<file binary>
```

**Response `200`** — updated `MeetingRead` object

When an attachment is uploaded, it appears in `attachments`:
```json
{
  "attachments": [
    {
      "filename": "photo.jpg",
      "path": "/media/meetings/2fe27ca2-1234-5678-9abc-def012345678/abc123.jpg",
      "size": 204800,
      "contentType": "image/jpeg"
    }
  ]
}
```

**Attendance status values**

| Value | Meaning |
|-------|---------|
| `scheduled` | Meeting not yet held (default) |
| `attended` | Youth was present |
| `no_show` | Youth did not show up |
| `rescheduled` | Moved to a new date/time |

---

## 12. Error Reference

All errors return JSON in this shape:
```json
{ "detail": "<error_code>" }
```

| HTTP | Code | Meaning |
|------|------|---------|
| `400` | `invalid_credentials` | Wrong email or password |
| `400` | `invalid_current_password` | Wrong current password on change-password |
| `401` | `token_expired` | Access token expired — refresh it |
| `401` | `token_invalid` | Token malformed or revoked |
| `403` | `role_not_allowed` | This role cannot access this endpoint |
| `403` | `youth_not_assigned` | Youth is not assigned to this masul |
| `404` | `youth_not_found` | Youth ID does not exist |
| `404` | `plan_not_found` | Plan ID does not exist |
| `404` | `meeting_not_found` | Meeting ID does not exist |
| `422` | *(Pydantic detail)* | Validation error — check field constraints |

### Auth flow for mobile

```
App start
  └─ GET /api/auth/me
       ├─ 200 → already logged in, load dashboard
       └─ 401 → show login screen
              └─ POST /api/auth/login
                   ├─ 200 → store tokens, load dashboard
                   └─ 400 → show "wrong email or password"

On any 401 during normal use
  └─ POST /api/auth/refresh
       ├─ 200 → store new tokens, retry original request
       └─ 401 → clear tokens, redirect to login screen
```
