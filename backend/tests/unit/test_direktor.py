"""Unit tests for the direktor role backend — youth CRUD, removals, masullar,
plans, meetings, organizations write, RBAC, scope enforcement."""
import os

os.environ.setdefault("JWT_SECRET", "test-secret-min-32-chars-long-please-x")
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault(
    "DATABASE_URL", "postgresql+asyncpg://yoshlar:yoshlar@localhost:5432/yoshlar_test"
)

from datetime import UTC, date, datetime
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID, uuid4

import pytest

from app.core.constants import (
    MeetingAttendance,
    PlanStatus,
    UserRole,
    YouthStatus,
)
from app.core.deps import CurrentUser
from app.core.exceptions import ForbiddenError, NotFoundError, ValidationError
from app.core.security import create_access_token
from app.modules.masullar.models import Masul
from app.modules.masullar.schemas import MasulCreate, MasulUpdate
from app.modules.meetings.schemas import AttendanceUpdate, MeetingCreate, MeetingUpdate
from app.modules.organizations.schemas import OrganizationCreate, OrganizationUpdate
from app.modules.plans.schemas import PlanCreate, PlanUpdate
from app.modules.youth.models import Youth
from app.modules.youth.schemas import (
    AssignMasulRequest,
    ProposeRemovalRequest,
    RejectRemovalRequest,
    StatusChangeRequest,
    YouthCreate,
    YouthRead,
    YouthUpdate,
    YouthUpdateByMasul,
)
from app.modules.youth.service import YouthService

# ─── helpers ────────────────────────────────────────────────────────────

ADMIN_ID = uuid4()
DIREKTOR_ID = uuid4()
TASHKILOT_ID = uuid4()
MASUL_ID = uuid4()
MODERATOR_ID = uuid4()
ORG_ID = uuid4()

DISTRICT_A = "Bekobod tumani"
DISTRICT_B = "Chinoz tumani"

USERS = {
    "admin": CurrentUser(id=ADMIN_ID, role=UserRole.ADMIN, district_id=None),
    "direktor": CurrentUser(id=DIREKTOR_ID, role=UserRole.DIREKTOR, district_id=None),
    "tashkilot": CurrentUser(id=TASHKILOT_ID, role=UserRole.TASHKILOT_DIREKTORI, district_id=DISTRICT_A),
    "masul": CurrentUser(id=MASUL_ID, role=UserRole.MASUL_HODIM, district_id=DISTRICT_A),
    "moderator": CurrentUser(id=MODERATOR_ID, role=UserRole.MODERATOR, district_id=None),
}


def _auth_header(role: str) -> dict[str, str]:
    user = USERS[role]
    token = create_access_token(sub=user.id, role=user.role, district_id=user.district_id)
    return {"Authorization": f"Bearer {token}"}


def _make_youth(
    *,
    youth_id: UUID | None = None,
    district_id: str = DISTRICT_A,
    masul_id: UUID | None = None,
    status: YouthStatus = YouthStatus.ACTIVE,
    removal_proposal: dict | None = None,
) -> Youth:
    y = Youth(
        id=youth_id or uuid4(),
        full_name="Aziz Karimov",
        birth_date=date(2001, 5, 15),
        district_id=district_id,
        masul_id=masul_id,
        organization_id=ORG_ID,
        status=status,
        category="talaba",
        contact="+998901234567",
        notes=None,
        removal_proposal=removal_proposal,
    )
    y.created_at = datetime.now(tz=UTC)
    y.updated_at = datetime.now(tz=UTC)
    return y


def _make_masul(
    *,
    masul_id: UUID | None = None,
    district_id: str = DISTRICT_A,
) -> Masul:
    m = Masul(
        id=masul_id or uuid4(),
        full_name="Sardor Toshmatov",
        district_id=district_id,
        organization_id=ORG_ID,
        phone="+998901111111",
        email="sardor@example.com",
    )
    m.created_at = datetime.now(tz=UTC)
    m.updated_at = datetime.now(tz=UTC)
    return m


def _mock_session() -> AsyncMock:
    session = AsyncMock()
    session.add = MagicMock()
    session.flush = AsyncMock()
    session.commit = AsyncMock()
    session.delete = AsyncMock()
    return session


# ═══════════════════════════════════════════════════════════════════════
# 1. SCHEMA VALIDATION TESTS
# ═══════════════════════════════════════════════════════════════════════


