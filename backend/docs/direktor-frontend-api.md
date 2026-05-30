# Direktor Frontend API Reference

Direktor roli uchun barcha backend endpointlari.
Base URL: `/api`
Auth: `Authorization: Bearer <access_token>` header har bir so'rovda bo'lishi kerak.

---

## Rollar va ruxsatlar

| Rol | Kod | Yoshlarni boshqarish | Masullar | Rejalar | Uchrashuvlar | Tashkilotlar (yozish) | Status o'zgartirish | Removal workflow |
|-----|-----|---------------------|----------|---------|--------------|----------------------|--------------------|-----------------| 
| Admin | `admin` | To'liq | To'liq | To'liq | To'liq | To'liq | Ha | approve/reject |
| Direktor | `direktor` | To'liq | To'liq | To'liq | To'liq | To'liq | Ha | approve/reject |
| Tashkilot direktori | `tashkilot_direktori` | O'z tumani | O'z tumani | To'liq | To'liq | Yo'q | Yo'q | propose |
| Mas'ul hodim | `masul_hodim` | Faqat o'z yoshlari (contact/notes) | Yo'q | To'liq | To'liq | Yo'q | Yo'q | Yo'q |
| Moderator | `moderator` | Yo'q | Yo'q | Yo'q | Yo'q | Yo'q | Yo'q | Yo'q |

---

## 1. Yoshlar (Youth)

### `GET /api/youth`

Yoshlar ro'yxatini olish. Rol bo'yicha avtomatik filtr qo'llanadi.

**Query params:**

| Param | Turi | Default | Tavsif |
|-------|------|---------|--------|
| `district_id` | string? | — | Tuman bo'yicha filtr (admin/direktor uchun) |
| `status` | string? | — | `active`, `graduated`, `removed` |
| `search` | string? | — | Ism bo'yicha qidiruv (ilike) |
| `page` | int | 1 | Sahifa raqami (>=1) |
| `limit` | int | 20 | Sahifadagi elementlar soni (1-100) |

**Response 200:**
```json
{
  "data": [YouthRead],
  "meta": { "total": 150, "page": 1, "limit": 20 }
}
```

**Scope qoidalari:**
- `admin`/`direktor`: barcha tumanlar, `district_id` param bilan filtr
- `tashkilot_direktori`: faqat o'z tumani (district_id avtomatik)
- `masul_hodim`: faqat o'ziga biriktirilgan yoshlar
- `moderator`: **403 Forbidden**

---

### `POST /api/youth`

Yangi yosh qo'shish.

**Request body:**
```json
{
  "full_name": "Anvar Toshmatov",        // required, 2-255
  "birth_date": "2001-05-15",             // optional, YYYY-MM-DD
  "district_id": "Bekobod tumani",        // required, 1-64
  "masul_id": "uuid",                     // optional
  "organization_id": "uuid",             // optional
  "category": "talaba",                   // optional, max 64
  "contact": "+998901234567",             // optional, max 255
  "notes": {"key": "value"}              // optional, JSONB
}
```

**Scope qoidalari:**
- `tashkilot_direktori`: `district_id` avtomatik o'z tumaniga o'rnatiladi (jo'natilgan qiymat e'tiborsiz)
- `masul_hodim`, `moderator`: **403 Forbidden**

**Response 201:** `YouthRead`

---

### `GET /api/youth/{youth_id}`

Bitta yoshni olish.

**Response 200:** `YouthRead`
**Response 404:** `{"detail": "youth_not_found"}`

**Scope:** tashkilot_direktori faqat o'z tumanidagini, masul faqat o'ziga biriktirilganini ko'ra oladi.

---

### `PATCH /api/youth/{youth_id}`

Yosh ma'lumotlarini yangilash.

**Request body (admin/direktor/tashkilot):**
```json
{
  "full_name": "Yangi Ism",      // optional
  "birth_date": "2000-01-01",    // optional
  "category": "ishchi",          // optional
  "contact": "+998900000000",    // optional
  "notes": {},                   // optional
  "organization_id": "uuid"     // optional
}
```

