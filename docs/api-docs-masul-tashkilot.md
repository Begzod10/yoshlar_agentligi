# API Dokumentatsiya
## `masul_hodim` va `tashkilot_direktori` rollari uchun

**Base URL:** `http://localhost:8000`  
**Content-Type:** `application/json`  
**Auth:** Barcha so'rovlarda `Authorization: Bearer <access_token>` header bo'lishi shart

---

## Umumiy javob formati

### Muvaffaqiyatli javob
```json
{
  "data": [ ... ],
  "meta": { "total": 100, "page": 1, "limit": 20 }
}
```

### Xato javob
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "district_mismatch",
    "message": "district_mismatch"
  }
}
```

### HTTP status kodlari
| Kod | Ma'nosi |
|-----|---------|
| `200` | Muvaffaqiyatli |
| `201` | Yaratildi |
| `204` | O'chirildi (body yo'q) |
| `400` | Noto'g'ri so'rov (validation xatosi) |
| `401` | Token yo'q yoki noto'g'ri |
| `403` | Ruxsat yo'q |
| `404` | Topilmadi |

---

## 1. Autentifikatsiya

> Ikki rol uchun ham bir xil endpointlar

### `POST /api/auth/login`
Tizimga kirish, token olish.

**Request body:**
```json
{
  "email": "masul1@yoshlar.uz",
  "password": "masul123"
}
```

**Response `200`:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "masul1@yoshlar.uz",
    "full_name": "Sardor Yusupov",
    "role": "masul_hodim",
    "district_id": "Bekobod tumani",
    "phone": null,
    "is_active": true,
    "last_login_at": "2025-05-29T10:00:00Z",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

> `access_token` — 30 daqiqa amal qiladi  
> `refresh_token` — 14 kun amal qiladi

---

### `POST /api/auth/refresh`
Access tokenni yangilash.

**Request body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:** Xuddi `/login` kabi `TokenResponse`

---

### `POST /api/auth/logout`
Chiqish. **Response:** `204 No Content`

---

### `GET /api/auth/me`
Joriy foydalanuvchi ma'lumotlari.

**Response `200`:** `UserRead` (login javobidagi `user` field bilan bir xil)

---

## 2. Tumanlar ro'yxati

### `GET /api/districts`
Barcha 14 tuman nomi. Auth **talab qilinmaydi**.

**Response `200`:**
```json
{
  "data": [
    "Bekobod tumani",
    "Bo'ka tumani",
    "Bo'stonliq tumani",
    "Chinoz tumani",
    "Qibray tumani",
    "Ohangaron tumani",
    "Oqqo'rg'on tumani",
    "Parkent tumani",
    "Piskent tumani",
    "Quyi Chirchiq tumani",
    "Yangiyo'l tumani",
    "Yuqori Chirchiq tumani",
    "Zangiota tumani",
    "Toshkent tumani"
  ]
}
```

---

---

# MASUL HODIM uchun API

> **Demo login:** `masul1@yoshlar.uz` / `masul123`  
> **Scope:** Faqat `youth.masul_id == currentUser.id` bo'lgan yoshlar  
> ⚠️ Server tomonidan **avtomatik** filter qilinadi — boshqa yoshlar ko'rinmaydi

---

## 3. Yoshlar (Yoshlar)

### `GET /api/youth`
O'ziga biriktirilgan yoshlar ro'yxati.

**Query params:**
| Param | Tur | Izohlash |
|-------|-----|----------|
| `status` | `active \| graduated \| removed` | Optional. Status bo'yicha filter |
| `search` | `string` | Optional. Ism bo'yicha qidirish |
| `page` | `int` (min: 1) | Optional. Default: `1` |
| `limit` | `int` (1–100) | Optional. Default: `20` |

> ⚠️ `district_id` parametri **e'tiborga olinmaydi** — server har doim faqat o'zini biriktirilgan yoshlarni qaytaradi

**Response `200`:**
```json
{
  "data": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "full_name": "Aziz Karimov",
      "birth_date": "2001-05-15",
      "district_id": "Bekobod tumani",
      "masul_id": "current-user-uuid",
      "organization_id": "uuid",
      "status": "active",
      "category": "talaba",
      "contact": "+998901234567",
      "notes": null,
      "removal_proposal": null,
      "created_at": "2025-01-15T08:00:00Z",
      "updated_at": "2025-03-20T12:30:00Z"
    }
  ],
  "meta": { "total": 12, "page": 1, "limit": 20 }
}
```

---

### `GET /api/youth/{youth_id}`
Bitta yosh ma'lumoti.

**Path param:** `youth_id` — UUID

**Response `200`:** Yuqoridagi `data` array elementi kabi bir ob'ekt  
**Response `403`:** `youth_not_assigned` — bu yosh boshqa mas'ulga biriktirilgan

---

### `PATCH /api/youth/{youth_id}`
Yoshning kontakt yoki eslatma ma'lumotlarini yangilash.

> ⚠️ **Faqat** `contact` va `notes` fieldlari qabul qilinadi. Boshqa fieldlar (masalan, `district_id`, `masul_id`, `full_name`) **server tomonidan e'tiborga olinmaydi**.

**Request body** (barcha fieldlar ixtiyoriy):
```json
{
  "contact": "+998901234567",
  "notes": {
    "muammo": "Ish topishda qiyinchilik",
    "keyingi_qadam": "Kasb-hunar markazi bilan bog'lanish"
  }
}
```

**Response `200`:** Yangilangan `YouthRead`  
**Response `403`:** `youth_not_assigned`

---

## 4. Rejalar (Plans)

### `GET /api/plans`
O'ziga biriktirilgan yoshlarning rejalari.

**Query params:**
| Param | Tur | Izohlash |
|-------|-----|----------|
| `youth_id` | UUID | Optional. Bitta yosh rejalari |
| `status` | `draft \| in_progress \| completed \| cancelled` | Optional |
| `page` | int | Optional. Default: `1` |
| `limit` | int (1–100) | Optional. Default: `20` |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "youth_id": "uuid",
      "masul_id": "current-user-uuid",
      "title": "Kasb egallash rejasi",
      "goal": "6 oy ichida dasturlashni o'rganish",
      "milestones": [
        { "title": "Python asoslari", "due": "2025-03-01", "done": true },
        { "title": "Django framework", "due": "2025-05-01", "done": false }
      ],
      "status": "in_progress",
      "progress": 45,
      "start_date": "2025-01-01",
      "end_date": "2025-12-31",
      "created_at": "2025-01-15T08:00:00Z",
      "updated_at": "2025-04-10T14:00:00Z"
    }
  ],
  "meta": { "total": 5, "page": 1, "limit": 20 }
}
```

