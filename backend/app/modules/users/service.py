import secrets
from datetime import UTC, datetime
from uuid import UUID

from app.core.exceptions import ConflictError, NotFoundError
from app.core.security import hash_password
from app.modules.users.models import User
from app.modules.users.repository import UsersRepository
from app.modules.users.schemas import UserCreate, UserUpdate


class UsersService:
    def __init__(self, users: UsersRepository) -> None:
        self._users = users

    async def create(self, payload: UserCreate) -> User:
        email = str(payload.email).lower()
        existing = await self._users.get_by_email(email, include_deleted=True)
        if existing is not None:
            raise ConflictError("email_already_exists")
        user = User(
            email=email,
            password_hash=hash_password(payload.password),
            full_name=payload.full_name,
            role=payload.role,
            district_id=payload.district_id,
            phone=payload.phone,
        )
        return await self._users.add(user)

    async def get(self, user_id: UUID) -> User:
        user = await self._users.get_by_id(user_id)
        if user is None:
            raise NotFoundError("user_not_found")
        return user

    async def update(self, user_id: UUID, payload: UserUpdate) -> User:
        user = await self.get(user_id)
        data = payload.model_dump(exclude_unset=True, by_alias=False)
        for key, value in data.items():
            setattr(user, key, value)
        return user

    async def reset_password(self, user_id: UUID) -> str:
        user = await self.get(user_id)
        new_password = secrets.token_urlsafe(12)
        user.password_hash = hash_password(new_password)
        return new_password

    async def soft_delete(self, user_id: UUID) -> None:
        user = await self.get(user_id)
        user.deleted_at = datetime.now(tz=UTC)
        user.is_active = False
