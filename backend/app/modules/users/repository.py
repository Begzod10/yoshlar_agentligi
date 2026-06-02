from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import UserRole
from app.modules.users.models import User
from app.utils.pagination import PageParams


class UsersRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_email(self, email: str, *, include_deleted: bool = False) -> User | None:
        stmt = select(User).where(User.email == email)
        if not include_deleted:
            stmt = stmt.where(User.deleted_at.is_(None))
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: UUID) -> User | None:
        stmt = select(User).where(User.id == user_id, User.deleted_at.is_(None))
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def add(self, user: User) -> User:
        self._session.add(user)
        await self._session.flush()
        return user

    async def list(
        self,
        *,
        role: UserRole | None = None,
        district_id: str | None = None,
        search: str | None = None,
        params: PageParams,
    ) -> tuple[list[User], int]:
        base = select(User).where(User.deleted_at.is_(None))
        if role is not None:
            base = base.where(User.role == role)
        if district_id is not None:
            base = base.where(User.district_id == district_id)
        if search:
            pattern = f"%{search.lower()}%"
            base = base.where(
                or_(
                    func.lower(User.email).like(pattern),
                    func.lower(User.full_name).like(pattern),
                )
            )

        total_stmt = select(func.count()).select_from(base.subquery())
        total = (await self._session.execute(total_stmt)).scalar_one()

        items_stmt = (
            base.order_by(User.created_at.desc())
            .offset(params.offset)
            .limit(params.limit)
        )
        items = (await self._session.execute(items_stmt)).scalars().all()
        return list(items), int(total)
