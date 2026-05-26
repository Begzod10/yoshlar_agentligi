from fastapi import APIRouter, status

from app.core.deps import CurrentUserDep, DbSession
from app.core.exceptions import NotFoundError
from app.modules.auth.schemas import LoginRequest, RefreshRequest, TokenResponse
from app.modules.auth.service import AuthService
from app.modules.users.repository import UsersRepository
from app.modules.users.schemas import UserRead

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _service(session: DbSession) -> AuthService:
    return AuthService(UsersRepository(session))


@router.post("/login", response_model=TokenResponse)
async def login(creds: LoginRequest, session: DbSession) -> TokenResponse:
    service = _service(session)
    user = await service.authenticate(creds)
    service.touch_last_login(user)
    await session.commit()
    return service.build_token_response(user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, session: DbSession) -> TokenResponse:
    service = _service(session)
    user = await service.authenticate_refresh(body.refresh_token)
    return service.build_token_response(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(current: CurrentUserDep) -> None:
    # Stateless JWT: client clears its tokens. When a refresh blocklist
    # is added, revoke current.id's refresh tokens here.
    return None


@router.get("/me", response_model=UserRead)
async def me(current: CurrentUserDep, session: DbSession) -> UserRead:
    user = await UsersRepository(session).get_by_id(current.id)
    if user is None:
        raise NotFoundError("user_not_found")
    return UserRead.model_validate(user)
