from datetime import UTC, datetime, timedelta
from typing import Any, Literal
from uuid import UUID

import bcrypt
from jose import JWTError, jwt
from pydantic import BaseModel

from app.core.config import get_settings
from app.core.constants import UserRole
from app.core.exceptions import UnauthorizedError

TokenType = Literal["access", "refresh"]

# bcrypt hashes only the first 72 bytes; truncate explicitly so longer
# passwords don't raise.
_BCRYPT_MAX_BYTES = 72


def _prepare(plain: str) -> bytes:
    return plain.encode("utf-8")[:_BCRYPT_MAX_BYTES]


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(_prepare(plain), bcrypt.gensalt()).decode("ascii")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_prepare(plain), hashed.encode("ascii"))
    except ValueError:
        return False


class TokenPayload(BaseModel):
    sub: str
    role: UserRole
    district_id: str | None = None
    masul_id: str | None = None
    type: TokenType
    exp: int
    iat: int
    sid: str | None = None  # session ID for device tracking


def _create_token(
    *,
    sub: UUID | str,
    role: UserRole | str,
    district_id: str | None,
    token_type: TokenType,
    sid: UUID | str | None = None,
    masul_id: UUID | str | None = None,
) -> str:
    settings = get_settings()
    now = datetime.now(tz=UTC)
    ttl = (
        timedelta(minutes=settings.jwt_access_ttl_min)
        if token_type == "access"
        else timedelta(days=settings.jwt_refresh_ttl_days)
    )
    role_value = UserRole(role).value if not isinstance(role, UserRole) else role.value
    payload: dict[str, Any] = {
        "sub": str(sub),
        "role": role_value,
        "district_id": district_id,
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int((now + ttl).timestamp()),
    }
    if sid is not None:
        payload["sid"] = str(sid)
    if masul_id is not None:
        payload["masul_id"] = str(masul_id)
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_access_token(
    *,
    sub: UUID | str,
    role: UserRole | str,
    district_id: str | None = None,
    sid: UUID | str | None = None,
    masul_id: UUID | str | None = None,
) -> str:
    return _create_token(sub=sub, role=role, district_id=district_id, token_type="access", sid=sid, masul_id=masul_id)


def create_refresh_token(
    *,
    sub: UUID | str,
    role: UserRole | str,
    district_id: str | None = None,
    sid: UUID | str | None = None,
    masul_id: UUID | str | None = None,
) -> str:
    return _create_token(sub=sub, role=role, district_id=district_id, token_type="refresh", sid=sid, masul_id=masul_id)


def decode_token(token: str) -> TokenPayload:
    settings = get_settings()
    try:
        raw = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise UnauthorizedError("invalid_token") from exc
    return TokenPayload(**raw)
