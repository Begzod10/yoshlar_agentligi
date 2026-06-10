# API Updates

## Masullar

### POST /api/masullar — Create masul

Now also creates a `masul_hodim` user account automatically.

**Added fields:**
- `email` *(required)* — used as login for the user account
- `password` *(required, min 6 chars)* — password for the user account

**Request body:**
```json
{
  "fullName": "Aliyev Bobur Anvarovich",
  "districtId": "Bekobod tumani",
  "organizationId": "3ef0d8f4-2d03-4ca3-93c5-a444a69ea1ff",
  "phone": "+998901234567",
  "email": "aliyev@example.com",
  "password": "secret123",
  "position": "O'qituvchi"
}
```

**Errors:**
- `409 Conflict` — email already taken

---

### PATCH /api/masullar/{masul_id} — Update masul

**Added field:**
- `email` *(optional)* — updates masul email

---

### PATCH /api/masullar/{masul_id}/password — Reset masul password *(new)*

Resets the password of the linked `masul_hodim` user account. Does not require the current password.

**Request body:**
```json
{
  "newPassword": "newSecret123"
}
```

**Response:** `204 No Content`

**Errors:**
- `404 Not Found` — masul has no linked user account

---

## Meetings

### POST /api/meetings — Create meeting

**Added field:**
- `masulId` *(optional, UUID)* — override the masul assigned to the meeting. If omitted, auto-filled from `youth.masul_id`.

---

### PATCH /api/meetings/{meeting_id}/attendance — Update attendance

Changed from JSON to **multipart/form-data**.

**Form fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `attendanceStatus` | string (enum) | yes | `keldi`, `kelmadi`, `qayta_belgilandi` |
| `status` | string | yes | Meeting status |
| `attendanceNotes` | string | no | Notes |
| `rescheduledDate` | string (`YYYY-MM-DD`) | no | New date (required if rescheduling) |
| `rescheduledTime` | string (`HH:MM`) | no | New time (required if rescheduling) |
| `attachment` | file | no | File attachment |

---

## GET responses — masulName added

All list and detail GET endpoints for the following resources now include `masulName` (masul's full name):

- `GET /api/meetings` / `GET /api/meetings/{id}`
- `GET /api/plans` / `GET /api/plans/{id}`
- `GET /api/youth` / `GET /api/youth/{id}`

**Example:**
```json
{
  "id": "...",
  "masulId": "eb33f00f-cfd4-4800-a4a2-260f0a26eefb",
  "masulName": "Aliyev Bobur Anvarovich"
}
```