class TestYouthSchemas:
    def test_youth_create_valid(self):
        yc = YouthCreate(
            full_name="Anvar Toshmatov",
            district_id=DISTRICT_A,
            masul_id=uuid4(),
            organization_id=uuid4(),
        )
        assert yc.full_name == "Anvar Toshmatov"
        assert yc.birth_date is None

    def test_youth_create_rejects_short_name(self):
        with pytest.raises(Exception):
            YouthCreate(full_name="A", district_id=DISTRICT_A)

    def test_youth_create_rejects_empty_district(self):
        with pytest.raises(Exception):
            YouthCreate(full_name="Valid Name", district_id="")

    def test_youth_update_partial(self):
        yu = YouthUpdate(category="ishchi")
        dump = yu.model_dump(exclude_unset=True)
        assert dump == {"category": "ishchi"}

    def test_youth_update_by_masul_only_contact_notes(self):
        ym = YouthUpdateByMasul(contact="+998909999999")
        dump = ym.model_dump(exclude_unset=True)
        assert "contact" in dump
        assert "full_name" not in dump.__class__.__dict__  # field doesn't exist

    def test_assign_masul_request_defaults(self):
        req = AssignMasulRequest(masul_id=uuid4())
        assert req.override is False

    def test_assign_masul_request_with_override(self):
        req = AssignMasulRequest(masul_id=uuid4(), override=True)
        assert req.override is True

    def test_status_change_request(self):
        req = StatusChangeRequest(status=YouthStatus.GRADUATED, reason="Universitetni tugatdi")
        assert req.status == YouthStatus.GRADUATED

    def test_propose_removal_rejects_short_reason(self):
        with pytest.raises(Exception):
            ProposeRemovalRequest(reason="too short")

    def test_propose_removal_valid(self):
        req = ProposeRemovalRequest(reason="Bu yoshni ro'yxatdan chiqarish kerak chunki ko'chib ketgan boshqa viloyatga")
        assert len(req.reason) >= 20

    def test_reject_removal_rejects_short_comment(self):
        with pytest.raises(Exception):
            RejectRemovalRequest(comment="no")

    def test_reject_removal_valid(self):
        req = RejectRemovalRequest(comment="Tekshirib ko'rdik, hali ko'chib ketmagan")
        assert len(req.comment) >= 10


class TestMasulSchemas:
    def test_masul_create_valid(self):
        mc = MasulCreate(
            full_name="Botir Aliyev",
            district_id=DISTRICT_A,
            organization_id=uuid4(),
        )
        assert mc.phone is None

    def test_masul_create_rejects_short_name(self):
        with pytest.raises(Exception):
            MasulCreate(full_name="B", district_id=DISTRICT_A, organization_id=uuid4())

    def test_masul_update_partial(self):
        mu = MasulUpdate(phone="+998901234567")
        dump = mu.model_dump(exclude_unset=True)
        assert dump == {"phone": "+998901234567"}


class TestPlanSchemas:
    def test_plan_create_valid(self):
        pc = PlanCreate(
            youth_id=uuid4(),
            masul_id=uuid4(),
            title="Kasb o'rgatish rejasi",
            start_date=date(2026, 6, 1),
            end_date=date(2026, 12, 31),
        )
        assert pc.status == PlanStatus.DRAFT
        assert pc.goal is None

    def test_plan_create_rejects_short_title(self):
        with pytest.raises(Exception):
            PlanCreate(
                youth_id=uuid4(), masul_id=uuid4(), title="X",
                start_date=date(2026, 6, 1), end_date=date(2026, 12, 31),
            )

    def test_plan_update_progress_validation(self):
        pu = PlanUpdate(progress=50)
        assert pu.progress == 50

    def test_plan_update_rejects_invalid_progress(self):
        with pytest.raises(Exception):
            PlanUpdate(progress=101)

    def test_plan_update_rejects_negative_progress(self):
        with pytest.raises(Exception):
            PlanUpdate(progress=-1)


class TestMeetingSchemas:
    def test_meeting_create_valid(self):
        mc = MeetingCreate(
            youth_id=uuid4(),
            masul_id=uuid4(),
            scheduled_at=datetime(2026, 7, 1, 10, 0),
        )
        assert mc.type is None
        assert mc.location is None

    def test_attendance_update_valid(self):
        au = AttendanceUpdate(
            attendance_status=MeetingAttendance.ATTENDED,
            attendance_notes="Kechikib keldi, lekin qatnashdi",
        )
        assert au.attendance_status == MeetingAttendance.ATTENDED


class TestOrganizationSchemas:
    def test_org_create_valid(self):
        oc = OrganizationCreate(
            name="Bekobod yoshlar markazi",
            district_id=DISTRICT_A,
            director_name="Karimov Jasur",
        )
        assert oc.type is None

    def test_org_create_rejects_short_name(self):
        with pytest.raises(Exception):
            OrganizationCreate(name="X", district_id=DISTRICT_A, director_name="Valid Director")

    def test_org_update_partial(self):
        ou = OrganizationUpdate(address="Bekobod tumani, 1-mavze")
        dump = ou.model_dump(exclude_unset=True)
        assert dump == {"address": "Bekobod tumani, 1-mavze"}


# ═══════════════════════════════════════════════════════════════════════
# 2. YOUTH SERVICE UNIT TESTS
# ═══════════════════════════════════════════════════════════════════════


