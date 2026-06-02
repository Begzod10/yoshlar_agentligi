from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.core.audit_context import AuditDep
from app.core.constants import UserRole
from app.core.deps import CurrentUser, DbSession
from app.middleware.rbac import require_role
from app.modules.flags.repository import FlagsRepository
from app.modules.flags.schemas import FlagCreate, FlagRead, FlagUpdate
from app.modules.flags.service import FlagsService
from app.utils.pagination import Page, PageParams

router = APIRouter(prefix="/api/flags", tags=["flags"])

_ROLES = (UserRole.ADMIN, UserRole.DIREKTOR, UserRole.MODERATOR)
Access = Annotated[CurrentUser, Depends(require_role(*_ROLES))]


def _service(session: DbSession) -> FlagsService:
    return FlagsService(FlagsRepository(session))


@router.get("", response_model=Page[FlagRead])
async def list_flags(
    _: Access,
    session: DbSession,
    status: str | None = Query(default=None),
    entity_type: str | None = Query(default=None),
    raised_by: UUID | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=200),
) -> Page[FlagRead]:
    params = PageParams(page=page, limit=limit)
    items, total = await FlagsRepository(session).list(
        status=status,
        entity_type=entity_type,
        raised_by=raised_by,
        params=params,
    )
    return Page.build(
        items=[FlagRead.model_validate(f) for f in items], total=total, params=params
    )


@router.post("", response_model=FlagRead, status_code=status.HTTP_201_CREATED)
async def create_flag(
    payload: FlagCreate, current: Access, session: DbSession, audit: AuditDep
) -> FlagRead:
    flag = await _service(session).create(current, payload)
    await audit.record(
        "flag.create", "flag", flag.id,
        after=FlagRead.model_validate(flag).model_dump(mode="json"),
    )
    await session.commit()
    return FlagRead.model_validate(flag)


@router.patch("/{flag_id}", response_model=FlagRead)
async def update_flag(
    flag_id: UUID,
    payload: FlagUpdate,
    current: Access,
    session: DbSession,
    audit: AuditDep,
) -> FlagRead:
    flag = await _service(session).update(current, flag_id, payload)
    await audit.record(
        "flag.update", "flag", flag_id,
        after=payload.model_dump(mode="json"),
    )
    await session.commit()
    return FlagRead.model_validate(flag)
