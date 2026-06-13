# Mobile Masullar API

Эндпоинты для мобильного приложения масъул ходима.  
Все эндпоинты доступны **только** роли `masul_hodim`.

**Base URL:** `http://localhost:8000`  
**Авторизация:** `Authorization: Bearer <access_token>`  
**Формат ответа:** JSON, все ключи в `camelCase`

---

## Содержание

**Профиль и статистика**
1. [GET /api/mobile/masullar/me](#1-get-apimobilemasullarme)
2. [GET /api/mobile/masullar/me/stats](#2-get-apimobilemasullarme-stats)

**Молодёжь**
3. [GET /api/mobile/masullar/me/youth](#3-get-apimobilemasullarme-youth)
4. [GET /api/mobile/masullar/me/youth/{youth_id}](#4-get-apimobilemasullarme-youthyouth_id)
5. [PATCH /api/mobile/masullar/me/youth/{youth_id}](#5-patch-apimobilemasullarme-youthyouth_id)

**Планы**
6. [GET /api/mobile/masullar/me/plans](#6-get-apimobilemasullarme-plans)
7. [POST /api/mobile/masullar/me/plans](#7-post-apimobilemasullarme-plans)
8. [GET /api/mobile/masullar/me/plans/{plan_id}](#8-get-apimobilemasullarme-plansplan_id)
9. [PATCH /api/mobile/masullar/me/plans/{plan_id}](#9-patch-apimobilemasullarme-plansplan_id)
10. [PATCH /api/mobile/masullar/me/plans/{plan_id}/progress](#10-patch-apimobilemasullarme-plansplan_idprogress)

**Встречи**
11. [GET /api/mobile/masullar/me/meetings/upcoming](#11-get-apimobilemasullarme-meetingsupcoming)
12. [GET /api/mobile/masullar/me/meetings](#12-get-apimobilemasullarme-meetings)
13. [POST /api/mobile/masullar/me/meetings](#13-post-apimobilemasullarme-meetings)
14. [GET /api/mobile/masullar/me/meetings/{meeting_id}](#14-get-apimobilemasullarme-meetingsmeeting_id)
15. [PATCH /api/mobile/masullar/me/meetings/{meeting_id}](#15-patch-apimobilemasullarme-meetingsmeeting_id)
16. [PATCH /api/mobile/masullar/me/meetings/{meeting_id}/attendance](#16-patch-apimobilemasullarme-meetingsmeeting_idattendance)

**Справочник**
- [Коды ошибок](#коды-ошибок)
- [Типы данных](#типы-данных)
- [TypeScript интерфейсы](#typescript-интерфейсы)

---

## Профиль и статистика

### 1. GET /api/mobile/masullar/me

Профиль текущего масъул ходима.

**Request:**
```http
GET /api/mobile/masullar/me
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "id": "eb33f00f-cfd4-4800-a4a2-260f0a26eefb",
  "fullName": "Aliyev Bobur Anvarovich",
  "districtId": "Bekobod tumani",
  "organizationId": "3ef0d8f4-2d03-4ca3-93c5-a444a69ea1ff",
  "phone": "+998901234567",
  "email": "aliyev@example.com",
  "position": "O'qituvchi",
  "youthCount": 12,
  "createdAt": "2026-05-28T07:33:27.947031Z"
}
```

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | `string (uuid)` | ID записи масъул ходима |
| `fullName` | `string` | Полное имя |
| `districtId` | `string` | Туман |
| `organizationId` | `string (uuid) \| null` | ID организации |
| `phone` | `string \| null` | Телефон |
| `email` | `string \| null` | Email |
| `position` | `string \| null` | Должность |
| `youthCount` | `number` | Количество закреплённой молодёжи |
| `createdAt` | `string (ISO 8601)` | Дата создания |

---

### 2. GET /api/mobile/masullar/me/stats

Агрегированная статистика для дашборда.

**Request:**
```http
GET /api/mobile/masullar/me/stats
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "totalYouth": 12,
  "active": 9,
  "graduated": 2,
  "removed": 1,
  "plansActive": 5,
  "meetingsUpcoming": 3
}
```

| Поле | Тип | Описание |
|------|-----|----------|
| `totalYouth` | `number` | Всего молодёжи (без deleted) |
| `active` | `number` | Статус `active` |
| `graduated` | `number` | Статус `graduated` |
| `removed` | `number` | Статус `removed` |
| `plansActive` | `number` | Планы со статусом `in_progress` |
| `meetingsUpcoming` | `number` | Предстоящие встречи со статусом `scheduled` |

---

## Молодёжь

### 3. GET /api/mobile/masullar/me/youth

Список молодёжи (облегчённый формат). Поддерживает фильтр и поиск.

**Request:**
```http
GET /api/mobile/masullar/me/youth?page=1&limit=20
GET /api/mobile/masullar/me/youth?status=active&search=Ali
Authorization: Bearer <token>
```

**Query параметры:**

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|-------------|----------|
| `page` | `number` | `1` | Номер страницы |
| `limit` | `number` | `20` (макс 100) | Размер страницы |
| `status` | `string \| null` | — | `active` / `graduated` / `removed` |
| `search` | `string \| null` | — | Поиск по имени |

**Response 200:**
```json
{
  "data": [
    {
      "id": "f1a2b3c4-...",
      "fullName": "Karimov Jasur",
      "status": "active",
      "category": "talaba",
      "contact": "+998901112233",
      "dateOfBirth": "2002-05-15"
    }
  ],
  "total": 12,
  "page": 1,
  "limit": 20
}
```

---

### 4. GET /api/mobile/masullar/me/youth/{youth_id}

Полная информация о конкретном молодом человеке.

**Request:**
```http
GET /api/mobile/masullar/me/youth/f1a2b3c4-...
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "id": "f1a2b3c4-...",
  "fullName": "Karimov Jasur",
  "districtId": "Bekobod tumani",
  "status": "active",
  "category": "talaba",
  "contact": "+998901112233",
  "dateOfBirth": "2002-05-15",
  "address": "Bekobod sh., Mustaqillik 12",
  "notes": "Faol yosh",
  "removalProposal": null,
  "masulId": "eb33f00f-...",
  "organizationId": "3ef0d8f4-...",
  "createdAt": "2026-01-10T08:00:00Z"
}
```

**Ошибки:**
- `403 youth_not_assigned` — молодой человек закреплён за другим масъулом
- `404 youth_not_found` — не найден

---

### 5. PATCH /api/mobile/masullar/me/youth/{youth_id}

Обновить контакт и/или заметки. **Только** эти два поля — остальные игнорируются.

**Request:**
```http
PATCH /api/mobile/masullar/me/youth/f1a2b3c4-...
Authorization: Bearer <token>
Content-Type: application/json
```

**Body** (все поля необязательны):
```json
{
  "contact": "+998901234567",
  "notes": "Yangilangan izoh"
}
```

| Поле | Тип | Макс. длина | Описание |
|------|-----|-------------|----------|
| `contact` | `string \| null` | 64 | Контактный телефон |
| `notes` | `string \| null` | 2000 | Заметки |

**Response 200:** `MobileYouthDetail` (полная карточка с изменениями)

**Ошибки:**
- `403 youth_not_assigned` — чужой молодой человек

---

## Планы

### 6. GET /api/mobile/masullar/me/plans

Список планов (облегчённый формат).

**Request:**
```http
GET /api/mobile/masullar/me/plans?status=in_progress
Authorization: Bearer <token>
```

**Query параметры:**

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|-------------|----------|
| `page` | `number` | `1` | Номер страницы |
| `limit` | `number` | `20` (макс 100) | Размер страницы |
| `status` | `string \| null` | — | `draft` / `in_progress` / `completed` / `cancelled` |

**Response 200:**
```json
{
  "data": [
    {
      "id": "cc33dd44-...",
      "youthId": "f1a2b3c4-...",
      "youthName": "Karimov Jasur",
      "title": "Kasbiy rivojlanish rejasi",
      "status": "in_progress",
      "progress": 45,
      "endDate": "2026-09-01"
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 20
}
```

---

### 7. POST /api/mobile/masullar/me/plans

Создать новый план для молодого человека.

> `youthId` должен быть закреплён за текущим масъулом, иначе `403`.

**Request:**
```http
POST /api/mobile/masullar/me/plans
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "youthId": "f1a2b3c4-...",
  "title": "Universitetga tayyorgarlik",
  "goal": "Davlat testiga tayyorlash",
  "milestones": [
    {
      "title": "Test markazidan ro'yxatdan o'tish",
      "done": false,
      "dueDate": "2026-04-01"
    },
    {
      "title": "Repetitor bilan keladi",
      "done": false,
      "dueDate": "2026-09-01"
    }
  ],
  "startDate": "2026-06-01",
  "endDate": "2027-07-30"
}
```

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `youthId` | `string (uuid)` | ✅ | ID молодого человека |
| `title` | `string (2–255)` | ✅ | Название плана |
| `goal` | `string (макс 2000)` | — | Цель |
| `milestones` | `Milestone[]` | — | Этапы (см. ниже) |
| `startDate` | `YYYY-MM-DD` | — | Дата начала |
| `endDate` | `YYYY-MM-DD` | — | Дата окончания |

**Milestone:**
```json
{
  "title": "Bosqich nomi",
  "done": false,
  "dueDate": "2026-04-01",
  "notes": "Ixtiyoriy izoh"
}
```

**Response 201:** `MobilePlanDetail`

**Ошибки:**
- `403 youth_not_assigned`
- `404 youth_not_found`

---

### 8. GET /api/mobile/masullar/me/plans/{plan_id}

Полная детальная информация о плане с этапами (milestones).

**Response 200:**
```json
{
  "id": "cc33dd44-...",
  "youthId": "f1a2b3c4-...",
  "youthName": "Karimov Jasur",
  "masulId": "eb33f00f-...",
  "title": "Universitetga tayyorgarlik",
  "goal": "Davlat testiga tayyorlash",
  "milestones": [
    {
      "title": "Test markazidan ro'yxatdan o'tish",
      "done": true,
      "dueDate": "2026-04-01",
      "notes": null
    }
  ],
  "status": "in_progress",
  "progress": 45,
  "notes": null,
  "attachments": [],
  "startDate": "2026-06-01",
  "endDate": "2027-07-30",
  "createdAt": "2026-01-10T08:00:00Z"
}
```

**Ошибки:**
- `403 youth_not_assigned`
- `404 plan_not_found`

---

### 9. PATCH /api/mobile/masullar/me/plans/{plan_id}

Обновить план (заголовок, цель, этапы, даты).

**Body** (все поля необязательны):
```json
{
  "title": "Yangilangan sarlavha",
  "goal": "Yangilangan maqsad",
  "status": "in_progress",
  "progress": 60,
  "milestones": [
    { "title": "Yangi bosqich", "done": false, "dueDate": "2026-08-01" }
  ],
  "endDate": "2027-08-01"
}
```

| Поле | Тип | Описание |
|------|-----|----------|
| `title` | `string (2–255) \| null` | Название |
| `goal` | `string (макс 2000) \| null` | Цель |
| `milestones` | `Milestone[] \| null` | Полная замена списка этапов |
| `status` | `PlanStatus \| null` | Статус |
| `progress` | `number (0–100) \| null` | Прогресс |
| `startDate` | `YYYY-MM-DD \| null` | Дата начала |
| `endDate` | `YYYY-MM-DD \| null` | Дата окончания |

**Response 200:** `MobilePlanDetail`

---

### 10. PATCH /api/mobile/masullar/me/plans/{plan_id}/progress

Быстрое обновление прогресса и/или статуса плана. Удобно для мобильного использования.

**Body** (все поля необязательны):
```json
{
  "progress": 75,
  "status": "in_progress",
  "notes": "3-bosqich bajarildi"
}
```

| Поле | Тип | Описание |
|------|-----|----------|
| `progress` | `number (0–100) \| null` | Прогресс |
| `status` | `PlanStatus \| null` | Статус |
| `notes` | `string (макс 2000) \| null` | Заметка к обновлению |

**Response 200:** `MobilePlanDetail`

---

## Встречи

### 11. GET /api/mobile/masullar/me/meetings/upcoming

Предстоящие встречи в ближайшие N дней. Только со статусом `scheduled`.  
Отсортированы по дате (ближайшие первые).

**Request:**
```http
GET /api/mobile/masullar/me/meetings/upcoming?days=7
Authorization: Bearer <token>
```

**Query параметры:**

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|-------------|----------|
| `days` | `number` | `7` (от 1 до 30) | Горизонт в днях |

**Response 200:**
```json
[
  {
    "id": "aa11bb22-...",
    "youthId": "f1a2b3c4-...",
    "youthName": "Karimov Jasur",
    "scheduledAt": "2026-06-15T10:00:00Z",
    "type": "individual",
    "location": "Ofis 12",
    "attendanceStatus": "scheduled"
  }
]
```

---

### 12. GET /api/mobile/masullar/me/meetings

Полный список встреч с пагинацией.

**Query параметры:**

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|-------------|----------|
| `page` | `number` | `1` | Номер страницы |
| `limit` | `number` | `20` (макс 100) | Размер страницы |
| `youthId` | `string (uuid) \| null` | — | Фильтр по конкретному молодому человеку |

**Response 200:**
```json
{
  "data": [
    {
      "id": "aa11bb22-...",
      "youthId": "f1a2b3c4-...",
      "youthName": "Karimov Jasur",
      "scheduledAt": "2026-06-15T10:00:00Z",
      "type": "individual",
      "location": "Ofis 12",
      "attendanceStatus": "attended"
    }
  ],
  "total": 18,
  "page": 1,
  "limit": 20
}
```

---

### 13. POST /api/mobile/masullar/me/meetings

Создать встречу.

> Нельзя создать две встречи для одного молодого человека в один день — вернёт `409 meeting_same_day_collision`.

**Body:**
```json
{
  "youthId": "f1a2b3c4-...",
  "scheduledAt": "2026-06-20T10:00:00Z",
  "type": "individual",
  "location": "Bekobod yoshlar markazi",
  "agenda": "Oylik baholash"
}
```

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `youthId` | `string (uuid)` | ✅ | ID молодого человека |
| `scheduledAt` | `string (ISO 8601)` | ✅ | Дата и время (UTC) |
| `type` | `string (макс 64) \| null` | — | Тип: `individual`, `group`, `online`, `phone` |
| `location` | `string (макс 255) \| null` | — | Место |
| `agenda` | `string (макс 2000) \| null` | — | Повестка |

**Response 201:** `MobileMeetingDetail`

**Ошибки:**
- `403 youth_not_assigned`
- `404 youth_not_found`
- `409 meeting_same_day_collision` — уже есть встреча с этим молодым в тот же день

---

### 14. GET /api/mobile/masullar/me/meetings/{meeting_id}

Полная детальная информация о встрече.

**Response 200:**
```json
{
  "id": "aa11bb22-...",
  "youthId": "f1a2b3c4-...",
  "youthName": "Karimov Jasur",
  "masulId": "eb33f00f-...",
  "scheduledAt": "2026-06-20T10:00:00Z",
  "type": "individual",
  "location": "Bekobod yoshlar markazi",
  "agenda": "Oylik baholash",
  "attendanceStatus": "scheduled",
  "attendanceNotes": null,
  "attachments": [],
  "createdAt": "2026-06-10T08:00:00Z"
}
```

**Ошибки:**
- `403 youth_not_assigned`
- `404 meeting_not_found`

---

### 15. PATCH /api/mobile/masullar/me/meetings/{meeting_id}

Обновить встречу (дата, место, повестка).

**Body** (все поля необязательны):
```json
{
  "scheduledAt": "2026-06-22T14:00:00Z",
  "type": "online",
  "location": "Zoom",
  "agenda": "Yangilangan mavzu"
}
```

| Поле | Тип | Описание |
|------|-----|----------|
| `scheduledAt` | `string (ISO 8601) \| null` | Новая дата и время |
| `type` | `string \| null` | Тип встречи |
| `location` | `string \| null` | Место |
| `agenda` | `string \| null` | Повестка |

**Response 200:** `MobileMeetingDetail`

---

### 16. PATCH /api/mobile/masullar/me/meetings/{meeting_id}/attendance

Отметить результат встречи (пришёл/не пришёл/перенесена).

**Body:**
```json
{
  "attendanceStatus": "attended",
  "attendanceNotes": "Yosh keldi, faol qatnashdi"
}
```

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `attendanceStatus` | `MeetingAttendance` | ✅ | `attended` / `no_show` / `rescheduled` |
| `attendanceNotes` | `string (макс 2000) \| null` | — | Комментарий |

**Response 200:** `MobileMeetingDetail`

**Ошибки:**
- `403 youth_not_assigned`
- `404 meeting_not_found`

---

## Коды ошибок

Все ошибки:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "youth_not_assigned",
    "message": "youth_not_assigned"
  }
}
```

| HTTP | `code` | Когда |
|------|--------|-------|
| `401` | `missing_token` | Нет JWT |
| `401` | `wrong_token_type` | Передан refresh вместо access токена |
| `403` | `role_not_allowed` | Роль не `masul_hodim` |
| `403` | `youth_not_assigned` | Молодой человек закреплён за другим масъулом |
| `404` | `masul_record_not_found` | В токене нет `masul_id` или запись удалена |
| `404` | `youth_not_found` | Молодой человек не найден |
| `404` | `plan_not_found` | План не найден |
| `404` | `meeting_not_found` | Встреча не найдена |
| `409` | `meeting_same_day_collision` | Уже есть встреча с этим молодым в тот же день |

---

## Типы данных

### YouthStatus
```
"active" | "graduated" | "removed"
```

### PlanStatus
```
"draft" | "in_progress" | "completed" | "cancelled"
```

### MeetingAttendance
```
"scheduled" | "attended" | "no_show" | "rescheduled"
```

### Pagination
```typescript
interface Page<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
```

---

## TypeScript интерфейсы

```typescript
// ── Профиль и статистика ──────────────────────────────────────────────────

interface MobileMasulProfile {
  id: string;
  fullName: string;
  districtId: string;
  organizationId: string | null;
  phone: string | null;
  email: string | null;
  position: string | null;
  youthCount: number;
  createdAt: string;
}

interface MobileMasulStats {
  totalYouth: number;
  active: number;
  graduated: number;
  removed: number;
  plansActive: number;
  meetingsUpcoming: number;
}

// ── Молодёжь ──────────────────────────────────────────────────────────────

interface MobileYouthCard {
  id: string;
  fullName: string;
  status: 'active' | 'graduated' | 'removed';
  category: string | null;
  contact: string | null;
  dateOfBirth: string | null; // YYYY-MM-DD
}

interface MobileYouthDetail {
  id: string;
  fullName: string;
  districtId: string;
  status: 'active' | 'graduated' | 'removed';
  category: string | null;
  contact: string | null;
  dateOfBirth: string | null;
  address: string | null;
  notes: string | null;
  removalProposal: Record<string, unknown> | null;
  masulId: string | null;
  organizationId: string | null;
  createdAt: string;
}

// ── Планы ─────────────────────────────────────────────────────────────────

interface Milestone {
  title: string;
  done: boolean;
  dueDate: string | null; // YYYY-MM-DD
  notes: string | null;
}

interface MobilePlanCard {
  id: string;
  youthId: string;
  youthName: string;
  title: string;
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  progress: number;
  endDate: string | null; // YYYY-MM-DD
}

interface MobilePlanDetail {
  id: string;
  youthId: string;
  youthName: string | null;
  masulId: string | null;
  title: string;
  goal: string | null;
  milestones: Milestone[];
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  progress: number;
  notes: string | null;
  attachments: Record<string, unknown>[];
  startDate: string | null; // YYYY-MM-DD
  endDate: string | null;
  createdAt: string;
}

// ── Встречи ───────────────────────────────────────────────────────────────

interface MobileMeetingCard {
  id: string;
  youthId: string;
  youthName: string;
  scheduledAt: string; // ISO 8601
  type: string | null;
  location: string | null;
  attendanceStatus: 'scheduled' | 'attended' | 'no_show' | 'rescheduled';
}

interface MobileMeetingDetail {
  id: string;
  youthId: string;
  youthName: string | null;
  masulId: string | null;
  scheduledAt: string;
  type: string | null;
  location: string | null;
  agenda: string | null;
  attendanceStatus: 'scheduled' | 'attended' | 'no_show' | 'rescheduled';
  attendanceNotes: string | null;
  attachments: Record<string, unknown>[];
  createdAt: string;
}

// ── Пагинация ─────────────────────────────────────────────────────────────

interface Page<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
```

---

## Сводная таблица всех эндпоинтов

| Метод | URL | Описание |
|-------|-----|----------|
| `GET` | `/api/mobile/masullar/me` | Профиль масъула |
| `GET` | `/api/mobile/masullar/me/stats` | Статистика дашборда |
| `GET` | `/api/mobile/masullar/me/youth` | Список молодёжи (карточки) |
| `GET` | `/api/mobile/masullar/me/youth/{id}` | Детальная карточка молодого |
| `PATCH` | `/api/mobile/masullar/me/youth/{id}` | Обновить контакт/заметки |
| `GET` | `/api/mobile/masullar/me/plans` | Список планов (карточки) |
| `POST` | `/api/mobile/masullar/me/plans` | Создать план |
| `GET` | `/api/mobile/masullar/me/plans/{id}` | Детальный план с этапами |
| `PATCH` | `/api/mobile/masullar/me/plans/{id}` | Обновить план |
| `PATCH` | `/api/mobile/masullar/me/plans/{id}/progress` | Быстрое обновление прогресса |
| `GET` | `/api/mobile/masullar/me/meetings/upcoming` | Предстоящие встречи (N дней) |
| `GET` | `/api/mobile/masullar/me/meetings` | Все встречи (пагинация) |
| `POST` | `/api/mobile/masullar/me/meetings` | Создать встречу |
| `GET` | `/api/mobile/masullar/me/meetings/{id}` | Детальная встреча |
| `PATCH` | `/api/mobile/masullar/me/meetings/{id}` | Обновить встречу |
| `PATCH` | `/api/mobile/masullar/me/meetings/{id}/attendance` | Отметить посещаемость |