---

### `POST /api/plans`
Yangi reja yaratish.

> ⚠️ `youth_id` da ko'rsatilgan yosh **o'zingizga biriktirilgan** bo'lishi shart, aks holda `403` qaytadi.

**Request body:**
```json
{
  "youth_id": "uuid",
  "masul_id": "current-user-uuid",
  "title": "Kasb egallash rejasi",
  "goal": "6 oy ichida dasturlashni o'rganish",
  "milestones": [
    { "title": "Python asoslari", "due": "2025-03-01" }
  ],
  "status": "draft",
  "start_date": "2025-01-01",
  "end_date": "2025-12-31"
}
```

| Field | Tur | Majburiy | Izohlash |
|-------|-----|----------|----------|
| `youth_id` | UUID | ✅ | O'zga biriktirilgan yosh |
| `masul_id` | UUID | ✅ | Odatda `currentUser.id` |
| `title` | string (2–255) | ✅ | |
| `goal` | string (max 1000) | — | |
| `milestones` | array | — | Ixtiyoriy JSON array |
| `status` | enum | — | Default: `draft` |
| `start_date` | `YYYY-MM-DD` | ✅ | |
| `end_date` | `YYYY-MM-DD` | ✅ | |

**Response `201`:** Yaratilgan `PlanRead`  
**Response `403`:** `youth_not_assigned`  
**Response `404`:** `youth_not_found`

---

### `GET /api/plans/{plan_id}`
Bitta reja.

**Response `200`:** `PlanRead`  
**Response `403`:** `youth_not_assigned`  
**Response `404`:** `plan_not_found`

---

### `PATCH /api/plans/{plan_id}`
Rejani yangilash.

