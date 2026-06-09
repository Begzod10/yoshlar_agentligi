from uuid import UUID

from fastapi import APIRouter, status

from app.core.audit_context import AuditDep
from app.core.deps import CurrentUserDep, DbSession
from app.modules.profile.schemas import (
    ChangePasswordRequest,
    NotificationSettings,
    ProfileRead,
    ProfileUpdate,
    SessionRead,
    UserPreferencesRead,
    UserPreferencesUpdate,
)
from app.modules.profile.service import ProfileService

router = APIRouter(prefix="/api/profile", tags=["profile"])


def _svc(session: DbSession) -> ProfileService:
    return ProfileService(session)


@router.get("", response_model=ProfileRead)
async def get_profile(current: CurrentUserDep, session: DbSession) -> ProfileRead:
    user = await _svc(session).get_user(current.id)
    return ProfileRead.model_validate(user)


@router.patch("", response_model=ProfileRead)
async def update_profile(
    payload: ProfileUpdate,
    current: CurrentUserDep,
    session: DbSession,
    audit: AuditDep,
) -> ProfileRead:
    user = await _svc(session).update_profile(current.id, payload)
    await audit.record("profile.update", "user", current.id, after=payload.model_dump(exclude_none=True))
    await session.commit()
    return ProfileRead.model_validate(user)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    payload: ChangePasswordRequest,
    current: CurrentUserDep,
    session: DbSession,
    audit: AuditDep,
) -> None:
    await _svc(session).change_password(
        current.id, payload.current_password, payload.new_password
    )
    await audit.record("profile.change_password", "user", current.id)
    await session.commit()


@router.get("/preferences", response_model=UserPreferencesRead)
async def get_preferences(current: CurrentUserDep, session: DbSession) -> UserPreferencesRead:
    prefs = await _svc(session).get_preferences(current.id)
    notif = await _svc(session).get_notifications(current.id)
    return UserPreferencesRead(
        theme=prefs.theme,
        language=prefs.language,
        notifications=notif,
    )


@router.put("/preferences", response_model=UserPreferencesRead)
async def update_preferences(
    payload: UserPreferencesUpdate,
    current: CurrentUserDep,
    session: DbSession,
    audit: AuditDep,
) -> UserPreferencesRead:
    prefs = await _svc(session).update_preferences(current.id, payload)
    await audit.record("profile.update_preferences", "user", current.id, after=payload.model_dump(exclude_none=True))
    await session.commit()
    notif = await _svc(session).get_notifications(current.id)
    return UserPreferencesRead(
        theme=prefs.theme,
        language=prefs.language,
        notifications=notif,
    )


@router.get("/notifications", response_model=NotificationSettings)
async def get_notifications(current: CurrentUserDep, session: DbSession) -> NotificationSettings:
    return await _svc(session).get_notifications(current.id)


@router.put("/notifications", response_model=NotificationSettings)
async def update_notifications(
    payload: NotificationSettings,
    current: CurrentUserDep,
    session: DbSession,
    audit: AuditDep,
) -> NotificationSettings:
    result = await _svc(session).update_notifications(current.id, payload)
    await audit.record("profile.update_notifications", "user", current.id)
    await session.commit()
    return result


@router.get("/sessions", response_model=list[SessionRead])
async def list_sessions(current: CurrentUserDep, session: DbSession) -> list[SessionRead]:
    rows = await _svc(session).list_sessions(current.id, current.session_id)
    return [SessionRead(**r) for r in rows]


@router.delete("/sessions", status_code=status.HTTP_200_OK)
async def revoke_all_other_sessions(
    current: CurrentUserDep,
    session: DbSession,
    audit: AuditDep,
) -> dict:
    count = await _svc(session).revoke_all_other_sessions(current.id, current.session_id)
    await audit.record("profile.revoke_all_sessions", "user", current.id)
    await session.commit()
    return {"revoked": count}


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_session(
    session_id: UUID,
    current: CurrentUserDep,
    session: DbSession,
    audit: AuditDep,
) -> None:
    await _svc(session).revoke_session(current.id, session_id)
    await audit.record("profile.revoke_session", "user", current.id, after={"session_id": str(session_id)})
    await session.commit()