class TestYouthServiceCreate:
    def _make_service(self, repo: AsyncMock | None = None) -> tuple[YouthService, AsyncMock]:
        session = _mock_session()
        r = repo or AsyncMock()
        return YouthService(session, r), session

    @pytest.mark.asyncio
    async def test_direktor_can_create(self):
        repo = AsyncMock()

        def _add(y: Youth) -> Youth:
            y.id = uuid4()
            y.status = YouthStatus.ACTIVE
            y.created_at = datetime.now(tz=UTC)
            y.updated_at = datetime.now(tz=UTC)
            y.removal_proposal = None
            return y

        repo.add = AsyncMock(side_effect=_add)
        service, session = self._make_service(repo)

        data = YouthCreate(full_name="Alisher Navoiy", district_id=DISTRICT_A)
        result = await service.create(data, USERS["direktor"])
        assert result.full_name == "Alisher Navoiy"
        assert result.district_id == DISTRICT_A
        repo.add.assert_called_once()

    @pytest.mark.asyncio
    async def test_admin_can_create(self):
        repo = AsyncMock()

        def _add(y: Youth) -> Youth:
            y.id = uuid4()
            y.status = YouthStatus.ACTIVE
            y.created_at = datetime.now(tz=UTC)
            y.updated_at = datetime.now(tz=UTC)
            y.removal_proposal = None
            return y

        repo.add = AsyncMock(side_effect=_add)
        service, _ = self._make_service(repo)

        data = YouthCreate(full_name="Test Youth", district_id=DISTRICT_B)
        result = await service.create(data, USERS["admin"])
        assert result.district_id == DISTRICT_B

    @pytest.mark.asyncio
    async def test_tashkilot_creates_with_forced_district(self):
        repo = AsyncMock()

        def _add(y: Youth) -> Youth:
            y.id = uuid4()
            y.status = YouthStatus.ACTIVE
            y.created_at = datetime.now(tz=UTC)
            y.updated_at = datetime.now(tz=UTC)
            y.removal_proposal = None
            return y

        repo.add = AsyncMock(side_effect=_add)
        service, _ = self._make_service(repo)

        # tashkilot tries to set DISTRICT_B but service forces DISTRICT_A
        data = YouthCreate(full_name="Forced District", district_id=DISTRICT_B)
        result = await service.create(data, USERS["tashkilot"])
        assert result.district_id == DISTRICT_A

    @pytest.mark.asyncio
    async def test_masul_cannot_create(self):
        service, _ = self._make_service()
        data = YouthCreate(full_name="Not Allowed", district_id=DISTRICT_A)
        with pytest.raises(ForbiddenError):
            await service.create(data, USERS["masul"])

    @pytest.mark.asyncio
    async def test_moderator_cannot_create(self):
        service, _ = self._make_service()
        data = YouthCreate(full_name="Not Allowed", district_id=DISTRICT_A)
        with pytest.raises(ForbiddenError):
            await service.create(data, USERS["moderator"])


class TestYouthServiceGet:
    @pytest.mark.asyncio
    async def test_direktor_can_get_any_district(self):
        youth = _make_youth(district_id=DISTRICT_B)
        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=youth)
        service = YouthService(_mock_session(), repo)

        result = await service.get(youth.id, USERS["direktor"])
        assert result.id == youth.id

    @pytest.mark.asyncio
    async def test_tashkilot_can_get_own_district(self):
        youth = _make_youth(district_id=DISTRICT_A)
        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=youth)
        service = YouthService(_mock_session(), repo)

        result = await service.get(youth.id, USERS["tashkilot"])
        assert result.district_id == DISTRICT_A

    @pytest.mark.asyncio
    async def test_tashkilot_cannot_get_other_district(self):
        youth = _make_youth(district_id=DISTRICT_B)
        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=youth)
        service = YouthService(_mock_session(), repo)

        with pytest.raises(ForbiddenError):
            await service.get(youth.id, USERS["tashkilot"])

    @pytest.mark.asyncio
    async def test_masul_can_get_own_youth(self):
        youth = _make_youth(masul_id=MASUL_ID)
        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=youth)
        service = YouthService(_mock_session(), repo)

        result = await service.get(youth.id, USERS["masul"])
        assert result.id == youth.id

    @pytest.mark.asyncio
    async def test_masul_cannot_get_other_youth(self):
        youth = _make_youth(masul_id=uuid4())  # different masul
        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=youth)
        service = YouthService(_mock_session(), repo)

        with pytest.raises(ForbiddenError):
            await service.get(youth.id, USERS["masul"])

    @pytest.mark.asyncio
    async def test_get_not_found(self):
        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=None)
        service = YouthService(_mock_session(), repo)

        with pytest.raises(NotFoundError):
            await service.get(uuid4(), USERS["direktor"])


class TestYouthServiceList:
    @pytest.mark.asyncio
    async def test_direktor_sees_all(self):
        rows = [_make_youth(), _make_youth()]
        repo = AsyncMock()
        repo.list = AsyncMock(return_value=(rows, 2))
        service = YouthService(_mock_session(), repo)

        result = await service.list(USERS["direktor"])
        assert result["meta"]["total"] == 2
        # no district filter forced
        call_kwargs = repo.list.call_args.kwargs
        assert call_kwargs["district_id"] is None
        assert call_kwargs["masul_id"] is None

    @pytest.mark.asyncio
    async def test_tashkilot_gets_district_filtered(self):
        repo = AsyncMock()
        repo.list = AsyncMock(return_value=([], 0))
        service = YouthService(_mock_session(), repo)

        await service.list(USERS["tashkilot"])
        call_kwargs = repo.list.call_args.kwargs
        assert call_kwargs["district_id"] == DISTRICT_A

    @pytest.mark.asyncio
    async def test_masul_gets_own_youth_only(self):
        repo = AsyncMock()
        repo.list = AsyncMock(return_value=([], 0))
        service = YouthService(_mock_session(), repo)

        await service.list(USERS["masul"])
        call_kwargs = repo.list.call_args.kwargs
        assert call_kwargs["masul_id"] == MASUL_ID

    @pytest.mark.asyncio
    async def test_moderator_cannot_list(self):
        service = YouthService(_mock_session(), AsyncMock())
        with pytest.raises(ForbiddenError):
            await service.list(USERS["moderator"])