> ⚠️ `youth_id` va `masul_id` fieldlari **o'zgartirish mumkin emas** — yuborilsa ham e'tiborga olinmaydi.

**Request body** (ixtiyoriy fieldlar):
```json
{
  "title": "Yangilangan sarlavha",
  "goal": "Yangilangan maqsad",
  "milestones": [ ... ],
  "status": "in_progress",
  "progress": 60,
  "end_date": "2026-01-01"
}
```

**Response `200`:** Yangilangan `PlanRead`  
**Response `403`:** `youth_not_assigned`

---

## 5. Uchrashuvlar (Meetings)

### `GET /api/meetings`
O'ziga biriktirilgan yoshlarning uchrashuvlari.

**Query params:**
| Param | Tur | Izohlash |
|-------|-----|----------|
| `youth_id` | UUID | Optional |
| `page` | int | Optional. Default: `1` |
| `limit` | int (1–100) | Optional. Default: `20` |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "youth_id": "uuid",
      "masul_id": "current-user-uuid",
      "scheduled_at": "2025-06-15T10:00:00Z",
      "type": "in_person",
      "location": "Bekobod MFY",
      "agenda": "Ish joyi haqida suhbat",
      "attendance_status": "scheduled",
      "attendance_notes": null,
      "attachments": null,
      "created_at": "2025-06-01T08:00:00Z",
      "updated_at": "2025-06-01T08:00:00Z"
    }
  ],
  "meta": { "total": 8, "page": 1, "limit": 20 }
}
```

**`type` qiymatlari:** `in_person` | `online` | `phone`  
**`attendance_status` qiymatlari:** `scheduled` | `attended` | `no_show` | `rescheduled`

---

### `POST /api/meetings`
Yangi uchrashuv yaratish.

> ⚠️ `youth_id` da ko'rsatilgan yosh o'zingizga biriktirilgan bo'lishi shart.

**Request body:**
```json
{
  "youth_id": "uuid",
  "masul_id": "current-user-uuid",
  "scheduled_at": "2025-06-15T10:00:00Z",
  "type": "in_person",
  "location": "Bekobod MFY",
  "agenda": "Ish joyi haqida suhbat"
}
```

| Field | Tur | Majburiy | Izohlash |
|-------|-----|----------|----------|
| `youth_id` | UUID | ✅ | |
| `masul_id` | UUID | ✅ | |
| `scheduled_at` | ISO datetime | ✅ | `2025-06-15T10:00:00Z` |
| `type` | string (max 64) | — | `in_person \| online \| phone` |
| `location` | string (max 255) | — | |
| `agenda` | string (max 2000) | — | |

**Response `201`:** Yaratilgan `MeetingRead`  
**Response `403`:** `youth_not_assigned`  
**Response `404`:** `youth_not_found`

---

### `GET /api/meetings/{meeting_id}`
Bitta uchrashuv.

**Response `200`:** `MeetingRead`  
**Response `403`:** `youth_not_assigned`

---

### `PATCH /api/meetings/{meeting_id}`
Uchrashuvni yangilash (sana, joy, agenda).

**Request body** (ixtiyoriy):
```json
{
  "scheduled_at": "2025-06-20T11:00:00Z",
  "type": "online",
  "location": "Zoom",
  "agenda": "Yangilangan mavzu"
}
```

**Response `200`:** Yangilangan `MeetingRead`  
**Response `403`:** `youth_not_assigned`

---

### `PATCH /api/meetings/{meeting_id}/attendance`
Uchrashuvni o'tgan/o'tmagan deb belgilash.

**Request body:**
```json
{
  "attendance_status": "attended",
  "attendance_notes": "Yaxshi o'tdi, keyingi uchrashuv rejasi tuzildi"
}
```

| Field | Tur | Majburiy | Izohlash |
|-------|-----|----------|----------|
| `attendance_status` | enum | ✅ | `attended \| no_show \| rescheduled` |
| `attendance_notes` | string (max 2000) | — | |

**Response `200`:** Yangilangan `MeetingRead`  
**Response `403`:** `youth_not_assigned`

---

## 6. Statistika (masul_hodim uchun)

> ⚠️ `masul_hodim` faqat `/api/stats/districts` endpointidan foydalana **olmaydi**. Shaxsiy statistika rejalar va uchrashuvlar listidan olinadi.

---

## MASUL_HODIM — taqiqlangan endpointlar

| Endpoint | Xato |
|----------|------|
| `POST /api/youth` | `403 role_not_allowed` |
| `DELETE /api/youth/:id` | `403 role_not_allowed` |
| `DELETE /api/plans/:id` | `403 role_not_allowed` |
| `DELETE /api/meetings/:id` | `403 role_not_allowed` |
| `GET /api/masullar` | `403 role_not_allowed` |
| `GET /api/organizations` | `403 role_not_allowed` |
| `GET /api/stats/agency` | `403 role_not_allowed` |
| `GET /api/stats/districts` | `403 role_not_allowed` |

---

---

# TASHKILOT_DIREKTORI uchun API

> **Demo login:** `bekobod@yoshlar.uz` / `tashkilot123`  
> **Scope:** Faqat `user.district_id` ga teng tumanidagi barcha ma'lumotlar  
> ⚠️ Server tomonidan **avtomatik** district filter qilinadi

---

## 7. Yoshlar (Yoshlar) — tashkilot_direktori

### `GET /api/youth`
O'z tumani yoshlari ro'yxati.

**Query params:**
| Param | Tur | Izohlash |
|-------|-----|----------|
| `status` | `active \| graduated \| removed` | Optional |
| `search` | string | Optional |
| `page` | int | Optional. Default: `1` |
| `limit` | int (1–100) | Optional. Default: `20` |

> ⚠️ `district_id` parametri yuborilsa ham **e'tiborga olinmaydi** — server har doim faqat o'z tumani ma'lumotlarini qaytaradi.

**Response `200`:** `masul_hodim` bilan bir xil format

---

### `POST /api/youth`
O'z tumaniga yangi yosh qo'shish.

> ⚠️ `district_id` fieldiga qanday qiymat yuborilmasin, server uni **user.district_id** bilan almashtirib qo'yadi.

**Request body:**
```json
{
  "full_name": "Bobur Toshmatov",
  "birth_date": "2003-08-20",
  "district_id": "Bekobod tumani",
  "masul_id": "uuid-masulning-uuid",
  "organization_id": "uuid",
  "category": "talaba",
  "contact": "+998901234567",
  "notes": null
}
```

| Field | Tur | Majburiy | Izohlash |
|-------|-----|----------|----------|
| `full_name` | string (2–255) | ✅ | |
| `birth_date` | `YYYY-MM-DD` | — | |
| `district_id` | string | ✅ | Server override qiladi |
| `masul_id` | UUID | — | O'z tumani mas'uli bo'lishi shart |
| `organization_id` | UUID | — | |
| `category` | string (max 64) | — | |
| `contact` | string (max 255) | — | |
| `notes` | object | — | |

**Response `201`:** Yaratilgan `YouthRead`

---

### `GET /api/youth/{youth_id}`
Bitta yosh ma'lumoti.

**Response `200`:** `YouthRead`  
**Response `403`:** `district_mismatch` — boshqa tumanning yoshi

---

### `PATCH /api/youth/{youth_id}`
Yoshni yangilash (to'liq o'zgartirish).

**Request body** (ixtiyoriy fieldlar):
```json
{
  "full_name": "Bobur Toshmatov",
  "birth_date": "2003-08-20",
  "category": "ishchi",
  "contact": "+998901111111",
  "notes": { "izoh": "Muammo yo'q" },
  "organization_id": "uuid"
}
```

**Response `200`:** Yangilangan `YouthRead`  
**Response `403`:** `district_mismatch`

---

### `DELETE /api/youth/{youth_id}`
Yoshni o'chirish (o'z tumanidan).

**Response `204`:** Body yo'q  
**Response `403`:** `district_mismatch`

---

### `POST /api/youth/{youth_id}/assign-masul`
Yoshga mas'ul biriktirish.

> ⚠️ Mas'ul va yosh **bir xil tuman**da bo'lishi shart. Cross-district assignment `400` qaytaradi.

**Request body:**
```json
{
  "masul_id": "uuid",
  "override": false
}
```

**Response `200`:** Yangilangan `YouthRead`  
**Response `400`:** `district_mismatch_youth_masul` — mas'ul boshqa tumanda

---

### `POST /api/youth/{youth_id}/propose-removal`
Yoshni chiqarish uchun **taklif** yuborish (direktor tasdiqlashi kerak).

> ⚠️ Bu endpoint `youth.status` ni **o'zgartirmaydi**. Faqat `removal_proposal` yozadi. Status `pending` bo'lib qoladi.

**Request body:**
```json
{
  "reason": "Yosh dastur talablariga 3 oy davomida javob bermadi, uchrashuvlarga kelmadi"
}
```

| Field | Tur | Majburiy | Izohlash |
|-------|-----|----------|----------|
| `reason` | string (min 20, max 2000) | ✅ | Kamida 20 belgi |

**Response `200`:** Yangilangan `YouthRead` (status hali `active`, `removal_proposal.status = "pending"`)  
**Response `400`:** `removal_already_proposed` — allaqachon pending taklif bor  
**Response `403`:** `district_mismatch`

`removal_proposal` structurasi:
```json
{
  "proposed_by": "tashkilot-direktori-uuid",
  "reason": "Sabab matni",
  "proposed_at": "2025-06-01T10:00:00Z",
  "status": "pending"
}
```

---

### `POST /api/youth/{youth_id}/status`
Yoshni `graduated` qilish (bevosita, direktorga yubormasdan).

> ✅ `graduated` — bevosita o'zgartirish mumkin  
> ❌ `removed` — faqat direktor/admin o'zgartira oladi

**Request body:**
```json
{
  "status": "graduated",
  "reason": "Ixtiyoriy sabab"
}
```

**Response `200`:** Yangilangan `YouthRead`  
**Response `403`:** `role_not_allowed` (agar `removed` yuborilsa)

---

## 8. Mas'ullar (Masullar) — tashkilot_direktori

### `GET /api/masullar`
O'z tumani mas'ullari ro'yxati.

**Query params:**
| Param | Tur | Izohlash |
|-------|-----|----------|
| `organization_id` | UUID | Optional |
| `search` | string | Optional |
| `page` | int | Optional. Default: `1` |
| `limit` | int (1–100) | Optional. Default: `20` |

> ⚠️ `district_id` param yuborilsa ham server faqat o'z tumani ma'lumotlarini qaytaradi.

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "full_name": "Sardor Yusupov",
      "district_id": "Bekobod tumani",
      "organization_id": "uuid",
      "phone": "+998901234567",
      "email": "sardor@org.uz",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    }
  ],
  "meta": { "total": 5, "page": 1, "limit": 20 }
}
```

