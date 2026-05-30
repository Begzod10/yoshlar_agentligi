import os

os.environ.setdefault("JWT_SECRET", "test-secret-min-32-chars-long-please-x")

import pytest

from app.core.constants import UserRole
from app.core.exceptions import UnauthorizedError
from app.core.security import (
    create_access_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_password_roundtrip():
    h = hash_password("hunter2!")
    assert verify_password("hunter2!", h)
    assert not verify_password("wrong", h)


def test_access_token_roundtrip():
    tok = create_access_token(sub="11111111-1111-1111-1111-111111111111", role=UserRole.ADMIN)
    payload = decode_token(tok)
    assert payload.role == UserRole.ADMIN
    assert payload.type == "access"


def test_decode_rejects_garbage():
    with pytest.raises(UnauthorizedError):
        decode_token("not-a-jwt")