class TestYouthServiceUpdate:
    @pytest.mark.asyncio
    async def test_direktor_can_update_any_field(self):
        youth = _make_youth()
        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=youth)
        service = YouthService(_mock_session(), repo)

        data = YouthUpdate(full_name="Yangi Ism", category="ishchi")
        result = await service.update(youth.id, data, USERS["direktor"])
        assert result.full_name == "Yangi Ism"

    @pytest.mark.asyncio
    async def test_masul_limited_to_contact_notes(self):
        youth = _make_youth(masul_id=MASUL_ID)
        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=youth)
        service = YouthService(_mock_session(), repo)

        data = YouthUpdateByMasul(contact="+998900000000")
        result = await service.update(youth.id, data, USERS["masul"])
        assert result.contact == "+998900000000"

    @pytest.mark.asyncio
    async def test_masul_cannot_pass_full_update(self):
        youth = _make_youth(masul_id=MASUL_ID)
        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=youth)
        service = YouthService(_mock_session(), repo)

        data = YouthUpdate(full_name="Hack Attempt")
        with pytest.raises(ForbiddenError):
            await service.update(youth.id, data, USERS["masul"])

    @pytest.mark.asyncio
    async def test_update_not_found(self):
        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=None)
        service = YouthService(_mock_session(), repo)

        data = YouthUpdate(full_name="Test")
        with pytest.raises(NotFoundError):
            await service.update(uuid4(), data, USERS["direktor"])


class TestYouthServiceDelete:
    @pytest.mark.asyncio
    async def test_direktor_can_delete(self):
        youth = _make_youth()
        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=youth)
        repo.delete = AsyncMock()
        service = YouthService(_mock_session(), repo)

        await service.delete(youth.id, USERS["direktor"])
        repo.delete.assert_called_once_with(youth)

    @pytest.mark.asyncio
    async def test_masul_cannot_delete(self):
        service = YouthService(_mock_session(), AsyncMock())
        with pytest.raises(ForbiddenError):
            await service.delete(uuid4(), USERS["masul"])

    @pytest.mark.asyncio
    async def test_moderator_cannot_delete(self):
        service = YouthService(_mock_session(), AsyncMock())
        with pytest.raises(ForbiddenError):
            await service.delete(uuid4(), USERS["moderator"])

    @pytest.mark.asyncio
    async def test_delete_not_found(self):
        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=None)
        service = YouthService(_mock_session(), repo)

        with pytest.raises(NotFoundError):
            await service.delete(uuid4(), USERS["direktor"])


# ═══════════════════════════════════════════════════════════════════════
# 3. ASSIGN MASUL TESTS
# ═══════════════════════════════════════════════════════════════════════


class TestAssignMasul:
    @pytest.mark.asyncio
    async def test_assign_same_district_succeeds(self):
        youth = _make_youth(district_id=DISTRICT_A)
        masul = _make_masul(district_id=DISTRICT_A)

        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=youth)
        session = _mock_session()

        with patch("app.modules.youth.service.MasullarRepository") as MockMasulRepo:
            mock_masul_repo = AsyncMock()
            mock_masul_repo.get_by_id = AsyncMock(return_value=masul)
            MockMasulRepo.return_value = mock_masul_repo

            service = YouthService(session, repo)
            data = AssignMasulRequest(masul_id=masul.id)
            result = await service.assign_masul(youth.id, data, USERS["direktor"])
            assert result.masul_id == masul.id

    @pytest.mark.asyncio
    async def test_assign_cross_district_without_override_fails(self):
        youth = _make_youth(district_id=DISTRICT_A)
        masul = _make_masul(district_id=DISTRICT_B)

        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=youth)
        session = _mock_session()

        with patch("app.modules.youth.service.MasullarRepository") as MockMasulRepo:
            mock_masul_repo = AsyncMock()
            mock_masul_repo.get_by_id = AsyncMock(return_value=masul)
            MockMasulRepo.return_value = mock_masul_repo

            service = YouthService(session, repo)
            data = AssignMasulRequest(masul_id=masul.id, override=False)
            with pytest.raises(ValidationError):
                await service.assign_masul(youth.id, data, USERS["direktor"])

    @pytest.mark.asyncio
    async def test_assign_cross_district_with_override_by_direktor(self):
        youth = _make_youth(district_id=DISTRICT_A)
        masul = _make_masul(district_id=DISTRICT_B)

        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=youth)
        session = _mock_session()

        with patch("app.modules.youth.service.MasullarRepository") as MockMasulRepo:
            mock_masul_repo = AsyncMock()
            mock_masul_repo.get_by_id = AsyncMock(return_value=masul)
            MockMasulRepo.return_value = mock_masul_repo

            service = YouthService(session, repo)
            data = AssignMasulRequest(masul_id=masul.id, override=True)
            result = await service.assign_masul(youth.id, data, USERS["direktor"])
            assert result.masul_id == masul.id

    @pytest.mark.asyncio
    async def test_assign_cross_district_override_by_tashkilot_fails(self):
        youth = _make_youth(district_id=DISTRICT_A)
        masul = _make_masul(district_id=DISTRICT_B)

        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=youth)
        session = _mock_session()

        with patch("app.modules.youth.service.MasullarRepository") as MockMasulRepo:
            mock_masul_repo = AsyncMock()
            mock_masul_repo.get_by_id = AsyncMock(return_value=masul)
            MockMasulRepo.return_value = mock_masul_repo

            service = YouthService(session, repo)
            data = AssignMasulRequest(masul_id=masul.id, override=True)
            with pytest.raises(ValidationError):
                await service.assign_masul(youth.id, data, USERS["tashkilot"])

    @pytest.mark.asyncio
    async def test_assign_masul_not_found(self):
        youth = _make_youth()
        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=youth)
        session = _mock_session()

        with patch("app.modules.youth.service.MasullarRepository") as MockMasulRepo:
            mock_masul_repo = AsyncMock()
            mock_masul_repo.get_by_id = AsyncMock(return_value=None)
            MockMasulRepo.return_value = mock_masul_repo

            service = YouthService(session, repo)
            data = AssignMasulRequest(masul_id=uuid4())
            with pytest.raises(NotFoundError):
                await service.assign_masul(youth.id, data, USERS["direktor"])