---

### `POST /api/masullar`
Yangi mas'ul yaratish.

> ⚠️ `district_id` fieldiga qanday qiymat yuborilmasin, server **user.district_id** bilan almashtirib qo'yadi.

**Request body:**
```json
{
  "full_name": "Aziza Nazarova",
  "district_id": "Bekobod tumani",
  "organization_id": "uuid",
  "phone": "+998901234567",
  "email": "aziza@org.uz"
}
```

| Field | Tur | Majburiy | Izohlash |
|-------|-----|----------|----------|
| `full_name` | string (2–255) | ✅ | |
| `district_id` | string | ✅ | Server override qiladi |
| `organization_id` | UUID | ✅ | |
| `phone` | string (max 32) | — | |
| `email` | string (max 255) | — | |

**Response `201`:** Yaratilgan `MasulRead`

---

### `GET /api/masullar/{masul_id}`
Bitta mas'ul.

**Response `200`:** `MasulRead`  
**Response `403`:** `district_mismatch`

---

### `PATCH /api/masullar/{masul_id}`
Mas'ulni yangilash.

**Request body** (ixtiyoriy):
```json
{
  "full_name": "Yangi ism",
  "phone": "+998909999999",
  "email": "yangi@email.uz"
}
```

**Response `200`:** Yangilangan `MasulRead`  
**Response `403`:** `district_mismatch`

