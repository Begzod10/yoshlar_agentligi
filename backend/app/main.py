import os
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from fastapi.staticfiles import StaticFiles

from app.core.config import get_settings
from app.core.exceptions import AppError, app_error_handler
from app.core.logging import configure_logging, get_logger
from app.core.openapi import DESCRIPTION, SWAGGER_UI_PARAMETERS, TAGS_METADATA
from app.middleware.request_id import RequestIdMiddleware
from app.admin.router import router as admin_router
from app.routers.common import router as common_router
from app.routers.direktor import router as direktor_router
from app.routers.mobile import router as mobile_router
from app.routers.moderator import router as moderator_router

log = get_logger(__name__)


def _sanitize(value: Any) -> Any:
    """Recursively replace bytes with a safe placeholder so JSON encoding never fails."""
    if isinstance(value, bytes):
        return f"<binary {len(value)} bytes>"
    if isinstance(value, dict):
        return {k: _sanitize(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_sanitize(item) for item in value]
    return value


async def _validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"detail": _sanitize(exc.errors())},
    )


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

    # In dev, reflect any origin back (regex ".*") so credentials work from any IP.
    # In prod, restrict to the explicit allowlist from CORS_ORIGINS env var.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[] if settings.is_dev else settings.cors_origins,
        allow_origin_regex=".*" if settings.is_dev else None,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )
    app.add_middleware(RequestIdMiddleware)

    app.add_exception_handler(AppError, app_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, _validation_error_handler)  # type: ignore[arg-type]

    # ── common (all roles) ──────────────────────────────────
    app.include_router(common_router)

    # ── direktor: youth, masullar, plans, meetings, removals, orgs
    app.include_router(direktor_router)

    # ── moderator: flags, stats, audit, reports, monitoring
    app.include_router(moderator_router)

    # ── mobile: masul_hodim lightweight endpoints
    app.include_router(mobile_router)

    # ── admin panel ──────────────────────────────────────────
    app.include_router(admin_router)

    # ── static media files ───────────────────────────────────
    media_dir = settings.media_dir
    os.makedirs(media_dir, exist_ok=True)
    app.mount("/media", StaticFiles(directory=media_dir), name="media")

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
