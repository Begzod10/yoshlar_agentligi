import os

os.environ.setdefault("JWT_SECRET", "test-secret-min-32-chars-long-please-x")
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault(
    "DATABASE_URL", "postgresql+asyncpg://yoshlar:yoshlar@localhost:5432/yoshlar_test"
)

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture(scope="session")
def app():
    return create_app()


@pytest.fixture()
def client(app):
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
