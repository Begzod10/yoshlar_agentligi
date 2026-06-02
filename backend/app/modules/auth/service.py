from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import UnauthorizedError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from app.modules.auth.schemas import LoginRequest, TokenResponse
from app.modules.profile.models import UserSession
from app.modules.users.models import User
from app.modules.users.repository import UsersRepository
from app.modules.users.schemas import UserRead


class AuthService:
    def __init__(self, users: UsersRepository, session: AsyncSession | None = None) -> None:
        self._users = users
        self._session = session

    async def authenticate(self, creds: LoginRequest) -> User:
        user = await self._users.get_by_email(str(creds.email).lower())
        if user is None or not user.is_active:
            raise UnauthorizedError("invalid_credentials")
        if not verify_password(creds.password, user.password_hash):
            raise UnauthorizedError("invalid_credentials")
        return user

    async def authenticate_refresh(self, refresh_token: str) -> tuple[User, UUID | None]:
        payload = decode_token(refresh_token)
        if payload.type != "refresh":
            raise UnauthorizedError("wrong_token_type")
        user = await self._users.get_by_id(UUID(payload.sub))
        if user is None or not user.is_active:
            raise UnauthorizedError("user_not_found")
        sid = UUID(payload.sid) if payload.sid else None
        if sid is not None and self._session is not None:
            from sqlalchemy import select
            row = (
                await self._session.execute(
                    select(UserSession).where(
                        UserSession.id == sid,
                        UserSession.revoked_at.is_(None),
                    )
                )
            ).scalar_one_or_none()
            if row is None:
                raise UnauthorizedError("session_revoked")
            row.last_active_at = datetime.now(tz=UTC)
        return user, sid

    async def create_session(
        self,
        user: User,
        *,
        ip: str | None = None,
        user_agent: str | None = None,
    ) -> UUID:
        if self._session is None:
            raise RuntimeError("session required")
        settings = get_settings()
        session_rec = UserSession(
            user_id=user.id,
            ip=ip,
            user_agent=user_agent,
            expires_at=datetime.now(tz=UTC) + timedelta(days=settings.jwt_refresh_ttl_days),
        )
        self._session.add(session_rec)
        await self._session.flush()
        return session_rec.id

    def build_token_response(self, user: User, sid: UUID | None = None) -> TokenResponse:
        return TokenResponse(
            access_token=create_access_token(
                sub=user.id, role=user.role, district_id=user.district_id, sid=sid
            ),
            refresh_token=create_refresh_token(
                sub=user.id, role=user.role, district_id=user.district_id, sid=sid
            ),
            user=UserRead.model_validate(user),
        )

    @staticmethod
    def touch_last_login(user: User) -> None:
        user.last_login_at = datetime.now(tz=UTC)