**Request body (masul_hodim — cheklangan):**
```json
{
  "contact": "+998909999999",    // optional
  "notes": {"key": "value"}     // optional
}
```

> Masul hodim faqat `contact` va `notes` ni o'zgartira oladi. Boshqa fieldlar e'tiborsiz qoldiriladi.

**Response 200:** `YouthRead`

---

### `DELETE /api/youth/{youth_id}`

Yoshni o'chirish. Faqat `admin`, `direktor`, `tashkilot_direktori`.

**Response 204:** Bo'sh body
**403:** masul_hodim va moderator uchun

---

### `POST /api/youth/{youth_id}/assign-masul`

Yoshga mas'ul hodim biriktirish.

**Request body:**
```json
{
  "masul_id": "uuid",     // required
  "override": false        // optional, default false
}
```

**Biznes qoidalari:**
- Yosh va masulning `district_id` si bir xil bo'lishi kerak
- Agar tuman boshqa bo'lsa va `override: true` bo'lsa — faqat `admin`/`direktor` ruxsat beradi
- `tashkilot_direktori` `override: true` qo'ysa ham **403** qaytaradi
- Masulni biriktirganda `organization_id` ham avtomatik yangilanadi

**Response 200:** `YouthRead`
**Response 422:** `{"detail": "district_mismatch_youth_masul"}`

---

### `POST /api/youth/{youth_id}/status`

Yosh statusini o'zgartirish. Faqat `admin`/`direktor`.

**Request body:**
```json
{
  "status": "graduated",                          // required: active|graduated|removed
  "reason": "Universitetni muvaffaqiyatli tugatdi" // optional, max 2000
}
```

**Response 200:** `YouthRead`
**403:** boshqa rollar uchun

---

## 2. Removal Workflow (Ro'yxatdan chiqarish)

### `GET /api/youth/removals`

Kutilayotgan chiqarish so'rovlari. Faqat `admin`/`direktor`.

**Query params:** `page`, `limit`

**Response 200:**
```json
{
  "data": [YouthRead],  // removal_proposal != null bo'lgan yoshlar
  "meta": { "total": 5, "page": 1, "limit": 20 }
}
```

---

### `POST /api/youth/{youth_id}/propose-removal`

Chiqarish taklif qilish. Faqat `tashkilot_direktori`, faqat o'z tumanidagi yosh uchun.

**Request body:**
```json
{
  "reason": "Bu yosh boshqa viloyatga ko'chib ketgan, hujjatlar tasdiqlangan"  // min 20, max 2000
}
```

**Response 200:** `YouthRead` — `removal_proposal` JSONB to'ldiriladi:
```json
{
  "removal_proposal": {
    "proposed_by": "uuid",
    "reason": "...",
    "proposed_at": "2026-05-28T10:00:00+00:00",
    "status": "pending"
  }
}
```

**Validatsiya:**
- `reason` min 20 belgi
- Agar allaqachon `removal_proposal` bo'lsa — **422** `removal_already_proposed`

---

### `POST /api/youth/{youth_id}/approve-removal`

Chiqarish so'rovini tasdiqlash. Faqat `admin`/`direktor`.

**Request body:** Bo'sh `{}`

**Natija:**
- `status` = `removed` ga o'zgaradi
- `removal_proposal.status` = `approved`
- `removal_proposal.reviewed_by` = director ID
- `removal_proposal.reviewed_at` = timestamp

**Response 200:** `YouthRead`
**422:** agar pending proposal yo'q bo'lsa

---

### `POST /api/youth/{youth_id}/reject-removal`

Chiqarish so'rovini rad etish. Faqat `admin`/`direktor`.

**Request body:**
```json
{
  "comment": "Tekshirib ko'rdik, yosh hali bu yerda yashaydi"  // min 10, max 2000
}
```