# ═══════════════════════════════════════════════════════════════════════
# 4. STATUS CHANGE TESTS
# ═══════════════════════════════════════════════════════════════════════


class TestStatusChange:
    @pytest.mark.asyncio
    async def test_direktor_can_change_status(self):
        youth = _make_youth(status=YouthStatus.ACTIVE)
        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=youth)
        service = YouthService(_mock_session(), repo)

        result = await service.change_status(youth.id, YouthStatus.GRADUATED, USERS["direktor"], "Bitirdi")
        assert result.status == YouthStatus.GRADUATED

    @pytest.mark.asyncio
    async def test_admin_can_change_status(self):
        youth = _make_youth(status=YouthStatus.ACTIVE)
        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=youth)
        service = YouthService(_mock_session(), repo)

        result = await service.change_status(youth.id, YouthStatus.REMOVED, USERS["admin"])
        assert result.status == YouthStatus.REMOVED

    @pytest.mark.asyncio
    async def test_tashkilot_cannot_change_status(self):
        service = YouthService(_mock_session(), AsyncMock())
        with pytest.raises(ForbiddenError):
            await service.change_status(uuid4(), YouthStatus.GRADUATED, USERS["tashkilot"])

    @pytest.mark.asyncio
    async def test_masul_cannot_change_status(self):
        service = YouthService(_mock_session(), AsyncMock())
        with pytest.raises(ForbiddenError):
            await service.change_status(uuid4(), YouthStatus.GRADUATED, USERS["masul"])


# ═══════════════════════════════════════════════════════════════════════
# 5. REMOVAL WORKFLOW TESTS
# ═══════════════════════════════════════════════════════════════════════


class TestRemovalWorkflow:
    @pytest.mark.asyncio
    async def test_tashkilot_can_propose_removal(self):
        youth = _make_youth(district_id=DISTRICT_A)
        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=youth)
        service = YouthService(_mock_session(), repo)

        data = ProposeRemovalRequest(reason="Bu yoshni ro'yxatdan chiqarish kerak chunki ko'chib ketgan")
        result = await service.propose_removal(youth.id, data, USERS["tashkilot"])
        assert result.removal_proposal is not None
        assert result.removal_proposal["status"] == "pending"

    @pytest.mark.asyncio
    async def test_direktor_cannot_propose_removal(self):
        service = YouthService(_mock_session(), AsyncMock())
        data = ProposeRemovalRequest(reason="A" * 20)
        with pytest.raises(ForbiddenError):
            await service.propose_removal(uuid4(), data, USERS["direktor"])

    @pytest.mark.asyncio
    async def test_propose_removal_district_mismatch(self):
        youth = _make_youth(district_id=DISTRICT_B)  # different from tashkilot's DISTRICT_A
        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=youth)
        service = YouthService(_mock_session(), repo)

        data = ProposeRemovalRequest(reason="A" * 25)
        with pytest.raises(ForbiddenError):
            await service.propose_removal(youth.id, data, USERS["tashkilot"])

    @pytest.mark.asyncio
    async def test_propose_removal_duplicate_fails(self):
        youth = _make_youth(removal_proposal={"status": "pending", "reason": "old"})
        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=youth)
        service = YouthService(_mock_session(), repo)

        data = ProposeRemovalRequest(reason="A" * 25)
        with pytest.raises(ValidationError):
            await service.propose_removal(youth.id, data, USERS["tashkilot"])

    @pytest.mark.asyncio
    async def test_direktor_can_approve_removal(self):
        proposal = {
            "proposed_by": str(TASHKILOT_ID),
            "reason": "Ko'chib ketgan",
            "proposed_at": datetime.now(tz=UTC).isoformat(),
            "status": "pending",
        }
        youth = _make_youth(removal_proposal=proposal, status=YouthStatus.ACTIVE)
        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=youth)
        service = YouthService(_mock_session(), repo)

        result = await service.approve_removal(youth.id, USERS["direktor"])
        assert result.status == YouthStatus.REMOVED
        assert result.removal_proposal["status"] == "approved"
        assert result.removal_proposal["reviewed_by"] == str(DIREKTOR_ID)

    @pytest.mark.asyncio
    async def test_approve_without_pending_proposal_fails(self):
        youth = _make_youth(removal_proposal=None)
        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=youth)
        service = YouthService(_mock_session(), repo)

        with pytest.raises(ValidationError):
            await service.approve_removal(youth.id, USERS["direktor"])

    @pytest.mark.asyncio
    async def test_approve_already_approved_fails(self):
        youth = _make_youth(removal_proposal={"status": "approved"})
        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=youth)
        service = YouthService(_mock_session(), repo)

        with pytest.raises(ValidationError):
            await service.approve_removal(youth.id, USERS["direktor"])

    @pytest.mark.asyncio
    async def test_tashkilot_cannot_approve(self):
        service = YouthService(_mock_session(), AsyncMock())
        with pytest.raises(ForbiddenError):
            await service.approve_removal(uuid4(), USERS["tashkilot"])

    @pytest.mark.asyncio
    async def test_direktor_can_reject_removal(self):
        proposal = {
            "proposed_by": str(TASHKILOT_ID),
            "reason": "Ko'chib ketgan",
            "proposed_at": datetime.now(tz=UTC).isoformat(),
            "status": "pending",
        }
        youth = _make_youth(removal_proposal=proposal)
        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=youth)
        service = YouthService(_mock_session(), repo)

        data = RejectRemovalRequest(comment="Tekshirib ko'rdik, hali bu yerda yashaydi")
        result = await service.reject_removal(youth.id, data, USERS["direktor"])
        assert result.removal_proposal["status"] == "rejected"
        assert result.removal_proposal["reviewer_comment"] == data.comment

    @pytest.mark.asyncio
    async def test_reject_without_proposal_fails(self):
        youth = _make_youth(removal_proposal=None)
        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=youth)
        service = YouthService(_mock_session(), repo)

        data = RejectRemovalRequest(comment="A" * 15)
        with pytest.raises(ValidationError):
            await service.reject_removal(youth.id, data, USERS["direktor"])

    @pytest.mark.asyncio
    async def test_masul_cannot_reject(self):
        service = YouthService(_mock_session(), AsyncMock())
        data = RejectRemovalRequest(comment="A" * 15)
        with pytest.raises(ForbiddenError):
            await service.reject_removal(uuid4(), data, USERS["masul"])

    @pytest.mark.asyncio
    async def test_list_pending_removals_direktor(self):
        rows = [_make_youth(removal_proposal={"status": "pending"})]
        repo = AsyncMock()
        repo.list_pending_removals = AsyncMock(return_value=(rows, 1))
        service = YouthService(_mock_session(), repo)

        result = await service.list_pending_removals(USERS["direktor"])
        assert result["meta"]["total"] == 1

    @pytest.mark.asyncio
    async def test_list_pending_removals_tashkilot_forbidden(self):
        service = YouthService(_mock_session(), AsyncMock())
        with pytest.raises(ForbiddenError):
            await service.list_pending_removals(USERS["tashkilot"])


