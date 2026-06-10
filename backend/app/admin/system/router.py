"""Admin system controls — admin.md §2.3.

Reports environment, table counts, maintenance toggle.
"""

from sqlalchemy import func, select

from fastapi import APIRouter

from app.admin.system.state import get_state
from app.core.audit_context import AuditDep
from app.core.base_schema import CamelModel, schema_example
from app.core.config import get_settings
from app.core.deps import DbSession
from app.middleware.rbac import RequireAdmin
from app.modules.audit.models import AuditLog
from app.modules.flags.models import Flag
from app.modules.meetings.models import Meeting
from app.modules.organizations.models import Organization
from app.modules.plans.models import Plan
from app.modules.users.models import User
from app.modules.youth.models import Youth

router = APIRouter(prefix="/system", tags=["admin/system"])


class SystemInfo(CamelModel):
    model_config = schema_example(
        {
            "appEnv": "development",
            "appName": "Yoshlar Backend",
            "version": "0.1.0",
            "maintenanceMode": False,
            "maintenanceMessage": None,
        }
    )
    app_env: str
    app_name: str
    version: str = "0.1.0"
    maintenance_mode: bool
    maintenance_message: str | None


class TableCounts(CamelModel):
    model_config = schema_example(
        {
            "users": 5,
            "organizations": 89,
            "youth": 1247,
            "plans": 856,
            "meetings": 4521,
            "flags": 23,
            "auditLog": 18402,
        }
    )
    users: int
    organizations: int
    youth: int
    plans: int
    meetings: int
    flags: int
    audit_log: int


class MaintenanceToggle(CamelModel):
    model_config = schema_example(
        {"enabled": True, "message": "Tizim yangilanmoqda, 30 daqiqadan keyin qaytib keling."}
    )
    enabled: bool
    message: str | None = None


@router.get("/info", response_model=SystemInfo)
async def system_info(_: RequireAdmin) -> SystemInfo:
    settings = get_settings()
    state = get_state()
    return SystemInfo(
        app_env=settings.app_env,
        app_name=settings.app_name,
        maintenance_mode=state.maintenance_mode,
        maintenance_message=state.maintenance_message,
    )


@router.get("/counts", response_model=TableCounts)
async def table_counts(_: RequireAdmin, session: DbSession) -> TableCounts:
    counts: dict[str, int] = {}
    for key, model in {
        "users": User,
        "organizations": Organization,
        "youth": Youth,
        "plans": Plan,
        "meetings": Meeting,
        "flags": Flag,
        "audit_log": AuditLog,
    }.items():
        result = await session.execute(select(func.count()).select_from(model))
        counts[key] = int(result.scalar_one())
    return TableCounts(**counts)


@router.post("/maintenance", response_model=SystemInfo)
async def toggle_maintenance(
    payload: MaintenanceToggle,
    _: RequireAdmin,
    session: DbSession,
    audit: AuditDep,
) -> SystemInfo:
    state = get_state()
    state.maintenance_mode = payload.enabled
    state.maintenance_message = payload.message if payload.enabled else None
    settings = get_settings()
    await audit.record(
        "system.maintenance_toggle", "system",
        after=payload.model_dump(mode="json"),
    )
    await session.commit()
    return SystemInfo(
        app_env=settings.app_env,
        app_name=settings.app_name,
        maintenance_mode=state.maintenance_mode,
        maintenance_message=state.maintenance_message,
    )
