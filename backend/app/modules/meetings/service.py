from datetime import UTC, datetime
from uuid import UUID

from app.core.constants import (
    CROSS_DISTRICT_ROLES,
    MeetingAttendance,
    UserRole,
)
from app.core.deps import CurrentUser
from app.core.exceptions import (
    ConflictError,
    DistrictMismatchError,
    ForbiddenError,
    NotFoundError,
    YouthNotAssignedError,
)
from app.modules.meetings.models import Meeting
from app.modules.meetings.repository import MeetingsRepository
from app.modules.meetings.schemas import (
    AttendanceUpdate,
    MeetingCreate,
    MeetingUpdate,
)
from app.modules.youth.models import Youth
from app.modules.youth.repository import YouthRepository


class MeetingsService:
    def __init__(self, repo: MeetingsRepository, youth: YouthRepository) -> None:
        self._repo = repo
        self._youth = youth

    @staticmethod
    def _assert_can_touch_youth(actor: CurrentUser, youth: Youth) -> None:
        if actor.role in CROSS_DISTRICT_ROLES:
            return
        if actor.role == UserRole.TASHKILOT_DIREKTORI:
            if actor.district_id != youth.district_id:
                raise DistrictMismatchError()
            return
        if actor.role == UserRole.MASUL_HODIM:
            if youth.masul_id != actor.id:
                raise YouthNotAssignedError()
            return
        raise ForbiddenError("role_not_allowed")

    async def create(self, actor: CurrentUser, payload: MeetingCreate) -> Meeting:
        youth = await self._youth.get_by_id(payload.youth_id)
        if youth is None:
            raise NotFoundError("youth_not_found")
        self._assert_can_touch_youth(actor, youth)

        existing = await self._repo.find_same_day_for_youth(
            youth.id, payload.scheduled_at
        )
        if existing is not None:
            raise ConflictError("meeting_same_day_collision")

        meeting = Meeting(
            youth_id=youth.id,
            masul_id=youth.masul_id,
            scheduled_at=payload.scheduled_at,
            type=payload.type,
            location=payload.location,
            agenda=payload.agenda,
            attendance_status=MeetingAttendance.SCHEDULED,
        )
        return await self._repo.add(meeting)

    async def get(self, actor: CurrentUser, meeting_id: UUID) -> Meeting:
        meeting = await self._repo.get_by_id(meeting_id)
        if meeting is None:
            raise NotFoundError("meeting_not_found")
        youth = await self._youth.get_by_id(meeting.youth_id)
        if youth is None:
            raise NotFoundError("youth_not_found")
        self._assert_can_touch_youth(actor, youth)
        return meeting

    async def update(
        self, actor: CurrentUser, meeting_id: UUID, payload: MeetingUpdate
    ) -> Meeting:
        meeting = await self.get(actor, meeting_id)
        for key, value in payload.model_dump(exclude_unset=True, by_alias=False).items():
            setattr(meeting, key, value)
        return meeting

    async def update_attendance(
        self, actor: CurrentUser, meeting_id: UUID, payload: AttendanceUpdate
    ) -> Meeting:
        meeting = await self.get(actor, meeting_id)
        meeting.attendance_status = payload.attendance_status
        if payload.attendance_notes is not None:
            meeting.attendance_notes = payload.attendance_notes
        return meeting

    async def soft_delete(self, actor: CurrentUser, meeting_id: UUID) -> None:
        if actor.role == UserRole.MASUL_HODIM:
            raise ForbiddenError("role_not_allowed")
        meeting = await self.get(actor, meeting_id)
        meeting.deleted_at = datetime.now(tz=UTC)
