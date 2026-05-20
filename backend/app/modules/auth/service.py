from datetime import UTC, datetime
from uuid import UUID

from app.core.exceptions import UnauthorizedError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from app.modules.auth.schemas import LoginRequest, TokenResponse
from app.modules.users.models import User
from app.modules.users.repository import UsersRepository
from app.modules.users.schemas import UserRead


class AuthService:
    def __init__(self, users: UsersRepository) -> None:
        self._users = users

    async def authenticate(self, creds: LoginRequest) -> User:
        user = await self._users.get_by_email(str(creds.email).lower())
        if user is None or not user.is_active:
            raise UnauthorizedError("invalid_credentials")
        if not verify_password(creds.password, user.password_hash):
            raise UnauthorizedError("invalid_credentials")
        return user

    async def authenticate_refresh(self, refresh_token: str) -> User:
        payload = decode_token(refresh_token)
        if payload.type != "refresh":
            raise UnauthorizedError("wrong_token_type")
        user = await self._users.get_by_id(UUID(payload.sub))
        if user is None or not user.is_active:
            raise UnauthorizedError("user_not_found")
        return user

    @staticmethod
    def build_token_response(user: User) -> TokenResponse:
        return TokenResponse(
            access_token=create_access_token(
                sub=user.id, role=user.role, district_id=user.district_id
            ),
            refresh_token=create_refresh_token(
                sub=user.id, role=user.role, district_id=user.district_id
            ),
            user=UserRead.model_validate(user),
        )

    @staticmethod
    def touch_last_login(user: User) -> None:
        user.last_login_at = datetime.now(tz=UTC)