**Natija:**
- `removal_proposal.status` = `rejected`
- `removal_proposal.reviewer_comment` = comment
- Yosh statusi **o'zgarmaydi** (active qoladi)

**Response 200:** `YouthRead`

---

## 3. Mas'ul hodimlar (Masullar)

### `GET /api/masullar`

**Ruxsat:** `admin`, `direktor`, `tashkilot_direktori`

**Query params:**

| Param | Turi | Tavsif |
|-------|------|--------|
| `district_id` | string? | Tuman filtri |
| `organization_id` | uuid? | Tashkilot filtri |
| `search` | string? | Ism bo'yicha qidiruv |
| `page` | int | Sahifa (default 1) |
| `limit` | int | Limit (default 20, max 100) |

> `tashkilot_direktori`: `district_id` avtomatik o'z tumaniga o'rnatiladi.

**Response 200:**
```json
{
  "data": [MasulRead],
  "meta": { "total": 30, "page": 1, "limit": 20 }
}
```

---

### `POST /api/masullar`

Yangi mas'ul qo'shish.

**Request body:**
```json
{
  "full_name": "Sardor Toshmatov",     // required, 2-255
  "district_id": "Bekobod tumani",     // required, 1-64
  "organization_id": "uuid",           // required
  "phone": "+998901234567",            // optional, max 32
  "email": "sardor@example.com"        // optional, max 255
}
```

> `tashkilot_direktori`: `district_id` avtomatik o'z tumaniga.

**Response 201:** `MasulRead`

---

### `GET /api/masullar/{masul_id}`

**Response 200:** `MasulRead`
**403:** tashkilot_direktori boshqa tumanning masulini ko'ra olmaydi

---

### `PATCH /api/masullar/{masul_id}`

**Request body:**
```json
{
  "full_name": "Yangi Ism",          // optional
  "phone": "+998901111111",           // optional
  "email": "new@example.com"         // optional
}
```

**Response 200:** `MasulRead`
**403:** tashkilot_direktori — boshqa tuman masulini o'zgartira olmaydi

---

### `DELETE /api/masullar/{masul_id}`

**Response 204:** Bo'sh body
**403:** boshqa tuman masulini o'chira olmaydi (tashkilot)

---

## 4. Rejalar (Plans)

### `GET /api/plans`

**Ruxsat:** `admin`, `direktor`, `tashkilot_direktori`, `masul_hodim`

**Query params:**

| Param | Turi | Tavsif |
|-------|------|--------|
| `youth_id` | uuid? | Yosh bo'yicha filtr |
| `status` | string? | `draft`, `in_progress`, `completed`, `cancelled` |
| `district_id` | string? | Tuman (admin/direktor uchun) |
| `page` | int | Sahifa |
| `limit` | int | Limit |

**Scope:**
- `tashkilot_direktori`: o'z tumani
- `masul_hodim`: o'zining rejalarigina

**Response 200:**
```json
{
  "data": [PlanRead],
  "meta": { "total": 45, "page": 1, "limit": 20 }
}
```

---

### `POST /api/plans`

**Request body:**
```json
{
  "youth_id": "uuid",                    // required
  "masul_id": "uuid",                    // required
  "title": "Kasb o'rgatish rejasi",      // required, 2-255
  "goal": "IT sohasida ish topish",      // optional, max 1000
  "milestones": [                        // optional, JSONB
    {"title": "Kurs boshlash", "deadline": "2026-07-01"}
  ],
  "status": "draft",                     // optional, default "draft"
  "start_date": "2026-06-01",            // required, YYYY-MM-DD
  "end_date": "2026-12-31"              // required, YYYY-MM-DD
}
```

**Response 201:** `PlanRead`

---

### `GET /api/plans/{plan_id}`

**Response 200:** `PlanRead`

---

### `PATCH /api/plans/{plan_id}`

