from fastapi import APIRouter

from app.core.constants import TOSHKENT_VILOYATI_DISTRICTS

router = APIRouter(prefix="/api/districts", tags=["districts"])


@router.get("")
async def list_districts() -> dict[str, list[str]]:
    return {"data": list(TOSHKENT_VILOYATI_DISTRICTS)}