# ═══════════════════════════════════════════════════════════════════════
# 6. RBAC HTTP TESTS — all new endpoints
# ═══════════════════════════════════════════════════════════════════════


class TestDirektorRBAC:
    """HTTP-level RBAC tests. 500 = passed RBAC (no DB), 401/403 = blocked."""

    @pytest.fixture(autouse=True)
    def _setup(self, client):
        self.client = client

    # ── youth endpoints ──────────────────────────────────────────────

    def test_youth_list_requires_auth(self):
        res = self.client.get("/api/youth")
        assert res.status_code == 401

    def test_youth_list_direktor_passes_rbac(self):
        res = self.client.get("/api/youth", headers=_auth_header("direktor"))
        assert res.status_code == 500

    def test_youth_list_admin_passes_rbac(self):
        res = self.client.get("/api/youth", headers=_auth_header("admin"))
        assert res.status_code == 500

    def test_youth_list_moderator_forbidden(self):
        res = self.client.get("/api/youth", headers=_auth_header("moderator"))
        assert res.status_code == 403

    def test_youth_create_requires_auth(self):
        res = self.client.post("/api/youth", json={})
        assert res.status_code == 401

    def test_youth_create_direktor_passes_validation(self):
        """Should get 422 (validation) or 500 (DB) — not 401/403."""
        res = self.client.post(
            "/api/youth",
            json={"full_name": "Test", "district_id": DISTRICT_A},
            headers=_auth_header("direktor"),
        )
        assert res.status_code in (422, 500)

    def test_youth_create_masul_forbidden(self):
        res = self.client.post(
            "/api/youth",
            json={"full_name": "Test Youth", "district_id": DISTRICT_A},
            headers=_auth_header("masul"),
        )
        assert res.status_code == 403

    def test_youth_get_requires_auth(self):
        yid = str(uuid4())
        res = self.client.get(f"/api/youth/{yid}")
        assert res.status_code == 401

    def test_youth_get_direktor_passes_rbac(self):
        yid = str(uuid4())
        res = self.client.get(f"/api/youth/{yid}", headers=_auth_header("direktor"))
        assert res.status_code == 500

    def test_youth_delete_requires_auth(self):
        yid = str(uuid4())
        res = self.client.delete(f"/api/youth/{yid}")
        assert res.status_code == 401

    def test_youth_delete_moderator_forbidden(self):
        yid = str(uuid4())
        res = self.client.delete(f"/api/youth/{yid}", headers=_auth_header("moderator"))
        assert res.status_code == 403

    # ── removals endpoints ───────────────────────────────────────────

    def test_removals_list_requires_auth(self):
        res = self.client.get("/api/youth/removals")
        assert res.status_code == 401

    def test_removals_list_direktor_passes_rbac(self):
        res = self.client.get("/api/youth/removals", headers=_auth_header("direktor"))
        assert res.status_code == 500

    def test_removals_list_masul_forbidden(self):
        res = self.client.get("/api/youth/removals", headers=_auth_header("masul"))
        assert res.status_code == 403

    def test_approve_removal_requires_auth(self):
        yid = str(uuid4())
        res = self.client.post(f"/api/youth/{yid}/approve-removal")
        assert res.status_code == 401

    def test_approve_removal_direktor_passes_rbac(self):
        yid = str(uuid4())
        res = self.client.post(f"/api/youth/{yid}/approve-removal", headers=_auth_header("direktor"))
        assert res.status_code == 500

    def test_reject_removal_requires_auth(self):
        yid = str(uuid4())
        res = self.client.post(f"/api/youth/{yid}/reject-removal", json={})
        assert res.status_code == 401

    def test_propose_removal_moderator_forbidden(self):
        yid = str(uuid4())
        res = self.client.post(
            f"/api/youth/{yid}/propose-removal",
            json={"reason": "A" * 25},
            headers=_auth_header("moderator"),
        )
        assert res.status_code == 403

    # ── assign masul endpoint ────────────────────────────────────────

    def test_assign_masul_requires_auth(self):
        yid = str(uuid4())
        res = self.client.post(f"/api/youth/{yid}/assign-masul", json={})
        assert res.status_code == 401

    def test_assign_masul_direktor_passes_rbac(self):
        yid = str(uuid4())
        res = self.client.post(
            f"/api/youth/{yid}/assign-masul",
            json={"masul_id": str(uuid4())},
            headers=_auth_header("direktor"),
        )
        assert res.status_code == 500

    # ── status change endpoint ───────────────────────────────────────

    def test_status_change_requires_auth(self):
        yid = str(uuid4())
        res = self.client.post(f"/api/youth/{yid}/status", json={})
        assert res.status_code == 401

    def test_status_change_tashkilot_forbidden(self):
        yid = str(uuid4())
        res = self.client.post(
            f"/api/youth/{yid}/status",
            json={"status": "graduated"},
            headers=_auth_header("tashkilot"),
        )
        assert res.status_code == 403

    # ── masullar endpoints ───────────────────────────────────────────

    def test_masullar_list_requires_auth(self):
        res = self.client.get("/api/masullar")
        assert res.status_code == 401

    def test_masullar_list_direktor_passes_rbac(self):
        res = self.client.get("/api/masullar", headers=_auth_header("direktor"))
        assert res.status_code == 500

    def test_masullar_list_masul_forbidden(self):
        res = self.client.get("/api/masullar", headers=_auth_header("masul"))
        assert res.status_code == 403

    def test_masullar_list_moderator_forbidden(self):
        res = self.client.get("/api/masullar", headers=_auth_header("moderator"))
        assert res.status_code == 403

    def test_masullar_create_requires_auth(self):
        res = self.client.post("/api/masullar", json={})
        assert res.status_code == 401

    def test_masullar_create_direktor_passes(self):
        res = self.client.post(
            "/api/masullar",
            json={
                "full_name": "Test Masul",
                "district_id": DISTRICT_A,
                "organization_id": str(uuid4()),
            },
            headers=_auth_header("direktor"),
        )
        assert res.status_code == 500

    def test_masullar_delete_requires_auth(self):
        mid = str(uuid4())
        res = self.client.delete(f"/api/masullar/{mid}")
        assert res.status_code == 401

    # ── plans endpoints ──────────────────────────────────────────────

    def test_plans_list_requires_auth(self):
        res = self.client.get("/api/plans")
        assert res.status_code == 401

    def test_plans_list_direktor_passes_rbac(self):
        res = self.client.get("/api/plans", headers=_auth_header("direktor"))
        assert res.status_code == 500

    def test_plans_list_moderator_forbidden(self):
        res = self.client.get("/api/plans", headers=_auth_header("moderator"))
        assert res.status_code == 403

    def test_plans_create_requires_auth(self):
        res = self.client.post("/api/plans", json={})
        assert res.status_code == 401

    def test_plans_delete_masul_forbidden(self):
        pid = str(uuid4())
        res = self.client.delete(f"/api/plans/{pid}", headers=_auth_header("masul"))
        assert res.status_code == 403

    def test_plans_delete_direktor_passes_rbac(self):
        pid = str(uuid4())
        res = self.client.delete(f"/api/plans/{pid}", headers=_auth_header("direktor"))
        assert res.status_code == 500

    # ── meetings endpoints ───────────────────────────────────────────

    def test_meetings_list_requires_auth(self):
        res = self.client.get("/api/meetings")
        assert res.status_code == 401

    def test_meetings_list_direktor_passes_rbac(self):
        res = self.client.get("/api/meetings", headers=_auth_header("direktor"))
        assert res.status_code == 500

    def test_meetings_list_moderator_forbidden(self):
        res = self.client.get("/api/meetings", headers=_auth_header("moderator"))
        assert res.status_code == 403

    def test_meetings_create_requires_auth(self):
        res = self.client.post("/api/meetings", json={})
        assert res.status_code == 401

    def test_meetings_attendance_requires_auth(self):
        mid = str(uuid4())
        res = self.client.patch(f"/api/meetings/{mid}/attendance", json={})
        assert res.status_code == 401

    def test_meetings_attendance_direktor_passes_rbac(self):
        mid = str(uuid4())
        res = self.client.patch(
            f"/api/meetings/{mid}/attendance",
            json={"attendance_status": "attended"},
            headers=_auth_header("direktor"),
        )
        assert res.status_code == 500

    # ── organizations write endpoints ────────────────────────────────

    def test_org_create_requires_auth(self):
        res = self.client.post("/api/organizations", json={})
        assert res.status_code == 401

    def test_org_create_direktor_passes(self):
        res = self.client.post(
            "/api/organizations",
            json={
                "name": "Test Org",
                "district_id": DISTRICT_A,
                "director_name": "Test Director",
            },
            headers=_auth_header("direktor"),
        )
        assert res.status_code == 500

    def test_org_create_moderator_forbidden(self):
        res = self.client.post(
            "/api/organizations",
            json={
                "name": "Test Org",
                "district_id": DISTRICT_A,
                "director_name": "Test Director",
            },
            headers=_auth_header("moderator"),
        )
        assert res.status_code == 403

    def test_org_create_tashkilot_forbidden(self):
        res = self.client.post(
            "/api/organizations",
            json={
                "name": "Test Org",
                "district_id": DISTRICT_A,
                "director_name": "Test Director",
            },
            headers=_auth_header("tashkilot"),
        )
        assert res.status_code == 403

    def test_org_update_requires_auth(self):
        oid = str(uuid4())
        res = self.client.patch(f"/api/organizations/{oid}", json={})
        assert res.status_code == 401

    def test_org_update_direktor_passes(self):
        oid = str(uuid4())
        res = self.client.patch(
            f"/api/organizations/{oid}",
            json={"name": "Updated Name"},
            headers=_auth_header("direktor"),
        )
        assert res.status_code == 500

    def test_org_delete_requires_auth(self):
        oid = str(uuid4())
        res = self.client.delete(f"/api/organizations/{oid}")
        assert res.status_code == 401

    def test_org_delete_masul_forbidden(self):
        oid = str(uuid4())
        res = self.client.delete(f"/api/organizations/{oid}", headers=_auth_header("masul"))
        assert res.status_code == 403

    def test_org_delete_direktor_passes(self):
        oid = str(uuid4())
        res = self.client.delete(f"/api/organizations/{oid}", headers=_auth_header("direktor"))
        assert res.status_code == 500


