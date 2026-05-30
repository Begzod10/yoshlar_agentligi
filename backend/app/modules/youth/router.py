from uuid import UUID

from fastapi import APIRouter, Query, status

from app.core.constants import YouthStatus
from app.core.deps import CurrentUserDep, DbSession
from app.modules.youth.repository import YouthRepository
from app.modules.youth.schemas import (
    ApproveRemovalRequest,
    AssignMasulRequest,
    ProposeRemovalRequest,
    RejectRemovalRequest,
    StatusChangeRequest,
    YouthCreate,
    YouthRead,
    YouthUpdate,
    YouthUpdateByMasul,
)
from app.modules.youth.service import YouthService
from app.core.constants import UserRole

router = APIRouter(prefix="/api/youth", tags=["youth"])


def _service(session: DbSession) -> YouthService:
    return YouthService(session, YouthRepository(session))


@router.get("")
async def list_youth(
    session: DbSession,
    user: CurrentUserDep,
    district_id: str | None = None,
    youth_status: YouthStatus | None = Query(None, alias="status"),
    search: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> dict:
    return await _service(session).list(
        user, district_id=district_id, status=youth_status,
        search=search, page=page, limit=limit,
    )


@router.post("", response_model=YouthRead, status_code=status.HTTP_201_CREATED)
async def create_youth(
    body: YouthCreate, session: DbSession, user: CurrentUserDep,
) -> YouthRead:
    service = _service(session)
    result = await service.create(body, user)
    await session.commit()
    return result


@router.get("/removals")
async def list_pending_removals(
    session: DbSession,
    user: CurrentUserDep,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> dict:
    return await _service(session).list_pending_removals(user, page=page, limit=limit)


@router.get("/{youth_id}", response_model=YouthRead)
async def get_youth(
    youth_id: UUID, session: DbSession, user: CurrentUserDep,
) -> YouthRead:
    return await _service(session).get(youth_id, user)


@router.patch("/{youth_id}", response_model=YouthRead)
async def update_youth(
    youth_id: UUID, body: YouthUpdate, session: DbSession, user: CurrentUserDep,
) -> YouthRead:
    service = _service(session)
    if user.role == UserRole.MASUL_HODIM:
        masul_data = YouthUpdateByMasul(**body.model_dump(include={"contact", "notes"}, exclude_unset=True))
        result = await service.update(youth_id, masul_data, user)
    else:
        result = await service.update(youth_id, body, user)
    await session.commit()
    return result


@router.delete("/{youth_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_youth(
    youth_id: UUID, session: DbSession, user: CurrentUserDep,
) -> None:
    await _service(session).delete(youth_id, user)
    await session.commit()


@router.post("/{youth_id}/assign-masul", response_model=YouthRead)
async def assign_masul(
    youth_id: UUID, body: AssignMasulRequest, session: DbSession, user: CurrentUserDep,
) -> YouthRead:
    result = await _service(session).assign_masul(youth_id, body, user)
    await session.commit()
    return result


@router.post("/{youth_id}/status", response_model=YouthRead)
async def change_status(
    youth_id: UUID, body: StatusChangeRequest, session: DbSession, user: CurrentUserDep,
) -> YouthRead:
    result = await _service(session).change_status(youth_id, body.status, user, body.reason)
    await session.commit()
    return result


@router.post("/{youth_id}/propose-removal", response_model=YouthRead)
async def propose_removal(
    youth_id: UUID, body: ProposeRemovalRequest, session: DbSession, user: CurrentUserDep,
) -> YouthRead:
    result = await _service(session).propose_removal(youth_id, body, user)
    await session.commit()
    return result


@router.post("/{youth_id}/approve-removal", response_model=YouthRead)
async def approve_removal(
    youth_id: UUID, session: DbSession, user: CurrentUserDep,
) -> YouthRead:
    result = await _service(session).approve_removal(youth_id, user)
    await session.commit()
    return result


@router.post("/{youth_id}/reject-removal", response_model=YouthRead)
async def reject_removal(
    youth_id: UUID, body: RejectRemovalRequest, session: DbSession, user: CurrentUserDep,
) -> YouthRead:
    result = await _service(session).reject_removal(youth_id, body, user)
    await session.commit()
    return result
