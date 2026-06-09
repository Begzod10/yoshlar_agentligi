import os

os.environ.setdefault("JWT_SECRET", "test-secret-min-32-chars-long-please-x")
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault(
    "DATABASE_URL", "postgresql+asyncpg://yoshlar:yoshlar@localhost:5432/yoshlar_test"
)

from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from app.db.session import get_session
from app.main import create_app


def make_mock_session():
    """Router testlari uchun async session mock — flush/refresh/commit hamma ishlaydi."""
    session = AsyncMock()
    session.add = MagicMock()
    session.flush = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.delete = AsyncMock()
    session.execute = AsyncMock()
    # refresh — ob'ektni o'zgartirmaydi, shunchaki AsyncMock
    session.refresh = AsyncMock()
    return session


@pytest.fixture(scope="session")
def app():
    application = create_app()
    # Global session override — barcha router testlari uchun
    mock_session = make_mock_session()

    async def _override_get_session():
        yield mock_session

    application.dependency_overrides[get_session] = _override_get_session
    return application


@pytest.fixture()
def client(app):
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c