from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRoute

from app.core.config import get_settings
from app.core.exceptions import AppError, app_error_handler
from app.core.logging import configure_logging, get_logger
from app.core.openapi import DESCRIPTION, SWAGGER_UI_PARAMETERS, TAGS_METADATA
from app.middleware.request_id import RequestIdMiddleware
from app.admin.router import router as admin_router
from app.modules.auth.router import router as auth_router
from app.modules.districts.router import router as districts_router
from app.modules.flags.router import router as flags_router
from app.modules.masullar.router import router as masullar_router
from app.modules.meetings.router import router as meetings_router
from app.modules.organizations.router import router as organizations_router
from app.modules.plans.router import router as plans_router
from app.modules.monitoring.router import router as monitoring_router
from app.modules.profile.router import router as profile_router
from app.modules.removals.router import router as removals_router
from app.modules.reports.router import router as reports_router
from app.modules.stats.router import router as stats_router
from app.modules.youth.router import router as youth_router

log = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    configure_logging()
    log.info("startup", env=get_settings().app_env)
    yield
    log.info("shutdown")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        description=DESCRIPTION,
        lifespan=lifespan,
        docs_url="/docs" if settings.is_dev else None,
        redoc_url="/redoc" if settings.is_dev else None,
        openapi_tags=TAGS_METADATA,
        swagger_ui_parameters=SWAGGER_UI_PARAMETERS,
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
    app.include_router(organizations_router)
    app.include_router(masullar_router)
    app.include_router(youth_router)
    app.include_router(plans_router)
    app.include_router(meetings_router)
    app.include_router(removals_router)
    app.include_router(flags_router)
    app.include_router(profile_router)
    app.include_router(stats_router)
    app.include_router(reports_router)
    app.include_router(monitoring_router)
    app.include_router(admin_router)

    @app.get("/healthz", tags=["meta"])
    async def healthz() -> dict[str, str]:
        return {"status": "ok"}

    # Emit camelCase keys on every response (frontend convention).
    # Inputs accept both snake_case and camelCase via CamelModel.
    for route in app.routes:
        if isinstance(route, APIRoute):
            route.response_model_by_alias = True

    return app


app = create_app()