**Request body:**
```json
{
  "title": "Yangilangan reja",    // optional
  "goal": "Yangi maqsad",        // optional
  "milestones": [...],            // optional
  "status": "in_progress",       // optional
  "progress": 50,                // optional, 0-100
  "end_date": "2027-03-01"      // optional
}
```

**Response 200:** `PlanRead`

---

### `DELETE /api/plans/{plan_id}`

Faqat `admin`, `direktor`, `tashkilot_direktori`. `masul_hodim` **403**.

**Response 204:** Bo'sh body

---

## 5. Uchrashuvlar (Meetings)

### `GET /api/meetings`

**Ruxsat:** `admin`, `direktor`, `tashkilot_direktori`, `masul_hodim`

**Query params:**

| Param | Turi | Tavsif |
|-------|------|--------|
| `youth_id` | uuid? | Yosh bo'yicha filtr |
| `district_id` | string? | Tuman |
| `page` | int | Sahifa |
| `limit` | int | Limit |

**Scope:**
- `tashkilot_direktori`: o'z tumani
- `masul_hodim`: o'zining uchrashuvlarigina

**Response 200:**
```json
{
  "data": [MeetingRead],
  "meta": { "total": 20, "page": 1, "limit": 20 }
}
```

---

### `POST /api/meetings`

**Request body:**
```json
{
  "youth_id": "uuid",                            // required
  "masul_id": "uuid",                             // required
  "scheduled_at": "2026-07-01T10:00:00",          // required, datetime
  "type": "individual",                            // optional, max 64
  "location": "Yoshlar markazi",                   // optional, max 255
  "agenda": "Kasb tanlash bo'yicha maslahat"       // optional, max 2000
}
```

**Response 201:** `MeetingRead`

---

### `GET /api/meetings/{meeting_id}`

**Response 200:** `MeetingRead`

---

### `PATCH /api/meetings/{meeting_id}`

**Request body:**
```json
{
  "scheduled_at": "2026-07-05T14:00:00",   // optional
  "type": "group",                          // optional
  "location": "Yangi manzil",             // optional
  "agenda": "Yangi kun tartibi"            // optional
}
```

**Response 200:** `MeetingRead`

---

### `PATCH /api/meetings/{meeting_id}/attendance`

Davomat qayd qilish.

**Request body:**
```json
{
  "attendance_status": "attended",                           // required: scheduled|attended|no_show|rescheduled
  "attendance_notes": "Kechikib keldi, lekin qatnashdi"      // optional, max 2000
}
```

**Response 200:** `MeetingRead`

---

### `DELETE /api/meetings/{meeting_id}`

**Response 204:** Bo'sh body

---

## 6. Tashkilotlar (Organizations) — Yozish

Mavjud `GET` endpointlar moderator API da. Quyidagilar faqat `admin`/`direktor` uchun:

### `POST /api/organizations`

**Request body:**
```json
{
  "name": "Bekobod yoshlar markazi",     // required, 2-255
  "district_id": "Bekobod tumani",       // required, 1-64
  "type": "yoshlar_markazi",             // optional, max 64
  "contact_phone": "+998712345678",      // optional, max 32
  "address": "Bekobod tumani, 1-mavze",  // optional, max 500
  "director_name": "Karimov Jasur"       // required, 2-255
}
```

**Response 201:** `OrganizationRead`
**403:** moderator, tashkilot_direktori, masul_hodim

---

### `PATCH /api/organizations/{org_id}`

**Request body:**
```json
{
  "name": "Yangi nom",             // optional
  "type": "ta'lim_markazi",        // optional
  "contact_phone": "+998711111111", // optional
  "address": "Yangi manzil",      // optional
  "director_name": "Yangi direktor" // optional
}
```

**Response 200:** `OrganizationRead`

---

### `DELETE /api/organizations/{org_id}`

**Response 204:** Bo'sh body
**403:** admin/direktor dan boshqa rollar

---

## Model tuzilmalari

