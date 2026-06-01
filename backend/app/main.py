from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.exceptions import AppError, app_error_handler
from app.core.logging import configure_logging, get_logger
from app.middleware.request_id import RequestIdMiddleware
from app.modules.auth.router import router as auth_router
from app.modules.districts.router import router as districts_router
from app.modules.flags.router import router as flags_router
from app.modules.organizations.router import router as organizations_router
from app.modules.stats.router import router as stats_router
from app.modules.audit.router import router as audit_router
from app.modules.reports.router import router as reports_router
from app.modules.youth.router import router as youth_router
from app.modules.masullar.router import router as masullar_router
from app.modules.plans.router import router as plans_router
from app.modules.meetings.router import router as meetings_router

log = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    configure_logging()
    settings = get_settings()
    log.info("startup", env=settings.app_env)
    # Dev/test muhitida demo ma'lumotlarni avtomatik yuklash
    if settings.app_env in ("development", "test"):
        try:
            from scripts.seed_demo import seed_all
            await seed_all()
        except Exception as exc:  # noqa: BLE001
            log.warning("seed_demo skipped", reason=str(exc))
    yield
    log.info("shutdown")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs" if settings.is_dev else None,
        redoc_url=None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )
    app.add_middleware(RequestIdMiddleware)

    app.add_exception_handler(AppError, app_error_handler)  # type: ignore[arg-type]

    app.include_router(auth_router)
    app.include_router(districts_router)
    app.include_router(flags_router)
    app.include_router(organizations_router)
    app.include_router(stats_router)
    app.include_router(audit_router)
    app.include_router(reports_router)
    app.include_router(youth_router)
    app.include_router(masullar_router)
    app.include_router(plans_router)
    app.include_router(meetings_router)

    @app.get("/healthz", tags=["meta"])
    async def healthz() -> dict[str, str]:
        return {"status": "ok"}

    if settings.is_dev:
        @app.post("/api/dev/seed", tags=["dev"])
        async def run_seed() -> dict[str, str]:
            """Dev muhitida seed ni qo'lda ishlatish."""
            from scripts.seed_demo import seed_all
            await seed_all()
            return {"status": "seeded"}

        @app.delete("/api/dev/wipe", tags=["dev"])
        async def wipe_demo() -> dict[str, str]:
            """Dev muhitida barcha demo ma'lumotlarni o'chirish."""
            from scripts.seed_demo import wipe_demo_data
            await wipe_demo_data()
            return {"status": "wiped"}

    return app


app = create_app()