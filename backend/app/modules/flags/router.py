from uuid import UUID

from fastapi import APIRouter, Query, status

from app.core.constants import FlagStatus
from app.core.deps import CurrentUserDep, DbSession
from app.modules.flags.repository import FlagsRepository
from app.modules.flags.schemas import FlagCreate, FlagListParams, FlagRead, FlagUpdate
from app.modules.flags.service import FlagsService

router = APIRouter(prefix="/api/flags", tags=["flags"])


def _service(session: DbSession) -> FlagsService:
    return FlagsService(FlagsRepository(session))


@router.post("", response_model=FlagRead, status_code=status.HTTP_201_CREATED)
async def create_flag(
    body: FlagCreate,
    session: DbSession,
    user: CurrentUserDep,
) -> FlagRead:
    service = _service(session)
    result = await service.create_flag(body, user)
    await session.commit()
    return result


@router.get("")
async def list_flags(
    session: DbSession,
    user: CurrentUserDep,
    flag_status: FlagStatus | None = Query(None, alias="status"),
    entity_type: str | None = None,
    raised_by: UUID | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> dict:
    params = FlagListParams(
        status=flag_status,
        entity_type=entity_type,
        raised_by=raised_by,
        page=page,
        limit=limit,
    )
    return await _service(session).list_flags(params, user)


@router.get("/{flag_id}", response_model=FlagRead)
async def get_flag(
    flag_id: UUID,
    session: DbSession,
    user: CurrentUserDep,
) -> FlagRead:
    return await _service(session).get_flag(flag_id, user)


@router.patch("/{flag_id}", response_model=FlagRead)
async def update_flag(
    flag_id: UUID,
    body: FlagUpdate,
    session: DbSession,
    user: CurrentUserDep,
) -> FlagRead:
    service = _service(session)
    result = await service.update_flag(flag_id, body, user)
    await session.commit()
    return result
