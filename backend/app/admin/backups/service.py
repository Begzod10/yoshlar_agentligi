"""pg_dump-backed backups.

`create`:
  1. Run `pg_dump` in a subprocess against the configured DATABASE_URL
     (asyncpg URL is rewritten to a libpq-compatible one).
  2. Write to `{BACKUPS_DIR}/{timestamp}-{uuid}.sql.gz`.
  3. Persist a Backup row.

`restore`:
  1. Look up the Backup row.
  2. Run `psql` to apply the dump file. Existing data is REPLACED.

This shells out — pg_dump / psql must be installed and DATABASE_URL must
be reachable from this process.
"""

import asyncio
import gzip
import logging
import os
from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID, uuid4

log = logging.getLogger(__name__)

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.backups.models import Backup
from app.core.config import get_settings
from app.core.deps import CurrentUser
from app.core.exceptions import AppError, NotFoundError


class BackupError(AppError):
    status_code = 500
    code = "backup_failed"


def _libpq_url(asyncpg_url: str) -> str:
    """Convert SQLAlchemy `postgresql+asyncpg://` -> `postgresql://`."""
    if asyncpg_url.startswith("postgresql+asyncpg://"):
        return "postgresql://" + asyncpg_url.removeprefix("postgresql+asyncpg://")
    return asyncpg_url


class BackupsService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._settings = get_settings()

    async def list(self) -> list[Backup]:
        stmt = select(Backup).order_by(desc(Backup.created_at))
        return list((await self._session.execute(stmt)).scalars().all())

    async def get(self, backup_id: UUID) -> Backup:
        backup = (
            await self._session.execute(select(Backup).where(Backup.id == backup_id))
        ).scalar_one_or_none()
        if backup is None:
            raise NotFoundError("backup_not_found")
        return backup

    async def create(self, actor: CurrentUser, label: str | None = None) -> Backup:
        backups_dir = Path(self._settings.backups_dir)
        backups_dir.mkdir(parents=True, exist_ok=True)

        backup_id = uuid4()
        ts = datetime.now(tz=UTC).strftime("%Y%m%dT%H%M%SZ")
        filename = f"{ts}-{backup_id.hex[:8]}.sql.gz"
        out_path = backups_dir / filename

        cmd = [
            "pg_dump",
            "--no-owner",
            "--no-privileges",
            "--clean",
            "--if-exists",
            _libpq_url(self._settings.database_url),
        ]
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await proc.communicate()
            if proc.returncode != 0:
                log.error("pg_dump_failed", extra={"stderr": stderr.decode("utf-8", errors="replace")[:1500]})
                raise BackupError("pg_dump_failed")
            with gzip.open(out_path, "wb") as f:
                f.write(stdout)
        except FileNotFoundError as exc:
            raise BackupError("pg_dump_not_installed") from exc

        size = out_path.stat().st_size
        backup = Backup(
            id=backup_id,
            label=label or f"manual-{ts}",
            file_path=str(out_path),
            size_bytes=size,
            status="completed",
            created_by=actor.id,
        )
        self._session.add(backup)
        await self._session.flush()
        return backup

    async def restore(self, actor: CurrentUser, backup_id: UUID) -> dict[str, str]:
        backup = await self.get(backup_id)
        path = Path(backup.file_path)
        if not path.exists():
            raise BackupError("backup_file_missing")

        db_url = _libpq_url(self._settings.database_url)

        # Terminate other connections so DROP statements from --clean don't hang.
        # Use parameterized SQL piped via stdin to avoid f-string SQL injection.
        from urllib.parse import urlparse
        parsed = urlparse(db_url)
        dbname = parsed.path.lstrip("/")
        terminate_sql = (
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
            "WHERE datname = current_database() AND pid <> pg_backend_pid();"
        )
        try:
            terminate_proc = await asyncio.create_subprocess_exec(
                "psql", db_url, "-c", terminate_sql,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env={**os.environ},
            )
            await terminate_proc.communicate()
        except FileNotFoundError as exc:
            raise BackupError("psql_not_installed") from exc

        # Read and decompress the .sql.gz file, then pipe to psql.
        with gzip.open(path, "rb") as f:
            sql_bytes = f.read()

        try:
            psql = await asyncio.create_subprocess_exec(
                "psql", db_url,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env={**os.environ},
            )
            _stdout, stderr = await psql.communicate(input=sql_bytes)
            if psql.returncode != 0:
                log.error("psql_restore_failed", extra={"stderr": stderr.decode("utf-8", errors="replace")[:1500]})
                raise BackupError("psql_restore_failed")
        except FileNotFoundError as exc:
            raise BackupError("psql_not_installed") from exc

        return {
            "status": "completed",
            "backupId": str(backup.id),
            "restoredBy": str(actor.id),
        }

    async def delete(self, backup_id: UUID) -> None:
        backup = await self.get(backup_id)
        path = Path(backup.file_path)
        if path.exists():
            try:
                path.unlink()
            except OSError:
                pass
        await self._session.delete(backup)

    @staticmethod
    def file_path(backup: Backup) -> Path:
        return Path(backup.file_path)
