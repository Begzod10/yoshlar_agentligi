from uuid import UUID

from fastapi import APIRouter, Query, status

from app.core.constants import CROSS_DISTRICT_ROLES, UserRole
from app.core.deps import CurrentUserDep, DbSession
from app.core.exceptions import ForbiddenError, NotFoundError
from app.modules.audit.service import record_audit
from app.modules.masullar.models import Masul
from app.modules.masullar.repository import MasullarRepository
from app.modules.masullar.schemas import MasulCreate, MasulRead, MasulUpdate

router = APIRouter(prefix="/api/masullar", tags=["masullar"])

ALLOWED_ROLES = frozenset({UserRole.ADMIN, UserRole.DIREKTOR, UserRole.TASHKILOT_DIREKTORI})


def _check_access(user: CurrentUserDep) -> None:
    if user.role not in ALLOWED_ROLES:
        raise ForbiddenError("role_not_allowed")


@router.get("")
async def list_masullar(
    session: DbSession,
    user: CurrentUserDep,
    district_id: str | None = None,
    organization_id: UUID | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> dict:
    _check_access(user)
    effective_district = district_id
    if user.role == UserRole.TASHKILOT_DIREKTORI:
        effective_district = user.district_id

    repo = MasullarRepository(session)
    offset = (page - 1) * limit
    rows, total = await repo.list(
        district_id=effective_district, organization_id=organization_id,
        search=search, offset=offset, limit=limit,
    )
    return {
        "data": [MasulRead.model_validate(m) for m in rows],
        "meta": {"total": total, "page": page, "limit": limit},
    }


@router.post("", response_model=MasulRead, status_code=status.HTTP_201_CREATED)
async def create_masul(
    body: MasulCreate, session: DbSession, user: CurrentUserDep,
) -> MasulRead:
    _check_access(user)
    district = body.district_id
    if user.role == UserRole.TASHKILOT_DIREKTORI:
        district = user.district_id or district

    masul = Masul(
        full_name=body.full_name,
        district_id=district,
        organization_id=body.organization_id,
        phone=body.phone,
        email=body.email,
    )
    repo = MasullarRepository(session)
    await repo.add(masul)
    await record_audit(session, user=user, action="masul.create", entity_type="masul", entity_id=masul.id)
    await session.commit()
    return MasulRead.model_validate(masul)


@router.get("/{masul_id}", response_model=MasulRead)
async def get_masul(
    masul_id: UUID, session: DbSession, user: CurrentUserDep,
) -> MasulRead:
    _check_access(user)
    masul = await MasullarRepository(session).get_by_id(masul_id)
    if masul is None:
        raise NotFoundError("masul_not_found")
    if user.role == UserRole.TASHKILOT_DIREKTORI and user.district_id != masul.district_id:
        raise ForbiddenError("district_mismatch")
    return MasulRead.model_validate(masul)


@router.patch("/{masul_id}", response_model=MasulRead)
async def update_masul(
    masul_id: UUID, body: MasulUpdate, session: DbSession, user: CurrentUserDep,
) -> MasulRead:
    _check_access(user)
    repo = MasullarRepository(session)
    masul = await repo.get_by_id(masul_id)
    if masul is None:
        raise NotFoundError("masul_not_found")
    if user.role == UserRole.TASHKILOT_DIREKTORI and user.district_id != masul.district_id:
        raise ForbiddenError("district_mismatch")

    updates = body.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(masul, k, v)

    await record_audit(session, user=user, action="masul.update", entity_type="masul", entity_id=masul.id, after=updates)
    await session.commit()
    return MasulRead.model_validate(masul)


@router.delete("/{masul_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_masul(
    masul_id: UUID, session: DbSession, user: CurrentUserDep,
) -> None:
    _check_access(user)
    repo = MasullarRepository(session)
    masul = await repo.get_by_id(masul_id)
    if masul is None:
        raise NotFoundError("masul_not_found")
    if user.role == UserRole.TASHKILOT_DIREKTORI and user.district_id != masul.district_id:
        raise ForbiddenError("district_mismatch")

    await record_audit(session, user=user, action="masul.delete", entity_type="masul", entity_id=masul.id)
    await repo.delete(masul)
    await session.commit()
