# Moderator — Frontend API Reference

> Backend endpoint'lar, request/response formatlari, auth headerlar, va xato kodlari.
> Moderator uchun frontendni yozayotgan dasturchi shu doc ga qarab ishlaydi.

> **Demo login**: `moderator@yoshlar.uz` / `moderator123`
> **Scope**: barcha 14 tuman — **faqat o'qish**
> **Ko'rinadigan sahifalar**: `dashboard`, `tashkilotlar`, `monitoring`, `sozlamalar`
> ❌ Ko'rinmaydigan sahifalar: `yoshlar`, `masullar`, `rejalar`, `uchrashuvlar`, `chiqarilgan`, `foydalanuvchilar`
> ❌ Har qanday operatsion yozish so'rovi (**POST/PATCH/DELETE** `/api/youth`, `/api/masullar`, `/api/plans`, `/api/meetings`, `/api/users`) → **403**

---

## Auth

Barcha endpoint'lar (districts bundan mustasno) **Bearer token** talab qiladi.

```
Authorization: Bearer <access_token>
```

Token olish: `POST /api/auth/login` → `{ access_token, refresh_token, user }`.
Token yangilash: `POST /api/auth/refresh` → `{ refresh_token }`.
Demo login: `moderator@yoshlar.uz` / `moderator123`.

---

## 1. Statistika — `/api/stats/*`

Moderator barcha stats endpoint'larga **GET** bilan kira oladi.

### 1.1 `GET /api/stats/agency`

Agentlik bo'ylab umumiy statistika.

**Query params:**

| Param | Type | Default | Tavsif |
|-------|------|---------|--------|
| `from` | `string` | `null` | Boshlanish sanasi `YYYY-MM-DD` |
| `to` | `string` | `null` | Tugash sanasi `YYYY-MM-DD` |

**Response** `200`:
```json
{
  "total_youth": 320,
  "active_youth": 245,
  "graduated_youth": 50,
  "removed_youth": 25,
  "total_organizations": 42,
  "total_masullar": 78,
  "total_plans": 410,
  "completed_plans": 180,
  "in_progress_plans": 130,
  "total_meetings": 560,
  "attended_meetings": 480
}
```

### 1.2 `GET /api/stats/districts`

Tuman bo'yicha statistika.

**Query params:**
| Param | Type | Default | Tavsif |
|-------|------|---------|--------|
| `from` | `string` | `null` | Boshlanish sanasi `YYYY-MM-DD` |
| `to` | `string` | `null` | Tugash sanasi `YYYY-MM-DD` |
| `district_ids` | `string` | `null` | Vergul bilan ajratilgan tuman nomlari. Bo'sh = barcha 14 ta. |

**Response** `200`:
```json
[
  {
    "district_id": "Bekobod tumani",
    "total_youth": 28,
    "active_youth": 22,
    "graduated_youth": 4,
    "total_organizations": 3,
    "total_masullar": 6,
    "total_plans": 35,
    "completed_plans": 15,
    "total_meetings": 42,
    "completion_rate": 42.9
  }
]
```

### 1.3 `GET /api/stats/compare`

Ikki tumanni solishtirish.

**Query params:**
| Param | Type | Tavsif |
|-------|------|--------|
| `a` | `string` | **required** — birinchi tuman nomi |
| `b` | `string` | **required** — ikkinchi tuman nomi |
| `from` | `string` | Boshlanish sanasi `YYYY-MM-DD` |
| `to` | `string` | Tugash sanasi `YYYY-MM-DD` |

**Response** `200`:
```json
[
  {
    "district_id": "Bekobod tumani",
    "total_youth": 28,
    "active_youth": 22,
    "total_plans": 35,
    "completed_plans": 15,
    "completion_rate": 42.9,
    "total_meetings": 42
  },
  {
    "district_id": "Chinoz tumani",
    "total_youth": 31,
    "active_youth": 25,
    "total_plans": 40,
    "completed_plans": 20,
    "completion_rate": 50.0,
    "total_meetings": 38
  }
]
```

### 1.4 `GET /api/stats/trends`

Vaqt bo'yicha trend ma'lumotlari.

**Query params:**
| Param | Type | Default | Tavsif |
|-------|------|---------|--------|
| `metric` | `string` | **required** | `youthCount` / `planCompletion` / `meetingAttendance` |
| `granularity` | `string` | `month` | `month` / `week` |
| `from` | `string` | `null` | Boshlanish sanasi `YYYY-MM-DD` |
| `to` | `string` | `null` | Tugash sanasi `YYYY-MM-DD` |

**Response** `200`:
```json
[
  { "period": "2026-01-01 00:00:00+00:00", "value": 12 },
  { "period": "2026-02-01 00:00:00+00:00", "value": 18 },
  { "period": "2026-03-01 00:00:00+00:00", "value": 25 }
]
```

