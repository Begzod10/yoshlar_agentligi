from collections.abc import AsyncIterator
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.masullar.models import Masul
from app.modules.meetings.models import Meeting
from app.modules.organizations.models import Organization
from app.modules.plans.models import Plan
from app.modules.youth.models import Youth
from app.utils.csv import anonymize_name, stream_csv


class ReportsService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def agency_youth_csv(
        self,
        *,
        from_: datetime | None = None,
        to: datetime | None = None,
        include_pii: bool = False,
    ) -> AsyncIterator[str]:
        stmt = select(Youth).where(Youth.deleted_at.is_(None))
        if from_ is not None:
            stmt = stmt.where(Youth.created_at >= from_)
        if to is not None:
            stmt = stmt.where(Youth.created_at <= to)
        stmt = stmt.order_by(Youth.created_at.desc())

        rows = []
        for youth in (await self._session.execute(stmt)).scalars().all():
            display_name = (
                youth.full_name
                if include_pii
                else anonymize_name(youth.full_name, str(youth.id))
            )
            rows.append(
                [
                    str(youth.id),
                    display_name,
                    youth.district_id,
                    youth.status.value if youth.status else "",
                    youth.created_at.isoformat() if youth.created_at else "",
                ]
            )
        async for chunk in stream_csv(
            header=["id", "name", "district_id", "status", "created_at"], rows=rows
        ):
            yield chunk

    async def organizations_csv(
        self,
        *,
        district_id: str | None = None,
    ) -> AsyncIterator[str]:
        stmt = select(Organization).where(Organization.deleted_at.is_(None))
        if district_id:
            stmt = stmt.where(Organization.district_id == district_id)
        stmt = stmt.order_by(Organization.name)

        rows = [
            [
                str(o.id),
                o.name,
                o.district_id,
                o.type or "",
                o.head_name or "",
                o.contact_phone or "",
                o.address or "",
                o.created_at.isoformat() if o.created_at else "",
            ]
            for o in (await self._session.execute(stmt)).scalars().all()
        ]
        async for chunk in stream_csv(
            header=["id", "name", "district_id", "type", "head_name", "contact_phone", "address", "created_at"],
            rows=rows,
        ):
            yield chunk

    async def masullar_csv(
        self,
        *,
        district_id: str | None = None,
    ) -> AsyncIterator[str]:
        stmt = select(Masul).where(Masul.deleted_at.is_(None))
        if district_id:
            stmt = stmt.where(Masul.district_id == district_id)
        stmt = stmt.order_by(Masul.full_name)

        rows = [
            [
                str(m.id),
                m.full_name,
                m.district_id,
                str(m.organization_id) if m.organization_id else "",
                m.position or "",
                m.phone or "",
                m.created_at.isoformat() if m.created_at else "",
            ]
            for m in (await self._session.execute(stmt)).scalars().all()
        ]
        async for chunk in stream_csv(
            header=["id", "full_name", "district_id", "organization_id", "position", "phone", "created_at"],
            rows=rows,
        ):
            yield chunk

    async def plans_csv(
        self,
        *,
        district_id: str | None = None,
        include_pii: bool = False,
    ) -> AsyncIterator[str]:
        stmt = (
            select(Plan, Youth)
            .join(Youth, Youth.id == Plan.youth_id)
            .where(Plan.deleted_at.is_(None))
        )
        if district_id:
            stmt = stmt.where(Youth.district_id == district_id)
        stmt = stmt.order_by(Plan.created_at.desc())

        rows = []
        for plan, youth in (await self._session.execute(stmt)).all():
            display_name = (
                youth.full_name
                if include_pii
                else anonymize_name(youth.full_name, str(youth.id))
            )
            rows.append(
                [
                    str(plan.id),
                    display_name,
                    youth.district_id,
                    plan.title,
                    str(plan.status) if plan.status else "",
                    str(plan.progress),
                    plan.start_date.isoformat() if plan.start_date else "",
                    plan.end_date.isoformat() if plan.end_date else "",
                    plan.created_at.isoformat() if plan.created_at else "",
                ]
            )
        async for chunk in stream_csv(
            header=["id", "youth_name", "district_id", "title", "status", "progress", "start_date", "end_date", "created_at"],
            rows=rows,
        ):
            yield chunk

    async def meetings_csv(
        self,
        *,
        district_id: str | None = None,
        include_pii: bool = False,
    ) -> AsyncIterator[str]:
        stmt = (
            select(Meeting, Youth)
            .join(Youth, Youth.id == Meeting.youth_id)
            .where(Meeting.deleted_at.is_(None))
        )
        if district_id:
            stmt = stmt.where(Youth.district_id == district_id)
        stmt = stmt.order_by(Meeting.scheduled_at.desc())

        rows = []
        for meeting, youth in (await self._session.execute(stmt)).all():
            display_name = (
                youth.full_name
                if include_pii
                else anonymize_name(youth.full_name, str(youth.id))
            )
            rows.append(
                [
                    str(meeting.id),
                    display_name,
                    youth.district_id,
                    meeting.type or "",
                    meeting.scheduled_at.isoformat() if meeting.scheduled_at else "",
                    str(meeting.attendance_status) if meeting.attendance_status else "",
                    meeting.location or "",
                    meeting.created_at.isoformat() if meeting.created_at else "",
                ]
            )
        async for chunk in stream_csv(
            header=["id", "youth_name", "district_id", "type", "scheduled_at", "attendance_status", "location", "created_at"],
            rows=rows,
        ):
            yield chunk

    async def district_youth_csv(
        self,
        district_id: str,
        *,
        include_pii: bool = False,
    ) -> AsyncIterator[str]:
        stmt = (
            select(Youth)
            .where(
                Youth.deleted_at.is_(None),
                Youth.district_id == district_id,
            )
            .order_by(Youth.created_at.desc())
        )
        rows = []
        for youth in (await self._session.execute(stmt)).scalars().all():
            display_name = (
                youth.full_name
                if include_pii
                else anonymize_name(youth.full_name, str(youth.id))
            )
            rows.append(
                [
                    str(youth.id),
                    display_name,
                    youth.district_id,
                    youth.status.value if youth.status else "",
                    youth.created_at.isoformat() if youth.created_at else "",
                ]
            )
        async for chunk in stream_csv(
            header=["id", "name", "district_id", "status", "created_at"], rows=rows
        ):
            yield chunk
