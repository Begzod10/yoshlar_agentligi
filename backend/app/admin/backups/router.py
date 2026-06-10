"""Admin backups — admin.md §2.3.

Real backup endpoints backed by `pg_dump` + a `backups` table.
- POST   /          — run pg_dump, persist Backup row, return metadata
- GET    /          — list backups newest-first
- GET    /{id}      — single backup metadata
- GET    /{id}/file — download the .sql.gz file
- POST   /{id}/restore — replace current DB with this backup (DESTRUCTIVE)
- DELETE /{id}      — remove file + row
"""

from datetime import datetime
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Body, Query, status
from fastapi.responses import FileResponse
from pydantic import Field

from app.admin.backups.service import BackupsService
from app.core.audit_context import AuditDep
from app.core.base_schema import CamelModel, schema_example
from app.core.deps import DbSession
from app.core.exceptions import ForbiddenError
from app.middleware.rbac import RequireAdmin

router = APIRouter(prefix="/backups", tags=["admin/backups"])


class BackupRead(CamelModel):
    model_config = schema_example(
        {
            "id": "0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
            "label": "manual-20260528T080000Z",
            "filePath": "/tmp/yoshlar-backups/20260528T080000Z-0a1b2c3d.sql.gz",
            "sizeBytes": 184523,
            "status": "completed",
            "error": None,
            "createdBy": "f6ba5d45-3cbe-424b-ae33-1c40a6a75b4f",
            "createdAt": "2026-05-28T08:00:00Z",
        }
    )
    id: UUID
    label: str
    file_path: str
    size_bytes: int
    status: str
    error: str | None
    created_by: UUID
    created_at: datetime


class CreateBackupRequest(CamelModel):
    model_config = schema_example({"label": "before-2026-q2-migration"})
    label: str | None = Field(default=None, max_length=128)


class RestoreResponse(CamelModel):
    model_config = schema_example(
        {
            "status": "completed",
            "backupId": "0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
            "restoredBy": "f6ba5d45-3cbe-424b-ae33-1c40a6a75b4f",
        }
    )
    status: str
    backup_id: str
    restored_by: str


def _service(session: DbSession) -> BackupsService:
    return BackupsService(session)


@router.get("", response_model=list[BackupRead])
async def list_backups(
    _: RequireAdmin, session: DbSession
) -> list[BackupRead]:
    items = await _service(session).list()
    return [BackupRead.model_validate(b) for b in items]


@router.post("", response_model=BackupRead, status_code=status.HTTP_201_CREATED)
async def create_backup(
    current: RequireAdmin,
    session: DbSession,
    audit: AuditDep,
    payload: CreateBackupRequest = Body(default=CreateBackupRequest()),
) -> BackupRead:
    backup = await _service(session).create(current, label=payload.label)
    await audit.record(
        "backup.create", "backup", backup.id,
        after={"label": backup.label, "sizeBytes": backup.size_bytes},
    )
    await session.commit()
    return BackupRead.model_validate(backup)


@router.get("/{backup_id}", response_model=BackupRead)
async def get_backup(
    backup_id: UUID, _: RequireAdmin, session: DbSession
) -> BackupRead:
    backup = await _service(session).get(backup_id)
    return BackupRead.model_validate(backup)


@router.get("/{backup_id}/file")
async def download_backup(
    backup_id: UUID, _: RequireAdmin, session: DbSession
) -> FileResponse:
    from app.core.config import get_settings
    from app.core.exceptions import ForbiddenError
    backup = await _service(session).get(backup_id)
    path = Path(backup.file_path).resolve()
    backups_dir = Path(get_settings().backups_dir).resolve()
    if not path.is_relative_to(backups_dir):
        raise ForbiddenError("path_outside_backups_dir")
    return FileResponse(
        path=path,
        media_type="application/gzip",
        filename=path.name,
    )


@router.post(
    "/{backup_id}/restore",
    response_model=RestoreResponse,
    status_code=status.HTTP_200_OK,
)
async def restore_backup(
    backup_id: UUID,
    current: RequireAdmin,
    session: DbSession,
    audit: AuditDep,
    confirm: bool = Query(default=False, description="must be true to proceed"),
) -> RestoreResponse:
    if not confirm:
        raise ForbiddenError("confirm_required_for_destructive_restore")
    result = await _service(session).restore(current, backup_id)
    # After restore, the connection pool may be killed — audit write is best-effort.
    try:
        await audit.record("backup.restore", "backup", backup_id)
        await session.commit()
    except Exception:
        pass
    return RestoreResponse(
        status=result["status"],
        backup_id=result["backupId"],
        restored_by=result["restoredBy"],
    )


@router.delete("/{backup_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_backup(
    backup_id: UUID,
    _: RequireAdmin,
    session: DbSession,
    audit: AuditDep,
) -> None:
    await _service(session).delete(backup_id)
    await audit.record("backup.delete", "backup", backup_id)
    await session.commit()