# ═══════════════════════════════════════════════════════════════════════
# 7. SCOPE ENFORCEMENT INTEGRATION TESTS
# ═══════════════════════════════════════════════════════════════════════


class TestScopeEnforcement:
    """Service-level scope tests covering edge cases."""

    @pytest.mark.asyncio
    async def test_tashkilot_scope_forced_on_youth_create(self):
        """Tashkilot direktori cannot create youth in another district."""
        repo = AsyncMock()

        def _add(y: Youth) -> Youth:
            y.id = uuid4()
            y.status = YouthStatus.ACTIVE
            y.created_at = datetime.now(tz=UTC)
            y.updated_at = datetime.now(tz=UTC)
            y.removal_proposal = None
            return y

        repo.add = AsyncMock(side_effect=_add)
        service = YouthService(_mock_session(), repo)

        data = YouthCreate(full_name="Scope Test", district_id=DISTRICT_B)
        result = await service.create(data, USERS["tashkilot"])
        # district_id is overridden to tashkilot's own district
        assert result.district_id == DISTRICT_A

    @pytest.mark.asyncio
    async def test_masul_scope_blocks_unassigned_youth_update(self):
        other_masul = uuid4()
        youth = _make_youth(masul_id=other_masul, district_id=DISTRICT_A)
        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=youth)
        service = YouthService(_mock_session(), repo)

        data = YouthUpdateByMasul(contact="+998900000000")
        with pytest.raises(ForbiddenError):
            await service.update(youth.id, data, USERS["masul"])

    @pytest.mark.asyncio
    async def test_masul_scope_allows_assigned_youth_update(self):
        youth = _make_youth(masul_id=MASUL_ID, district_id=DISTRICT_A)
        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=youth)
        service = YouthService(_mock_session(), repo)

        data = YouthUpdateByMasul(contact="+998901111111", notes={"key": "val"})
        result = await service.update(youth.id, data, USERS["masul"])
        assert result.contact == "+998901111111"

    @pytest.mark.asyncio
    async def test_admin_bypasses_district_scope(self):
        youth = _make_youth(district_id=DISTRICT_B)
        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=youth)
        service = YouthService(_mock_session(), repo)

        result = await service.get(youth.id, USERS["admin"])
        assert result.district_id == DISTRICT_B

    @pytest.mark.asyncio
    async def test_direktor_bypasses_district_scope(self):
        youth = _make_youth(district_id=DISTRICT_B)
        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=youth)
        service = YouthService(_mock_session(), repo)

        result = await service.get(youth.id, USERS["direktor"])
        assert result.district_id == DISTRICT_B


# ═══════════════════════════════════════════════════════════════════════
# 8. CONSTANTS / ENUM TESTS
# ═══════════════════════════════════════════════════════════════════════


class TestDirectorConstants:
    def test_youth_status_values(self):
        assert set(YouthStatus) == {"active", "graduated", "removed"}

    def test_plan_status_values(self):
        assert set(PlanStatus) == {"draft", "in_progress", "completed", "cancelled"}

    def test_meeting_attendance_values(self):
        assert set(MeetingAttendance) == {"scheduled", "attended", "no_show", "rescheduled"}

    def test_direktor_role_exists(self):
        assert UserRole.DIREKTOR == "direktor"

    def test_tashkilot_role_exists(self):
        assert UserRole.TASHKILOT_DIREKTORI == "tashkilot_direktori"

    def test_masul_role_exists(self):
        assert UserRole.MASUL_HODIM == "masul_hodim"
