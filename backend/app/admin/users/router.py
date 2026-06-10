"""Admin user management — admin.md §3.1.

All endpoints require role=admin. Mutations should be audit-logged.
"""

from uuid import UUID

from fastapi import APIRouter, Query, status

from app.core.audit_context import AuditDep
from app.core.base_schema import CamelModel, schema_example
from app.core.constants import UserRole
from app.core.deps import DbSession
from app.middleware.rbac import RequireAdmin
from app.modules.users.repository import UsersRepository
from app.modules.users.schemas import UserCreate, UserRead, UserUpdate
from app.modules.users.service import UsersService
from app.utils.pagination import Page, PageParams

router = APIRouter(prefix="/users", tags=["admin/users"])


def _service(session: DbSession) -> UsersService:
    return UsersService(UsersRepository(session))


class ResetPasswordResponse(CamelModel):
    model_config = schema_example({"password": "k3J2pX9mNvQrL4w"})
    password: str


@router.get("", response_model=Page[UserRead])
async def list_users(
    _: RequireAdmin,
    session: DbSession,
    role: UserRole | None = Query(default=None),
    district_id: str | None = Query(default=None),
    search: str | None = Query(default=None, min_length=1, max_length=255),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=200),
) -> Page[UserRead]:
    params = PageParams(page=page, limit=limit)
    items, total = await UsersRepository(session).list(
        role=role, district_id=district_id, search=search, params=params
    )
    return Page.build(
        items=[UserRead.model_validate(u) for u in items], total=total, params=params
    )


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate, _: RequireAdmin, session: DbSession, audit: AuditDep
) -> UserRead:
    user = await _service(session).create(payload)
    after = UserRead.model_validate(user).model_dump(mode="json")
    await audit.record("user.create", "user", user.id, after=after)
    await session.commit()
    return UserRead.model_validate(user)


@router.get("/{user_id}", response_model=UserRead)
async def get_user(user_id: UUID, _: RequireAdmin, session: DbSession) -> UserRead:
    user = await _service(session).get(user_id)
    return UserRead.model_validate(user)


@router.patch("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: UUID,
    payload: UserUpdate,
    _: RequireAdmin,
    session: DbSession,
    audit: AuditDep,
) -> UserRead:
    user = await _service(session).update(user_id, payload)
    after = UserRead.model_validate(user).model_dump(mode="json")
    await audit.record(
        "user.update", "user", user.id,
        before=payload.model_dump(exclude_unset=True, mode="json"),
        after=after,
    )
    await session.commit()
    return UserRead.model_validate(user)


@router.post("/{user_id}/reset-password", response_model=ResetPasswordResponse)
async def reset_password(
    user_id: UUID, _: RequireAdmin, session: DbSession, audit: AuditDep
) -> ResetPasswordResponse:
    new_password = await _service(session).reset_password(user_id)
    await audit.record("user.reset_password", "user", user_id)
    await session.commit()
    return ResetPasswordResponse(password=new_password)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: UUID, _: RequireAdmin, session: DbSession, audit: AuditDep
) -> None:
    await _service(session).soft_delete(user_id)
    await audit.record("user.delete", "user", user_id)
    await session.commit()
