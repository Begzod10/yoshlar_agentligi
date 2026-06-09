from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError, UnauthorizedError
from app.core.security import hash_password, verify_password
from app.modules.profile.models import UserPreferences, UserSession
from app.modules.profile.schemas import (
    NotificationSettings,
    ProfileUpdate,
    UserPreferencesUpdate,
)
from app.modules.users.models import User
from app.modules.users.repository import UsersRepository


class ProfileService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._users = UsersRepository(session)

    async def get_user(self, user_id: UUID) -> User:
        user = await self._users.get_by_id(user_id)
        if user is None:
            raise NotFoundError("user_not_found")
        return user

    async def update_profile(self, user_id: UUID, payload: ProfileUpdate) -> User:
        user = await self.get_user(user_id)

        if payload.email is not None:
            email = str(payload.email).lower()
            if email != user.email:
                existing = await self._users.get_by_email(email, include_deleted=True)
                if existing is not None:
                    raise ConflictError("email_already_exists")
                user.email = email

        if payload.full_name is not None:
            user.full_name = payload.full_name
        if payload.phone is not None:
            user.phone = payload.phone
        if payload.avatar_url is not None:
            user.avatar_url = payload.avatar_url

        await self._session.flush()
        return user

    async def change_password(
        self, user_id: UUID, current_password: str, new_password: str
    ) -> None:
        user = await self.get_user(user_id)
        if not verify_password(current_password, user.password_hash):
            raise UnauthorizedError("wrong_current_password")
        user.password_hash = hash_password(new_password)
        await self._session.flush()

    async def _get_or_create_prefs(self, user_id: UUID) -> UserPreferences:
        prefs = (
            await self._session.execute(
                select(UserPreferences).where(UserPreferences.user_id == user_id)
            )
        ).scalar_one_or_none()
        if prefs is None:
            prefs = UserPreferences(user_id=user_id)
            self._session.add(prefs)
            await self._session.flush()
        return prefs

    async def get_preferences(self, user_id: UUID) -> UserPreferences:
        return await self._get_or_create_prefs(user_id)

    async def update_preferences(
        self, user_id: UUID, payload: UserPreferencesUpdate
    ) -> UserPreferences:
        prefs = await self._get_or_create_prefs(user_id)
        if payload.theme is not None:
            prefs.theme = payload.theme
        if payload.language is not None:
            prefs.language = payload.language
        prefs.updated_at = datetime.now(tz=UTC)
        await self._session.flush()
        return prefs

    async def get_notifications(self, user_id: UUID) -> NotificationSettings:
        prefs = await self._get_or_create_prefs(user_id)
        data: dict[str, Any] = prefs.notifications or {}
        return NotificationSettings(
            email_enabled=data.get("email_enabled", True),
            sms_enabled=data.get("sms_enabled", False),
            push_enabled=data.get("push_enabled", True),
            youth_updates=data.get("youth_updates", True),
            plan_reminders=data.get("plan_reminders", True),
            meeting_reminders=data.get("meeting_reminders", True),
            daily_report=data.get("daily_report", True),
            weekly_report=data.get("weekly_report", False),
        )

    async def update_notifications(
        self, user_id: UUID, settings: NotificationSettings
    ) -> NotificationSettings:
        prefs = await self._get_or_create_prefs(user_id)
        prefs.notifications = settings.model_dump()
        prefs.updated_at = datetime.now(tz=UTC)
        await self._session.flush()
        return settings

    async def list_sessions(
        self, user_id: UUID, current_session_id: UUID | None
    ) -> list[dict]:
        now = datetime.now(tz=UTC)
        sessions = (
            await self._session.execute(
                select(UserSession)
                .where(
                    UserSession.user_id == user_id,
                    UserSession.revoked_at.is_(None),
                    UserSession.expires_at > now,
                )
                .order_by(UserSession.last_active_at.desc())
            )
        ).scalars().all()

        return [
            {
                "id": s.id,
                "ip": s.ip,
                "user_agent": s.user_agent,
                "created_at": s.created_at,
                "last_active_at": s.last_active_at,
                "expires_at": s.expires_at,
                "is_current": s.id == current_session_id,
            }
            for s in sessions
        ]

    async def revoke_session(self, user_id: UUID, session_id: UUID) -> None:
        sess = (
            await self._session.execute(
                select(UserSession).where(
                    UserSession.id == session_id,
                    UserSession.user_id == user_id,
                )
            )
        ).scalar_one_or_none()
        if sess is None:
            raise NotFoundError("session_not_found")
        sess.revoked_at = datetime.now(tz=UTC)
        await self._session.flush()

    async def revoke_all_other_sessions(
        self, user_id: UUID, current_session_id: UUID | None
    ) -> int:
        now = datetime.now(tz=UTC)
        sessions = (
            await self._session.execute(
                select(UserSession).where(
                    UserSession.user_id == user_id,
                    UserSession.revoked_at.is_(None),
                )
            )
        ).scalars().all()
        count = 0
        for s in sessions:
            if s.id != current_session_id:
                s.revoked_at = now
                count += 1
        await self._session.flush()
        return count
