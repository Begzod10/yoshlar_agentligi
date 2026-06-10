"""Common endpoints — auth, districts, profile (all roles).

These endpoints are shared across all roles and not owned by
a specific team.
"""
from fastapi import APIRouter

from app.modules.auth.router import router as auth_router
from app.modules.districts.router import router as districts_router
from app.modules.profile.router import router as profile_router

router = APIRouter()
router.include_router(auth_router)
router.include_router(districts_router)
router.include_router(profile_router)
