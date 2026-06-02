from fastapi import APIRouter

from app.core.constants import TOSHKENT_VILOYATI_DISTRICTS
from app.core.deps import CurrentUserDep
from app.modules.districts.schemas import DistrictRead

router = APIRouter(prefix="/api/districts", tags=["districts"])


@router.get("", response_model=list[DistrictRead])
async def list_districts(_: CurrentUserDep) -> list[DistrictRead]:
    return [DistrictRead(id=name, name=name) for name in TOSHKENT_VILOYATI_DISTRICTS]
