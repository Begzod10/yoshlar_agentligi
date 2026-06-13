"""Mobile API — lightweight endpoints for masul_hodim mobile app."""
from fastapi import APIRouter

from app.modules.mobile.masullar.router import router as mobile_masullar_router

router = APIRouter()
router.include_router(mobile_masullar_router)
