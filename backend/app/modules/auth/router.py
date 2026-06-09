from fastapi import APIRouter, Request, status

from app.core.deps import CurrentUser, CurrentUserDep, DbSession
from app.core.exceptions import NotFoundError
from app.modules.audit.service import AuditService
from app.modules.auth.schemas import LoginRequest, RefreshRequest, TokenResponse
from app.modules.auth.service import AuthService
from app.modules.users.models import User
from app.modules.users.repository import UsersRepository
from app.modules.users.schemas import UserRead

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _service(session: DbSession) -> AuthService:
    return AuthService(UsersRepository(session), session)


async def _record_auth_event(
    session: DbSession, request: Request, user: User, action: str
) -> None:
    await AuditService(session).record(
        CurrentUser(id=user.id, role=user.role, district_id=user.district_id),
        action=action,
        entity_type="user",
        entity_id=user.id,
        request_id=request.headers.get("X-Request-ID"),
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    creds: LoginRequest, request: Request, session: DbSession
) -> TokenResponse:
    svc = _service(session)
    user = await svc.authenticate(creds)
    svc.touch_last_login(user)
    sid = await svc.create_session(
        user,
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
    )
    await _record_auth_event(session, request, user, "auth.login")
    await session.commit()
    return svc.build_token_response(user, sid=sid)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    body: RefreshRequest, request: Request, session: DbSession
) -> TokenResponse:
    svc = _service(session)
    user, sid = await svc.authenticate_refresh(body.refresh_token)
    await _record_auth_event(session, request, user, "auth.refresh")
    await session.commit()
    return svc.build_token_response(user, sid=sid)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    current: CurrentUserDep, request: Request, session: DbSession
) -> None:
    user = await UsersRepository(session).get_by_id(current.id)
    if user is not None:
        await _record_auth_event(session, request, user, "auth.logout")
        if current.session_id is not None:
            from sqlalchemy import select
            from app.modules.profile.models import UserSession
            from datetime import UTC, datetime
            sess = (
                await session.execute(
                    select(UserSession).where(UserSession.id == current.session_id)
                )
            ).scalar_one_or_none()
            if sess is not None:
                sess.revoked_at = datetime.now(tz=UTC)
        await session.commit()
    return None


@router.get("/me", response_model=UserRead)
async def me(current: CurrentUserDep, session: DbSession) -> UserRead:
    user = await UsersRepository(session).get_by_id(current.id)
    if user is None:
        raise NotFoundError("user_not_found")
    return UserRead.model_validate(user)