### YouthRead
```typescript
interface YouthRead {
  id: string;           // UUID
  full_name: string;
  birth_date: string | null;    // YYYY-MM-DD
  district_id: string;
  masul_id: string | null;      // UUID
  organization_id: string | null; // UUID
  status: "active" | "graduated" | "removed";
  category: string | null;
  contact: string | null;
  notes: Record<string, any> | null;   // JSONB
  removal_proposal: RemovalProposal | null;  // JSONB
  created_at: string;   // ISO datetime
  updated_at: string;
}

interface RemovalProposal {
  proposed_by: string;    // UUID
  reason: string;
  proposed_at: string;    // ISO datetime
  status: "pending" | "approved" | "rejected";
  reviewed_by?: string;   // UUID (faqat review qilinganda)
  reviewed_at?: string;
  reviewer_comment?: string;  // faqat reject qilinganda
}
```

### MasulRead
```typescript
interface MasulRead {
  id: string;
  full_name: string;
  district_id: string;
  organization_id: string;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}
```

### PlanRead
```typescript
interface PlanRead {
  id: string;
  youth_id: string;
  masul_id: string;
  title: string;
  goal: string | null;
  milestones: any[] | null;   // JSONB
  status: "draft" | "in_progress" | "completed" | "cancelled";
  progress: number;           // 0-100
  start_date: string;         // YYYY-MM-DD
  end_date: string;
  created_at: string;
  updated_at: string;
}
```

### MeetingRead
```typescript
interface MeetingRead {
  id: string;
  youth_id: string;
  masul_id: string;
  scheduled_at: string;        // ISO datetime
  type: string | null;
  location: string | null;
  agenda: string | null;
  attendance_status: "scheduled" | "attended" | "no_show" | "rescheduled";
  attendance_notes: string | null;
  attachments: any[] | null;   // JSONB
  created_at: string;
  updated_at: string;
}
```

### OrganizationRead
```typescript
interface OrganizationRead {
  id: string;
  name: string;
  district_id: string;
  type: string | null;
  contact_phone: string | null;
  address: string | null;
  director_name: string;
  created_at: string;
  updated_at: string;
}
```

---

## Xatolik kodlari

| HTTP Status | Sabab |
|-------------|-------|
| 401 | Token yo'q yoki muddati tugagan |
| 403 | Rol ruxsat bermaydi |
| 404 | Entity topilmadi (`youth_not_found`, `masul_not_found`, etc.) |
| 422 | Validatsiya xatosi (`district_mismatch_youth_masul`, `removal_already_proposed`, `no_pending_proposal`) |
| 500 | Server xatosi |

**Xatolik response formati:**
```json
{
  "detail": "error_code_here"
}
```

---

## Frontend integratsiya maslahatlar

1. **Pagination**: Barcha list endpointlar `{ data: [...], meta: { total, page, limit } }` qaytaradi. TanStack Query `keepPreviousData` bilan ishlating.

2. **Scope filtrlari**: Backend avtomatik scope qo'yadi — frontendda qo'shimcha filtr kerak emas. Lekin admin/direktor uchun `district_id` dropdown qo'yish yaxshi.

3. **Removal workflow UI**: 
   - Tashkilot direktori: "Chiqarish taklif qilish" tugmasi (propose-removal)
   - Direktor/Admin: `/api/youth/removals` dan pending list ko'rsin, har biriga "Tasdiqlash"/"Rad etish" tugmalari

4. **Masul biriktirish**: `assign-masul` endpointida `override: true` faqat district mismatch holatda kerak. Frontendda confirmation dialog ko'rsating: "Tuman farq qiladi, davom etasizmi?"

5. **Optimistic updates**: PATCH endpointlar yangilangan entity qaytaradi — cache ni shu bilan yangilang.

6. **Masul hodim cheklovi**: Masul faqat `contact` va `notes` ni o'zgartira oladi. UI da boshqa fieldlarni disabled qiling.