---

## 2. Tashkilotlar — `/api/organizations`

Moderator faqat **GET** (o'qish) mumkin. POST/PATCH/DELETE → `403`.

### 2.1 `GET /api/organizations`

**Query params:**
| Param | Type | Default | Tavsif |
|-------|------|---------|--------|
| `district_id` | `string` | `null` | Tuman bo'yicha filter |
| `search` | `string` | `null` | Nom bo'yicha qidirish (ILIKE) |
| `page` | `int` | `1` | Sahifa raqami |
| `limit` | `int` | `20` | Sahifadagi yozuvlar soni (max 100) |

**Response** `200`:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Bekobod yoshlar markazi",
      "district_id": "Bekobod tumani",
      "type": "markaz",
      "contact_phone": "+998901234567",
      "address": "Bekobod sh., Amir Temur 12",
      "director_name": "Aziz Karimov",
      "created_at": "2026-01-15T10:00:00Z",
      "updated_at": "2026-03-20T14:30:00Z"
    }
  ],
  "meta": { "total": 42, "page": 1, "limit": 20 }
}
```

### 2.2 `GET /api/organizations/{org_id}`

**Response** `200`: Bitta tashkilot (yuqoridagi format).
**Response** `404`: `{ "success": false, "data": null, "error": { "code": "organization_not_found" } }`

---

## 3. Bayroqlar (Flags) — `/api/flags`

Moderatorning **yagona yozish mumkin bo'lgan** moduli. Flag yaratish, o'qish, va o'z flag'larini hal qilish.

### 3.1 `POST /api/flags`

Yangi flag yaratish.

**Request body:**
```json
{
  "entity_type": "organization",
  "entity_id": "uuid",
  "category": "data_quality",
  "comment": "Bu tashkilotda yoshlar soni bilan hisobot soni mos kelmaydi (kamida 30 belgi)"
}
```

| Maydon | Type | Validation | Tavsif |
|--------|------|------------|--------|
| `entity_type` | `string` | 1–64 belgi | `organization` / `youth` / `plan` / `meeting` |
| `entity_id` | `UUID` | required | Flag qo'yilayotgan obyekt ID si |
| `category` | `enum` | required | `data_quality` / `suspected_fraud` / `safeguarding` / `other` |
| `comment` | `string` | **min 30 belgi**, max 2000 | Sabab |

**Response** `201`:
```json
{
  "id": "uuid",
  "raised_by": "user-uuid",
  "role": "moderator",
  "entity_type": "organization",
  "entity_id": "uuid",
  "category": "data_quality",
  "status": "open",
  "comment": "...",
  "resolved_by": null,
  "resolved_at": null,
  "resolution": null,
  "created_at": "2026-05-27T12:00:00Z",
  "updated_at": "2026-05-27T12:00:00Z"
}
```

### 3.2 `GET /api/flags`

Flag'lar ro'yxati (filter bilan).

**Query params:**
| Param | Type | Default | Tavsif |
|-------|------|---------|--------|
| `status` | `enum` | `null` | `open` / `resolved` / `dismissed` |
| `entity_type` | `string` | `null` | Filter by entity type |
| `raised_by` | `UUID` | `null` | Faqat o'z flag'larimni ko'rish uchun `raised_by=<my-user-id>` |
| `page` | `int` | `1` | Sahifa |
| `limit` | `int` | `20` | Limit (max 100) |

**Response** `200`:
```json
{
  "data": [ /* FlagRead objects */ ],
  "meta": { "total": 5, "page": 1, "limit": 20 }
}
```

### 3.3 `GET /api/flags/{flag_id}`

Bitta flag detail.

**Response** `200`: FlagRead object (yuqoridagi format).
**Response** `404`: `flag_not_found`.

### 3.4 `PATCH /api/flags/{flag_id}`

Flagni resolve/dismiss qilish. Faqat flag egasi yoki admin/direktor.

**Request body:**
```json
{
  "status": "resolved",
  "resolution": "Tekshirildi, ma'lumotlar tuzatildi (kamida 10 belgi)"
}
```

| Maydon | Type | Validation |
|--------|------|------------|
| `status` | `enum` | `resolved` / `dismissed` |
| `resolution` | `string` | **min 10 belgi**, max 2000 |

**Response** `200`: Yangilangan FlagRead.

**Xatolar:**
- `403 not_flag_owner_or_admin` — boshqa moderatorning flag'ini o'zgartira olmaydi
- `400 flag_already_resolved` — allaqachon hal qilingan flagni qayta o'zgartirib bo'lmaydi

---

## 4. PII Reveal — `/api/pii/reveal`

Anonim ma'lumotlarni ochish uchun. Audit logga yoziladi.

### 4.1 `POST /api/pii/reveal`

**Request body:**
```json
{
  "entity_type": "youth",
  "entity_id": "uuid",
  "reason": "Tekshiruv uchun yoshning to'liq ismini ko'rish zarur (min 30 belgi)"
}
```

| Maydon | Type | Validation |
|--------|------|------------|
| `entity_type` | `string` | 1–64 belgi |
| `entity_id` | `UUID` | required |
| `reason` | `string` | **min 30 belgi**, max 2000 |

**Response** `200`:
```json
{ "status": "revealed" }
```

**Frontend logic:**
- PII reveal server tomonida `audit_log` ga `action = "pii.reveal"` bilan yoziladi (sababsiz reveal bo'lmaydi).
- Reveal muvaffaqiyatli bo'lgandan keyin **5 daqiqa ichida**:
  - CSV export'da `include_pii=true` parametri bilan to'liq ismlar ko'rinadi.
  - Monitoring sahifasidagi yosh ma'lumotlari to'liq nom bilan qayta yuklanadi.
- 5 daqiqa o'tgach token muddati tugaydi va keyingi reveal uchun qayta sabab kiritish kerak.

---

## 5. Hisobotlar — `/api/reports/*`

### 5.1 `GET /api/reports/agency.csv`

CSV format'da export. Direktor bilan bir xil endpoint — moderator uchun ham ruxsat.

**Query params:**
| Param | Type | Default | Tavsif |
|-------|------|---------|--------|
| `from` | `string` | `null` | Boshlanish sanasi `YYYY-MM-DD` |
| `to` | `string` | `null` | Tugash sanasi `YYYY-MM-DD` |
| `district_id` | `string` | `null` | Faqat bitta tuman |
| `include_pii` | `bool` | `false` | `true` = to'liq ismlar. **5 daqiqa ichida PII reveal bo'lgan bo'lishi shart**, aks holda `403 pii_reveal_required` |

**Response** `200`: `Content-Type: text/csv`, `Content-Disposition: attachment; filename=agency_report.csv`

**CSV ustunlari:**
```
ID,Ism,Tuman,Status,Kategoriya,Yaratilgan
```

`include_pii=false` (default) bo'lganda `Ism` ustunida faqat initsiallari ko'rinadi: `A. K.`

CSV da telefon raqamlari, pasport ma'lumotlari va boshqa shaxsiy ma'lumotlar hech qachon ko'rinmaydi — faqat `include_pii=true` bilan to'liq ism ruxsat etiladi.

---

### 5.2 `GET /api/reports/agency.pdf` *(v2)*

PDF format'da export. Server tomonida render qilinadi.

**Query params:** `from`, `to`, `district_id` (yuqoridagi bilan bir xil).

**Response** `200`: `Content-Type: application/pdf`

---

## 6. Tumanlar — `/api/districts`

### 6.1 `GET /api/districts`

Auth talab qilmaydi. 14 ta tuman nomini qaytaradi.

**Response** `200`:
```json
{
  "data": [
    "Bekobod tumani",
    "Bo'ka tumani",
    "Bo'stonliq tumani",
    "..."
  ]
}
```

---

## 7. Xato formatlari

Barcha xatolar bir xil format:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "error_code",
    "message": "Tavsif"
  }
}
```

### Moderator uchun mumkin bo'lgan xato kodlari

| HTTP | Code | Sabab |
|------|------|-------|
| `401` | `missing_token` | Authorization headeri yo'q |
| `401` | `invalid_token` | JWT noto'g'ri yoki muddati o'tgan |
| `403` | `role_not_allowed` | Bu endpoint moderator uchun yopiq |
| `403` | `not_flag_owner_or_admin` | Boshqa odamning flag'ini o'zgartira olmaysiz |
| `403` | `admin_only` | Faqat admin uchun (audit log) |
| `403` | `pii_reveal_required` | CSV da PII so'raldi lekin reveal qilinmagan |
| `400` | `flag_already_resolved` | Flag allaqachon hal qilingan |
| `400` | `validation_error` | Pydantic validation xatosi |
| `404` | `flag_not_found` | Flag topilmadi |
| `404` | `organization_not_found` | Tashkilot topilmadi |

---

## 8. Model tuzilmalari

### FlagRead
```typescript
interface FlagRead {
  id: string;
  raised_by: string;       // UUID
  role: string;            // "moderator" | "admin" | "direktor"
  entity_type: string;     // "organization" | "youth" | "plan" | "meeting"
  entity_id: string;       // UUID
  category: "data_quality" | "suspected_fraud" | "safeguarding" | "other";
  status: "open" | "resolved" | "dismissed";
  comment: string;
  resolved_by: string | null;    // UUID
  resolved_at: string | null;    // ISO datetime
  resolution: string | null;
  created_at: string;
  updated_at: string;
}
```

### StatsAgencyRead
```typescript
interface StatsAgencyRead {
  total_youth: number;
  active_youth: number;
  graduated_youth: number;
  removed_youth: number;
  total_organizations: number;
  total_masullar: number;
  total_plans: number;
  completed_plans: number;
  in_progress_plans: number;
  total_meetings: number;
  attended_meetings: number;
}
```

### StatsDistrictRead
```typescript
interface StatsDistrictRead {
  district_id: string;
  total_youth: number;
  active_youth: number;
  graduated_youth: number;
  total_organizations: number;
  total_masullar: number;
  total_plans: number;
  completed_plans: number;
  total_meetings: number;
  completion_rate: number;    // foiz, 0–100
}
```

### StatsTrendPoint
```typescript
interface StatsTrendPoint {
  period: string;    // ISO datetime (oy/hafta boshi)
  value: number;
}
```

---

## 9. Taqiqlangan endpoint'lar (403 qaytaradi)

Moderator token bilan quyidagi so'rovlar `403 role_not_allowed` qaytaradi:

| Endpoint | Sabab |
|----------|-------|
| `POST/PATCH/DELETE /api/organizations/*` | Faqat o'qish |
| `* /api/youth/*` | Operatsion modul |
| `* /api/masullar/*` | Operatsion modul |
| `* /api/plans/*` | Operatsion modul |
| `* /api/meetings/*` | Operatsion modul |
| `* /api/users/*` | Foydalanuvchi boshqaruvi |
| `GET /api/audit-log` | Faqat admin |

Moderator uchun **yozish mumkin bo'lgan yagona modul** — `/api/flags/*`.

---

## 10. Frontend sahifalar va endpoint mapping

| Sahifa | Endpoint'lar |
|--------|-------------|
| **Dashboard** | `GET /api/stats/agency?from&to`, `GET /api/stats/districts?from&to` |
| **Monitoring** | `GET /api/stats/districts`, `GET /api/stats/compare?a&b&from&to`, `GET /api/stats/trends?metric&granularity&from&to` |
| **Tashkilotlar** | `GET /api/organizations`, `GET /api/organizations/:id` |
| **Flagging (sozlamalar ichida)** | `POST /api/flags`, `GET /api/flags`, `PATCH /api/flags/:id` |
| **PII ochish** | `POST /api/pii/reveal` |
| **CSV export** | `GET /api/reports/agency.csv?from&to` |

---

## 11. Frontend integratsiya maslahatlar

1. **URL filter persistence**: barcha filtrlar (`district`, `from`, `to`) URL query param sifatida saqlansin — sahifa yangilaganda ham saqlanadi, link ulashish ishlaydi. Namuna: `?district=Bekobod%20tumani&from=2026-01-01&to=2026-06-30`.

2. **"Read-only" badge**: topbar da foydalanuvchi avatar yonida ko'rinadigan belgi — moderator uchun har qanday yozish urinishini oldini oluvchi vizual signal.

3. **`readOnly` prop**: barcha umumiy komponentlar (`YouthTable`, `OrgCard`, va h.k.) `readOnly` propni qabul qilishi kerak. `readOnly=true` bo'lganda `Edit`, `Delete`, `Add` tugmalari yashiriladi.

4. **Anomaly (outlier) deteksiya**: monitoring sahifasida plan bajarilishi yoki davomat ko'rsatkichi o'rtachadan 1.5σ past bo'lgan tumanlar vizual belgilansin (sariq yoki qizil rang).

5. **Compare-N**: monitoring sahifasida 4 ta tumangacha tanlash imkoniyati — small multiples chart. `GET /api/stats/compare` faqat 2 ta qaytaradi, lekin UI 4 tagacha qo'llab-quvvatlashi uchun ketma-ket chaqirilishi mumkin.

6. **PII reveal flow**: yosh ma'lumotlari default anonim (initsiallari + ID). "To'liq ma'lumot ko'rish" tugmasi bosilganda sabab dialog ochiladi (min 30 belgi) → `POST /api/pii/reveal` → 5 daqiqa ichida ma'lumotlar to'liq ko'rinadi.

7. **Pagination**: barcha list endpointlar `{ data: [...], meta: { total, page, limit } }` qaytaradi. TanStack Query `placeholderData: keepPreviousData` bilan ishlating.

---

## 12. Pagination format (barcha list endpoint'lar)

```json
{
  "data": [ ... ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

Frontend `page` va `limit` query param'lar orqali boshqaradi.
Keyingi sahifa: `page=2&limit=20`. Oxirgi sahifa: `Math.ceil(total / limit)`.
