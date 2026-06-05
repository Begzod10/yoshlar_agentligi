"""Direktor role — youth CRUD, masullar, plans, meetings, removals, organizations write.

Endpoints in this package are primarily owned by the direktor role.
RBAC is enforced per-endpoint (admin/tashkilot/masul may also access).

Team ownership: @direktor-team
"""
from fastapi import APIRouter

from app.modules.masullar.router import router as masullar_router
from app.modules.meetings.router import router as meetings_router
from app.modules.organizations.router import router as organizations_router
from app.modules.plans.router import router as plans_router
from app.modules.removals.router import router as removals_router
from app.modules.youth.router import router as youth_router

router = APIRouter()
router.include_router(youth_router)
router.include_router(masullar_router)
router.include_router(plans_router)
router.include_router(meetings_router)
router.include_router(removals_router)
router.include_router(organizations_router)
