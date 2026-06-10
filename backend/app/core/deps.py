from collections.abc import AsyncGenerator
from dataclasses import dataclass
from typing import Annotated
from uuid import UUID

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import UserRole
from app.core.exceptions import UnauthorizedError
from app.core.security import decode_token
from app.db.session import get_session

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async for s in get_session():
        yield s


DbSession = Annotated[AsyncSession, Depends(db_session)]


@dataclass(slots=True, frozen=True)
class CurrentUser:
    id: UUID
    role: UserRole
    district_id: str | None
    session_id: UUID | None = None
    masul_id: UUID | None = None


async def get_current_user(
    token: Annotated[str | None, Depends(oauth2_scheme)],
) -> CurrentUser:
    if not token:
        raise UnauthorizedError("missing_token")
    payload = decode_token(token)
    if payload.type != "access":
        raise UnauthorizedError("wrong_token_type")
    return CurrentUser(
        id=UUID(payload.sub),
        role=payload.role,
        district_id=payload.district_id,
        session_id=UUID(payload.sid) if payload.sid else None,
        masul_id=UUID(payload.masul_id) if payload.masul_id else None,
    )


CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]
