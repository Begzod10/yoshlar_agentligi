"""Seed the 5 demo accounts. Idempotent — skips emails that already exist.

Run:
    python -m scripts.seed_users
"""
import asyncio
from dataclasses import dataclass

from app.core.constants import UserRole
from app.core.logging import configure_logging, get_logger
from app.core.security import hash_password
from app.db.session import async_session_maker
from app.modules.masullar import models as _masullar_models  # noqa: F401
from app.modules.users.models import User
from app.modules.users.repository import UsersRepository

log = get_logger(__name__)


@dataclass(frozen=True)
class DemoAccount:
    email: str
    password: str
    full_name: str
    role: UserRole
    district_id: str | None


DEMO_ACCOUNTS: tuple[DemoAccount, ...] = (
    DemoAccount(
        email="admin@yoshlar.uz",
        password="admin123",
        full_name="Administrator",
        role=UserRole.ADMIN,
        district_id=None,
    ),
    DemoAccount(
        email="direktor@yoshlar.uz",
        password="direktor123",
        full_name="Yoshlar agentligi direktori",
        role=UserRole.DIREKTOR,
        district_id=None,
    ),
    DemoAccount(
        email="bekobod@yoshlar.uz",
        password="tashkilot123",
        full_name="Bekobod tumani direktori",
        role=UserRole.TASHKILOT_DIREKTORI,
        district_id="Bekobod tumani",
    ),
    DemoAccount(
        email="masul1@yoshlar.uz",
        password="masul123",
        full_name="Mas'ul hodim",
        role=UserRole.MASUL_HODIM,
        district_id="Bekobod tumani",
    ),
    DemoAccount(
        email="moderator@yoshlar.uz",
        password="moderator123",
        full_name="Moderator",
        role=UserRole.MODERATOR,
        district_id=None,
    ),
)


async def seed() -> None:
    configure_logging()
    async with async_session_maker() as session:
        repo = UsersRepository(session)
        for acc in DEMO_ACCOUNTS:
            if await repo.get_by_email(acc.email):
                log.info("skip", email=acc.email, reason="already exists")
                continue
            user = User(
                email=acc.email,
                password_hash=hash_password(acc.password),
                full_name=acc.full_name,
                role=acc.role,
                district_id=acc.district_id,
                phone=None,
                is_active=True,
                last_login_at=None,
                deleted_at=None,
            )
            await repo.add(user)
            log.info("seeded", email=acc.email, role=acc.role.value)
        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed())