---

### `DELETE /api/masullar/{masul_id}`
Mas'ulni o'chirish.

**Response `204`**  
**Response `403`:** `district_mismatch`

---

## 9. Rejalar (Plans) — tashkilot_direktori

### `GET /api/plans`
O'z tumani rejalari.

**Query params:** `youth_id` (UUID), `status` (enum), `page`, `limit`

**Response `200`:** `masul_hodim` bilan bir xil format

---

### `POST /api/plans`
Yangi reja yaratish.

> ⚠️ `youth_id` o'z tumani yoshiga tegishli bo'lishi shart.

**Request body:** `masul_hodim` bilan bir xil  
**Response `201`:** `PlanRead`  
**Response `403`:** `district_mismatch`

---

### `GET /api/plans/{plan_id}`
Bitta reja.

**Response `200`:** `PlanRead`

---

### `PATCH /api/plans/{plan_id}`
Rejani yangilash.

**Request body:** `masul_hodim` bilan bir xil  
**Response `200`:** Yangilangan `PlanRead`

---

### `DELETE /api/plans/{plan_id}`
Rejani o'chirish.

**Response `204`**  
**Response `403`:** `district_mismatch` (boshqa tuman yoshi bo'lsa)

---

## 10. Uchrashuvlar (Meetings) — tashkilot_direktori

### `GET /api/meetings`
O'z tumani uchrashuvlari.

**Query params:** `youth_id`, `page`, `limit`

---

### `POST /api/meetings`
Yangi uchrashuv.

> ⚠️ `youth_id` o'z tumani yoshiga tegishli bo'lishi shart.

**Request body:** `masul_hodim` bilan bir xil  
**Response `201`:** `MeetingRead`  
**Response `403`:** `district_mismatch`

---

### `GET /api/meetings/{meeting_id}`
Bitta uchrashuv.

---

### `PATCH /api/meetings/{meeting_id}`
Uchrashuvni yangilash.

---

### `PATCH /api/meetings/{meeting_id}/attendance`
Davomat belgilash.

**Request body:** `masul_hodim` bilan bir xil  
**Response `200`:** Yangilangan `MeetingRead`

---

### `DELETE /api/meetings/{meeting_id}`
Uchrashuvni o'chirish.

**Response `204`**  
**Response `403`:** `district_mismatch`

---

## 11. Statistika — tashkilot_direktori

### `GET /api/stats/districts`
O'z tumani statistikasi.

> ⚠️ `district_ids` param yuborilsa ham server faqat **user.district_id** uchun ma'lumot qaytaradi.

**Response `200`:**
```json
[
  {
    "district_id": "Bekobod tumani",
    "total_youth": 45,
    "active_youth": 38,
    "graduated_youth": 5,
    "total_organizations": 8,
    "total_masullar": 12,
    "total_plans": 38,
    "completed_plans": 15,
    "total_meetings": 120,
    "completion_rate": 0.39
  }
]
```

---

## TASHKILOT_DIREKTORI — taqiqlangan endpointlar

| Endpoint | Xato |
|----------|------|
| `GET /api/youth/removals` | `403 role_not_allowed` |
| `POST /api/youth/:id/approve-removal` | `403 role_not_allowed` |
| `POST /api/youth/:id/reject-removal` | `403 role_not_allowed` |
| `POST /api/youth/:id/status` (removed) | `403 role_not_allowed` |
| `GET /api/organizations` | `403 role_not_allowed` |
| `GET /api/stats/agency` | `403 role_not_allowed` |
| `GET /api/stats/compare` | `403 role_not_allowed` |
| `GET /api/stats/trends` | `403 role_not_allowed` |

---

---

# Xato kodlari

| `code` | HTTP | Rol | Sabab |
|--------|------|-----|-------|
| `youth_not_assigned` | 403 | masul_hodim | Bu yosh boshqa mas'ulga biriktirilgan |
| `district_mismatch` | 403 | tashkilot_direktori | Bu yosh/mas'ul boshqa tumanda |
| `district_mismatch_youth_masul` | 400 | tashkilot_direktori | assign-masul: mas'ul boshqa tumanda |
| `role_not_allowed` | 403 | ikkalasi | Bu endpoint uchun rol ruxsati yo'q |
| `removal_already_proposed` | 400 | tashkilot_direktori | Allaqachon pending taklif bor |
| `only_tashkilot_direktori` | 403 | masul_hodim | Faqat tashkilot direktori taklif yuborishi mumkin |
| `youth_not_found` | 404 | ikkalasi | Yosh topilmadi |
| `plan_not_found` | 404 | ikkalasi | Reja topilmadi |
| `meeting_not_found` | 404 | ikkalasi | Uchrashuv topilmadi |
| `invalid_token` | 401 | ikkalasi | Token noto'g'ri yoki muddati o'tgan |
| `missing_token` | 401 | ikkalasi | Authorization header yo'q |

---

# Paginatsiya

Barcha list endpointlar bir xil formatda qaytaradi:

```json
{
  "data": [ ... ],
  "meta": {
    "total": 50,
    "page": 2,
    "limit": 20
  }
}
```

Keyingi sahifa: `?page=3&limit=20`

---

# Endpoint xulosa jadvali

## masul_hodim

| Method | URL | Izoh |
|--------|-----|------|
| `POST` | `/api/auth/login` | Kirish |
| `POST` | `/api/auth/refresh` | Token yangilash |
| `POST` | `/api/auth/logout` | Chiqish |
| `GET` | `/api/auth/me` | O'z profil |
| `GET` | `/api/districts` | Tumanlar |
| `GET` | `/api/youth` | O'z yoshlari ro'yxati |
| `GET` | `/api/youth/{id}` | Bitta yosh |
| `PATCH` | `/api/youth/{id}` | Yosh (contact/notes) yangilash |
| `GET` | `/api/plans` | O'z rejalari |
| `POST` | `/api/plans` | Yangi reja |
| `GET` | `/api/plans/{id}` | Bitta reja |
| `PATCH` | `/api/plans/{id}` | Reja yangilash |
| `GET` | `/api/meetings` | O'z uchrashuvlari |
| `POST` | `/api/meetings` | Yangi uchrashuv |
| `GET` | `/api/meetings/{id}` | Bitta uchrashuv |
| `PATCH` | `/api/meetings/{id}` | Uchrashuv yangilash |
| `PATCH` | `/api/meetings/{id}/attendance` | Davomat belgilash |

## tashkilot_direktori

| Method | URL | Izoh |
|--------|-----|------|
| `POST` | `/api/auth/login` | Kirish |
| `POST` | `/api/auth/refresh` | Token yangilash |
| `POST` | `/api/auth/logout` | Chiqish |
| `GET` | `/api/auth/me` | O'z profil |
| `GET` | `/api/districts` | Tumanlar |
| `GET` | `/api/youth` | Tuman yoshlari |
| `POST` | `/api/youth` | Yangi yosh |
| `GET` | `/api/youth/{id}` | Bitta yosh |
| `PATCH` | `/api/youth/{id}` | Yosh yangilash |
| `DELETE` | `/api/youth/{id}` | Yosh o'chirish |
| `POST` | `/api/youth/{id}/assign-masul` | Mas'ul biriktirish |
| `POST` | `/api/youth/{id}/propose-removal` | Chiqarish taklifi |
| `POST` | `/api/youth/{id}/status` | graduated qilish |
| `GET` | `/api/masullar` | Tuman mas'ullari |
| `POST` | `/api/masullar` | Yangi mas'ul |
| `GET` | `/api/masullar/{id}` | Bitta mas'ul |
| `PATCH` | `/api/masullar/{id}` | Mas'ul yangilash |
| `DELETE` | `/api/masullar/{id}` | Mas'ul o'chirish |
| `GET` | `/api/plans` | Tuman rejalari |
| `POST` | `/api/plans` | Yangi reja |
| `GET` | `/api/plans/{id}` | Bitta reja |
| `PATCH` | `/api/plans/{id}` | Reja yangilash |
| `DELETE` | `/api/plans/{id}` | Reja o'chirish |
| `GET` | `/api/meetings` | Tuman uchrashuvlari |
| `POST` | `/api/meetings` | Yangi uchrashuv |
| `GET` | `/api/meetings/{id}` | Bitta uchrashuv |
| `PATCH` | `/api/meetings/{id}` | Uchrashuv yangilash |
| `PATCH` | `/api/meetings/{id}/attendance` | Davomat belgilash |
| `DELETE` | `/api/meetings/{id}` | Uchrashuv o'chirish |
| `GET` | `/api/stats/districts` | Tuman statistikasi |
