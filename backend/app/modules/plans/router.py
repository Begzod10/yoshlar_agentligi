import os
import uuid as uuid_lib
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile, status

from app.core.audit_context import AuditDep
from app.core.config import get_settings
from app.core.constants import PlanStatus, UserRole
from app.core.deps import CurrentUser, DbSession
from app.middleware.rbac import require_role
from app.modules.plans.repository import PlansRepository
from app.modules.plans.schemas import PlanCreate, PlanProgressUpdate, PlanRead, PlanUpdate
from app.modules.plans.service import PlansService
from app.modules.youth.repository import YouthRepository
from app.utils.pagination import Page, PageParams

router = APIRouter(prefix="/api/plans", tags=["plans"])

_ROLES = (
    UserRole.ADMIN,
    UserRole.DIREKTOR,
    UserRole.TASHKILOT_DIREKTORI,
    UserRole.MASUL_HODIM,
    UserRole.MODERATOR,
)
_WRITE_ROLES = (
    UserRole.ADMIN,
    UserRole.DIREKTOR,
    UserRole.TASHKILOT_DIREKTORI,
    UserRole.MASUL_HODIM,
)
Access = Annotated[CurrentUser, Depends(require_role(*_ROLES))]
WriteAccess = Annotated[CurrentUser, Depends(require_role(*_WRITE_ROLES))]


def _service(session: DbSession) -> PlansService:
    return PlansService(PlansRepository(session), YouthRepository(session))


@router.get("", response_model=Page[PlanRead])
async def list_plans(
    current: Access,
    session: DbSession,
    youth_id: UUID | None = Query(default=None),
    status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=1000),
) -> Page[PlanRead]:
    params = PageParams(page=page, limit=limit)
    items, total = await PlansRepository(session).list_for_scope(
        current, youth_id=youth_id, status=status, params=params
    )
    return Page.build(
        items=[PlanRead.model_validate(p) for p in items], total=total, params=params
    )


@router.post("", response_model=PlanRead, status_code=status.HTTP_201_CREATED)
async def create_plan(
    payload: PlanCreate, current: WriteAccess, session: DbSession, audit: AuditDep
) -> PlanRead:
    plan = await _service(session).create(current, payload)
    plan_id = plan.id
    await session.commit()
    plan = await PlansRepository(session).get_by_id(plan_id)
    await audit.record("plan.create", "plan", plan_id, after=PlanRead.model_validate(plan).model_dump(mode="json"))
    await session.commit()
    return PlanRead.model_validate(plan)


@router.get("/{plan_id}", response_model=PlanRead)
async def get_plan(plan_id: UUID, current: Access, session: DbSession) -> PlanRead:
    plan = await _service(session).get(current, plan_id)
    return PlanRead.model_validate(plan)


@router.patch("/{plan_id}", response_model=PlanRead)
async def update_plan(
    request: Request,
    plan_id: UUID,
    current: WriteAccess,
    session: DbSession,
    audit: AuditDep,
) -> PlanRead:
    content_type = request.headers.get("content-type", "")
    is_multipart = "multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type

    if is_multipart:
        # Mobile app sends progress updates as multipart form data to this endpoint.
        form = await request.form()
        raw_progress = form.get("progress")
        raw_status = form.get("status")
        notes = form.get("notes") or None
        attachment_field = form.get("attachment")

        attachment_info = None
        if attachment_field and hasattr(attachment_field, "filename") and attachment_field.filename:
            settings = get_settings()
            folder = os.path.join(settings.media_dir, "plans", str(plan_id))
            os.makedirs(folder, exist_ok=True)
            ext = os.path.splitext(attachment_field.filename)[1]
            saved_name = f"{uuid_lib.uuid4()}{ext}"
            saved_path = os.path.join(folder, saved_name)
            content = await attachment_field.read()
            with open(saved_path, "wb") as fh:
                fh.write(content)
            attachment_info = {
                "filename": attachment_field.filename,
                "path": f"/media/plans/{plan_id}/{saved_name}",
                "size": len(content),
                "contentType": attachment_field.content_type,
            }

        parsed_status = PlanStatus(raw_status) if raw_status else None
        progress_payload = PlanProgressUpdate(
            progress=int(raw_progress) if raw_progress is not None else None,
            status=parsed_status,
            notes=notes,
        )
        await _service(session).update_progress(current, plan_id, progress_payload, attachment_info)
        audit_data: dict = {
            "progress": raw_progress,
            "status": raw_status,
            "notes": notes,
            "attachment": attachment_info,
        }
        await session.commit()
        plan = await PlansRepository(session).get_by_id(plan_id)
        await audit.record("plan.update_progress", "plan", plan_id, after=audit_data)
    else:
        body = await request.json()
        payload = PlanUpdate.model_validate(body)
        await _service(session).update(current, plan_id, payload)
        await session.commit()
        plan = await PlansRepository(session).get_by_id(plan_id)
        await audit.record(
            "plan.update", "plan", plan_id,
            before=payload.model_dump(exclude_unset=True, mode="json"),
            after=PlanRead.model_validate(plan).model_dump(mode="json"),
        )

    await session.commit()
    return PlanRead.model_validate(plan)


@router.patch("/{plan_id}/progress", response_model=PlanRead)
async def update_plan_progress(
    plan_id: UUID,
    current: WriteAccess,
    session: DbSession,
    audit: AuditDep,
    progress: Annotated[int | None, Form()] = None,
    plan_status: Annotated[str | None, Form(alias="status")] = None,
    notes: Annotated[str | None, Form()] = None,
    file: Annotated[UploadFile | None, File()] = None,
) -> PlanRead:
    attachment_info = None
    if file and file.filename:
        settings = get_settings()
        folder = os.path.join(settings.media_dir, "plans", str(plan_id))
        os.makedirs(folder, exist_ok=True)
        ext = os.path.splitext(file.filename)[1]
        saved_name = f"{uuid_lib.uuid4()}{ext}"
        saved_path = os.path.join(folder, saved_name)
        content = await file.read()
        with open(saved_path, "wb") as f:
            f.write(content)
        attachment_info = {
            "filename": file.filename,
            "path": f"/media/plans/{plan_id}/{saved_name}",
            "size": len(content),
            "contentType": file.content_type,
        }

    parsed_status = PlanStatus(plan_status) if plan_status else None
    payload = PlanProgressUpdate(progress=progress, status=parsed_status, notes=notes)
    await _service(session).update_progress(current, plan_id, payload, attachment_info)
    await session.commit()
    plan = await PlansRepository(session).get_by_id(plan_id)
    await audit.record(
        "plan.update_progress", "plan", plan_id,
        after={
            "progress": progress,
            "status": plan_status,
            "notes": notes,
            "attachment": attachment_info,
        },
    )
    await session.commit()
    return PlanRead.model_validate(plan)


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plan(
    plan_id: UUID, current: WriteAccess, session: DbSession, audit: AuditDep
) -> None:
    await _service(session).soft_delete(current, plan_id)
    await audit.record("plan.delete", "plan", plan_id)
    await session.commit()
