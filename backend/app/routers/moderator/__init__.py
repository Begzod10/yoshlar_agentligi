"""Moderator role — flags, stats, audit, reports, monitoring.

Endpoints in this package are primarily owned by the moderator role.
RBAC is enforced per-endpoint (admin/direktor may also access).

Team ownership: @moderator-team
"""
from fastapi import APIRouter

from app.modules.audit.router import router as audit_router
from app.modules.flags.router import router as flags_router
from app.modules.monitoring.router import router as monitoring_router
from app.modules.reports.router import router as reports_router
from app.modules.stats.router import router as stats_router

router = APIRouter()
router.include_router(flags_router)
router.include_router(stats_router)
router.include_router(audit_router)
router.include_router(reports_router)
router.include_router(monitoring_router)
