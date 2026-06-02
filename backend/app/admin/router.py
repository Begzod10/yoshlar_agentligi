"""Admin router — aggregates every admin-only endpoint under /api/admin.

Each subfolder maps to a category from docs/roles/admin.md:

- users/       §3.1 user management (CRUD, reset password)
- audit/       §3.3 audit log read
- system/      §2.3 system info, counts, maintenance toggle
- youth/       §3.4 cross-district overrides (force-assign, force-status, restore)
- reports/     §2.3 PII-enabled exports (no reveal-window gate)
- backups/     §2.3 backup management (UI stub for v1)
"""

from fastapi import APIRouter

from app.admin.audit.router import router as audit_router
from app.admin.backups.router import router as backups_router
from app.admin.reports.router import router as reports_router
from app.admin.system.router import router as system_router
from app.admin.users.router import router as users_router
from app.admin.youth.router import router as youth_router

router = APIRouter(prefix="/api/admin")
router.include_router(users_router)
router.include_router(audit_router)
router.include_router(system_router)
router.include_router(youth_router)
router.include_router(reports_router)
router.include_router(backups_router)
