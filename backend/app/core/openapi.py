"""OpenAPI / Swagger UI configuration.

Centralises tag metadata and Swagger UI parameters so docs stay
searchable and consistent.
"""

from typing import Any

DESCRIPTION = """
Yoshlar Agentligi monitoring CRM — backend API.

Use the **🔍 filter** above the operation list to search by path or operation
ID. Bearer-token auth is required for everything except `/api/auth/login` and
`/healthz`; click **Authorize** once and the token persists across reloads.

### Demo accounts

| Email | Password | Role |
|-------|----------|------|
| `admin@yoshlar.uz` | `admin123` | admin |
| `direktor@yoshlar.uz` | `direktor123` | direktor |
| `bekobod@yoshlar.uz` | `tashkilot123` | tashkilot_direktori |
| `masul1@yoshlar.uz` | `masul123` | masul_hodim |
| `moderator@yoshlar.uz` | `moderator123` | moderator |
""".strip()


TAGS_METADATA: list[dict[str, Any]] = [
    {"name": "meta", "description": "Liveness probe."},
    {"name": "auth", "description": "Login, refresh, logout, current user."},
    {"name": "districts", "description": "14 districts of Toshkent viloyati (read-only)."},
    {
        "name": "organizations",
        "description": "Schools, mahalla offices, partner orgs. Write: admin/direktor.",
    },
    {
        "name": "masullar",
        "description": "Responsible officers (caseworkers). Tashkilot_direktori scoped to own district.",
    },
    {
        "name": "youth",
        "description": "At-risk youth records. Heavily scoped by role (district / masul / cross).",
    },
    {"name": "plans", "description": "Individual development plans tied to youth."},
    {"name": "meetings", "description": "Scheduled and attended meetings."},
    {
        "name": "removals",
        "description": "Approval workflow: tashkilot_direktori proposes → admin/direktor approves or rejects.",
    },
    {
        "name": "flags",
        "description": "Quality / safeguarding flags. Moderator + admin/direktor.",
    },
    {"name": "stats", "description": "Aggregated counts and trends. Read-mostly."},
    {"name": "reports", "description": "Streaming CSV exports."},
    # admin/* tags
    {"name": "admin/users", "description": "Admin: user CRUD, password reset."},
    {"name": "admin/audit", "description": "Admin: read every mutating action."},
    {
        "name": "admin/system",
        "description": "Admin: environment info, table counts, maintenance toggle.",
    },
    {
        "name": "admin/youth",
        "description": "Admin: cross-district overrides (force-assign-masul, force-status, restore).",
    },
    {"name": "admin/reports", "description": "Admin: PII-enabled exports."},
    {"name": "admin/backups", "description": "Admin: backup management (UI stub for v1)."},
]


SWAGGER_UI_PARAMETERS: dict[str, Any] = {
    "filter": True,
    "tryItOutEnabled": True,
    "persistAuthorization": True,
    "displayRequestDuration": True,
    "defaultModelsExpandDepth": 0,
    "docExpansion": "none",
    "syntaxHighlight.theme": "obsidian",
    "tagsSorter": "alpha",
    "operationsSorter": "alpha",
}
