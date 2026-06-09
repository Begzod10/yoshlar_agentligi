"""
To'liq demo seed — idempotent (qayta ishlatsa ham xavfsiz).

Nima qo'shadi:
  - 5 ta user (admin, direktor, moderator, 2x tashkilot_direktori, 3x masul_hodim)
  - 4 ta organization (Bekobod x2, Chinoz x2)
  - 5 ta masul (Bekobod x3, Chinoz x2) — userlar bilan bog'liq
  - 10 ta yosh (Bekobod x6, Chinoz x4)
  - 6 ta reja
  - 6 ta uchrashuv

Ishga tushirish:
  python -m scripts.seed_demo

Proekt start bo'lganda avtomatik ishlatish uchun main.py lifespan ga:
  from scripts.seed_demo import seed_all
  await seed_all()
"""

import asyncio
from dataclasses import dataclass, field
from datetime import UTC, date, datetime, timedelta
from uuid import UUID, uuid4

from app.core.constants import (
    MeetingAttendance,
    PlanStatus,
    UserRole,
    YouthStatus,
)
from app.core.logging import configure_logging, get_logger
from app.core.security import hash_password
from app.db.session import async_session_maker
from app.modules.masullar.models import Masul
from app.modules.meetings.models import Meeting
from app.modules.organizations.models import Organization
from app.modules.plans.models import Plan
from app.modules.users.models import User
from app.modules.users.repository import UsersRepository
from app.modules.youth.models import Youth

log = get_logger(__name__)

# ─── konstantalar ────────────────────────────────────────────────────

BEKOBOD = "Bekobod tumani"
CHINOZ = "Chinoz tumani"

NOW = datetime.now(tz=UTC)


# ─── userlar ─────────────────────────────────────────────────────────

@dataclass(frozen=True)
class UserSeed:
    email: str
    password: str
    full_name: str
    role: UserRole
    district_id: str | None
    # masul_hodim bo'lsa keyinchalik masul_id ni bog'lash uchun key
    masul_key: str | None = None


USER_SEEDS: tuple[UserSeed, ...] = (
    UserSeed(
        email="admin@yoshlar.uz",
        password="admin123",
        full_name="Administrator",
        role=UserRole.ADMIN,
        district_id=None,
    ),
    UserSeed(
        email="direktor@yoshlar.uz",
        password="direktor123",
        full_name="Kamoliddin Toshmatov",
        role=UserRole.DIREKTOR,
        district_id=None,
    ),
    UserSeed(
        email="moderator@yoshlar.uz",
        password="moderator123",
        full_name="Maftuna Xasanova",
        role=UserRole.MODERATOR,
        district_id=None,
    ),
    # Tashkilot direktorlari
    UserSeed(
        email="bekobod@yoshlar.uz",
        password="tashkilot123",
        full_name="Sardor Nazarov",
        role=UserRole.TASHKILOT_DIREKTORI,
        district_id=BEKOBOD,
    ),
    UserSeed(
        email="chinoz@yoshlar.uz",
        password="tashkilot123",
        full_name="Dilnoza Yusupova",
        role=UserRole.TASHKILOT_DIREKTORI,
        district_id=CHINOZ,
    ),
    # Mas'ul hodimlar — masul_key orqali Masul bilan bog'lanadi
    UserSeed(
        email="masul1@yoshlar.uz",
        password="masul123",
        full_name="Bobur Rahimov",
        role=UserRole.MASUL_HODIM,
        district_id=BEKOBOD,
        masul_key="masul_bekobod_1",
    ),
    UserSeed(
        email="masul2@yoshlar.uz",
        password="masul123",
        full_name="Zulfiya Mirzayeva",
        role=UserRole.MASUL_HODIM,
        district_id=BEKOBOD,
        masul_key="masul_bekobod_2",
    ),
    UserSeed(
        email="masul3@yoshlar.uz",
        password="masul123",
        full_name="Jasur Qodirov",
        role=UserRole.MASUL_HODIM,
        district_id=CHINOZ,
        masul_key="masul_chinoz_1",
    ),
)


# ─── asosiy seed funksiya ─────────────────────────────────────────────

async def seed_all() -> None:
    configure_logging()
    async with async_session_maker() as session:

        # ── 1. USERLAR ────────────────────────────────────────────────
        log.info("seeding users...")
        users_repo = UsersRepository(session)
        user_map: dict[str, User] = {}  # email → User

        for u in USER_SEEDS:
            existing = await users_repo.get_by_email(u.email)
            if existing:
                log.info("skip user", email=u.email)
                user_map[u.email] = existing
                continue
            user = User(
                email=u.email,
                password_hash=hash_password(u.password),
                full_name=u.full_name,
                role=u.role,
                district_id=u.district_id,
                phone=None,
                is_active=True,
                last_login_at=None,
                deleted_at=None,
            )
            session.add(user)
            await session.flush()
            user_map[u.email] = user
            log.info("created user", email=u.email, role=u.role)

        # ── 2. TASHKILOTLAR ───────────────────────────────────────────
        log.info("seeding organizations...")
        from sqlalchemy import select
        from app.modules.organizations.models import Organization

        async def _get_or_create_org(name: str, district: str, director: str) -> Organization:
            res = await session.execute(
                select(Organization).where(Organization.name == name)
            )
            existing = res.scalar_one_or_none()
            if existing:
                log.info("skip org", name=name)
                return existing
            org = Organization(
                name=name,
                district_id=district,
                type="yoshlar_markazi",
                contact_phone="+998711234567",
                address=f"{district}, Markaziy ko'cha 1",
                director_name=director,
            )
            session.add(org)
            await session.flush()
            log.info("created org", name=name)
            return org

        org_bekobod_1 = await _get_or_create_org(
            "Bekobod yoshlar markazi",
            BEKOBOD,
            "Anvar Xolmatov",
        )
        org_bekobod_2 = await _get_or_create_org(
            "Bekobod kasb-hunar markazi",
            BEKOBOD,
            "Nodira Saidova",
        )
        org_chinoz_1 = await _get_or_create_org(
            "Chinoz yoshlar markazi",
            CHINOZ,
            "Ulugbek Tursunov",
        )
        org_chinoz_2 = await _get_or_create_org(
            "Chinoz innovatsiya markazi",
            CHINOZ,
            "Shahnoza Ergasheva",
        )

        # ── 3. MAS'ULLAR ──────────────────────────────────────────────
        log.info("seeding masullar...")

        async def _get_or_create_masul(
                key: str,
                full_name: str,
                district: str,
                org: Organization,
                phone: str,
                email: str,
        ) -> Masul:
            res = await session.execute(
                select(Masul).where(Masul.email == email)
            )
            existing = res.scalar_one_or_none()
            if existing:
                log.info("skip masul", email=email)
                return existing
            masul = Masul(
                full_name=full_name,
                district_id=district,
                organization_id=org.id,
                phone=phone,
                email=email,
            )
            session.add(masul)
            await session.flush()
            log.info("created masul", name=full_name)
            return masul

        masul_b1 = await _get_or_create_masul(
            "masul_bekobod_1",
            "Bobur Rahimov",
            BEKOBOD,
            org_bekobod_1,
            "+998901111111",
            "bobur@bekobod.uz",
        )
        masul_b2 = await _get_or_create_masul(
            "masul_bekobod_2",
            "Zulfiya Mirzayeva",
            BEKOBOD,
            org_bekobod_2,
            "+998902222222",
            "zulfiya@bekobod.uz",
        )
        masul_b3 = await _get_or_create_masul(
            "masul_bekobod_3",
            "Otabek Hamidov",
            BEKOBOD,
            org_bekobod_1,
            "+998903333333",
            "otabek@bekobod.uz",
        )
        masul_c1 = await _get_or_create_masul(
            "masul_chinoz_1",
            "Jasur Qodirov",
            CHINOZ,
            org_chinoz_1,
            "+998904444444",
            "jasur@chinoz.uz",
        )
        masul_c2 = await _get_or_create_masul(
            "masul_chinoz_2",
            "Malika Xo'jayeva",
            CHINOZ,
            org_chinoz_2,
            "+998905555555",
            "malika@chinoz.uz",
        )

        # Masul user bog'lash — masul_hodim user.id = masul.id bo'lishi kerak emas,
        # lekin tizim youth.masul_id ni masullar.id orqali izlaydi.
        # masul_hodim login qilib, o'z masul_id sini bilishi uchun
        # user profiliga masul_id qo'shing (agar model qo'llab-quvvatlasa).
        # Hozirgi modelda User.masul_id yo'q — shuning uchun youth.masul_id ga
        # bevosita masul.id yoziladi va masul_hodim user'ining id si masul.id
        # ga teng qilinadi alohida logika bilan emas,
        # balki youth.masul_id = masul.id va auth middleware
        # user.id == masul.id check qiladi.
        #
        # MUHIM: masul_hodim user.id ni masul.id ga teng qilish
        # bu proektda CONV: user.id va masul.id alohida, lekin
        # youth.masul_id -> masullar.id -> tekshiruv:
        #   masul_hodim: youth.masul_id == masul.id,
        #   va service: user.id == masul user.id (email orqali)
        #
        # Hozirgi kod tekshiruvi: youth.masul_id == user.id
        # Ya'ni USER.id == MASUL.id bo'lishi kerak!
        # Shuning uchun masul_hodim user larining ID sini masul ID ga o'rnatamiz:

        # masul1@yoshlar.uz → masul_b1 ga bog'lash (id larini sinxronlashtirish)
        _sync_masul_user(user_map["masul1@yoshlar.uz"], masul_b1)
        _sync_masul_user(user_map["masul2@yoshlar.uz"], masul_b2)
        _sync_masul_user(user_map["masul3@yoshlar.uz"], masul_c1)

        await session.flush()

        # ── 4. YOSHLAR ────────────────────────────────────────────────
        log.info("seeding youth...")

        async def _get_or_create_youth(
                full_name: str,
                birth_year: int,
                district: str,
                masul: Masul,
                org: Organization,
                category: str,
                contact: str,
                status: YouthStatus = YouthStatus.ACTIVE,
        ) -> Youth:
            res = await session.execute(
                select(Youth).where(
                    Youth.full_name == full_name,
                    Youth.district_id == district,
                )
            )
            existing = res.scalar_one_or_none()
            if existing:
                log.info("skip youth", name=full_name)
                return existing
            youth = Youth(
                full_name=full_name,
                birth_date=date(birth_year, 3, 15),
                district_id=district,
                masul_id=masul.id,
                organization_id=org.id,
                status=status,
                category=category,
                contact=contact,
                notes=None,
                removal_proposal=None,
            )
            session.add(youth)
            await session.flush()
            log.info("created youth", name=full_name)
            return youth

        # Bekobod — masul_b1 ga biriktirilgan yoshlar (masul1@yoshlar.uz ko'radi)
        y_b1_1 = await _get_or_create_youth(
            "Aziz Karimov", 2001, BEKOBOD, masul_b1, org_bekobod_1,
            "talaba", "+998901110001",
        )
        y_b1_2 = await _get_or_create_youth(
            "Nilufar Tosheva", 2002, BEKOBOD, masul_b1, org_bekobod_1,
            "ishchi", "+998901110002",
        )
        y_b1_3 = await _get_or_create_youth(
            "Sherzod Qosimov", 2000, BEKOBOD, masul_b1, org_bekobod_2,
            "tadbirkor", "+998901110003",
        )

        # Bekobod — masul_b2 ga biriktirilgan (masul2@yoshlar.uz ko'radi)
        y_b2_1 = await _get_or_create_youth(
            "Kamola Usmonova", 2003, BEKOBOD, masul_b2, org_bekobod_2,
            "talaba", "+998902220001",
        )
        y_b2_2 = await _get_or_create_youth(
            "Jahongir Normatov", 2001, BEKOBOD, masul_b2, org_bekobod_1,
            "ishchi", "+998902220002",
        )

        # Bekobod — masul_b3 ga biriktirilgan (tashkilot direktori ko'radi, masul_hodim emas)
        y_b3_1 = await _get_or_create_youth(
            "Barno Xasanova", 2002, BEKOBOD, masul_b3, org_bekobod_2,
            "talaba", "+998903330001",
        )

        # Chinoz — masul_c1 ga biriktirilgan (masul3@yoshlar.uz ko'radi)
        y_c1_1 = await _get_or_create_youth(
            "Ulmas Ergashev", 2001, CHINOZ, masul_c1, org_chinoz_1,
            "talaba", "+998904440001",
        )
        y_c1_2 = await _get_or_create_youth(
            "Sarvinoz Abdullayeva", 2003, CHINOZ, masul_c1, org_chinoz_1,
            "ishchi", "+998904440002",
        )

        # Chinoz — masul_c2 ga biriktirilgan
        y_c2_1 = await _get_or_create_youth(
            "Timur Xoliqov", 2000, CHINOZ, masul_c2, org_chinoz_2,
            "tadbirkor", "+998905550001",
        )
        y_c2_2 = await _get_or_create_youth(
            "Madina Sobirov", 2002, CHINOZ, masul_c2, org_chinoz_2,
            "talaba", "+998905550002",
        )

        # ── 5. REJALAR ────────────────────────────────────────────────
        log.info("seeding plans...")

        async def _get_or_create_plan(
                youth: Youth,
                masul: Masul,
                title: str,
                goal: str,
                status: PlanStatus,
                progress: int,
                days_ago: int = 60,
        ) -> Plan:
            res = await session.execute(
                select(Plan).where(
                    Plan.youth_id == youth.id,
                    Plan.title == title,
                )
            )
            existing = res.scalar_one_or_none()
            if existing:
                log.info("skip plan", title=title)
                return existing
            plan = Plan(
                youth_id=youth.id,
                masul_id=masul.id,
                title=title,
                goal=goal,
                milestones=[
                    {"title": "Boshlang'ich baholash", "due": "2025-02-01", "done": True},
                    {"title": "O'rta bosqich", "due": "2025-05-01",
                     "done": status in (PlanStatus.COMPLETED, PlanStatus.IN_PROGRESS)},
                    {"title": "Yakuniy baholash", "due": "2025-10-01", "done": status == PlanStatus.COMPLETED},
                ],
                status=status,
                progress=progress,
                start_date=date.today() - timedelta(days=days_ago),
                end_date=date.today() + timedelta(days=180),
            )
            session.add(plan)
            await session.flush()
            log.info("created plan", title=title)
            return plan

        await _get_or_create_plan(
            y_b1_1, masul_b1, "Kasb egallash rejasi",
            "Dasturlashni o'rganish va ish topish",
            PlanStatus.IN_PROGRESS, 45,
        )
        await _get_or_create_plan(
            y_b1_2, masul_b1, "Ish joyi topish rejasi",
            "Faol ish topish va kasbiy rivojlanish",
            PlanStatus.COMPLETED, 100,
        )
        await _get_or_create_plan(
            y_b2_1, masul_b2, "Ta'lim rejasi",
            "Universitetga kirish tayyorgarlik",
            PlanStatus.DRAFT, 0,
        )
        await _get_or_create_plan(
            y_b3_1, masul_b3, "Tadbirkorlik rejasi",
            "Kichik biznes ochish",
            PlanStatus.IN_PROGRESS, 30,
        )
        await _get_or_create_plan(
            y_c1_1, masul_c1, "Malaka oshirish rejasi",
            "Ingliz tili va IT ko'nikmalarini rivojlantirish",
            PlanStatus.IN_PROGRESS, 55,
        )
        await _get_or_create_plan(
            y_c2_1, masul_c2, "Ijtimoiy faollik rejasi",
            "Yoshlar tashkilotida faol qatnashish",
            PlanStatus.DRAFT, 0,
        )

        # ── 6. UCHRASHUVLAR ───────────────────────────────────────────
        log.info("seeding meetings...")

        async def _get_or_create_meeting(
                youth: Youth,
                masul: Masul,
                days_offset: int,
                meeting_type: str,
                agenda: str,
                attendance: MeetingAttendance,
                notes: str | None = None,
        ) -> Meeting:
            scheduled = NOW + timedelta(days=days_offset)
            res = await session.execute(
                select(Meeting).where(
                    Meeting.youth_id == youth.id,
                    Meeting.agenda == agenda,
                )
            )
            existing = res.scalar_one_or_none()
            if existing:
                log.info("skip meeting", agenda=agenda[:30])
                return existing
            meeting = Meeting(
                youth_id=youth.id,
                masul_id=masul.id,
                scheduled_at=scheduled,
                type=meeting_type,
                location="Yoshlar markazi, 1-xona" if meeting_type == "in_person" else "Zoom",
                agenda=agenda,
                attendance_status=attendance,
                attendance_notes=notes,
                attachments=None,
            )
            session.add(meeting)
            await session.flush()
            log.info("created meeting", agenda=agenda[:40])
            return meeting

        # O'tgan uchrashuvlar (attended)
        await _get_or_create_meeting(
            y_b1_1, masul_b1, -14, "in_person",
            "Reja borishi va qiyinchiliklar haqida suhbat",
            MeetingAttendance.ATTENDED,
            "Yaxshi suhbat bo'ldi. Keyingi oy uchun vazifalar belgilandi.",
        )
        await _get_or_create_meeting(
            y_b1_2, masul_b1, -7, "phone",
            "Ish joyi topish borasida yangiliklar",
            MeetingAttendance.ATTENDED,
            "Ish topdi! Tasdiqlash kutilmoqda.",
        )
        await _get_or_create_meeting(
            y_b2_1, masul_b2, -3, "in_person",
            "Ta'lim rejasini boshlash va dastlabki baholash",
            MeetingAttendance.NO_SHOW,
            "Kelmadi, telefon orqali bog'lanildi.",
        )

        # Kelgusi uchrashuvlar (scheduled)
        await _get_or_create_meeting(
            y_b1_1, masul_b1, 3, "in_person",
            "Dasturlash kursi hisoboti va keyingi bosqich",
            MeetingAttendance.SCHEDULED,
        )
        await _get_or_create_meeting(
            y_c1_1, masul_c1, 5, "online",
            "IT ko'nikmalari bo'yicha progress tekshiruvi",
            MeetingAttendance.SCHEDULED,
        )
        await _get_or_create_meeting(
            y_c2_1, masul_c2, 1, "in_person",
            "Ijtimoiy faollik rejasini boshlash uchrashvi",
            MeetingAttendance.SCHEDULED,
        )

        await session.commit()
        log.info("✅ seed_demo completed successfully")

        # ── Xulosa ────────────────────────────────────────────────────
        _print_summary()


def _sync_masul_user(user: User, masul: Masul) -> None:
    """
    tizim tekshiruvi: youth.masul_id == user.id
    Shuning uchun masul.id == user.id bo'lishi shart.
    Masul YANGI yaratilganda (id hali DB ga yozilmagan) user.id ga o'rnatiladi.
    Agar masul allaqachon user.id ga teng bo'lsa — hech narsa qilmaydi.
    """
    if masul.id != user.id:
        masul.id = user.id
        log.info("synced masul.id = user.id", email=user.email, id=str(user.id))


def _print_summary() -> None:
    print("""
╔══════════════════════════════════════════════════════════════╗
║              DEMO MA'LUMOTLAR MUVAFFAQIYATLI YUKLANDI        ║
╠══════════════════════════════════════════════════════════════╣
║  LOGIN MA'LUMOTLARI                                          ║
╠══════════════════════════════════════════════════════════════╣
║  admin@yoshlar.uz          /  admin123      (Admin)          ║
║  direktor@yoshlar.uz       /  direktor123   (Direktor)       ║
║  moderator@yoshlar.uz      /  moderator123  (Moderator)      ║
║  bekobod@yoshlar.uz        /  tashkilot123  (T.Direktor-Bek) ║
║  chinoz@yoshlar.uz         /  tashkilot123  (T.Direktor-Chi) ║
║  masul1@yoshlar.uz         /  masul123      (Masul - Bek x3) ║
║  masul2@yoshlar.uz         /  masul123      (Masul - Bek x2) ║
║  masul3@yoshlar.uz         /  masul123      (Masul - Chi x2) ║
╠══════════════════════════════════════════════════════════════╣
║  Bekobod: 4 tashkilot direktori ko'radi                      ║
║  masul1 ko'radi: Aziz, Nilufar, Sherzod (3 ta yosh)         ║
║  masul2 ko'radi: Kamola, Jahongir (2 ta yosh)                ║
║  masul3 ko'radi: Ulmas, Sarvinoz (2 ta yosh, Chinoz)        ║
╚══════════════════════════════════════════════════════════════╝
""")


if __name__ == "__main__":
    asyncio.run(seed_all())


async def wipe_demo_data() -> None:
    """
    Barcha demo ma'lumotlarni o'chiradi — faqat dev muhitida.
    Tartibi: meetings → plans → youth → masullar → organizations → users
    (FK constraint tartibida)
    """
    configure_logging()
    from sqlalchemy import delete

    async with async_session_maker() as session:
        # Demo emaillar ro'yxati
        demo_emails = [u.email for u in USER_SEEDS]

        await session.execute(delete(Meeting))
        await session.execute(delete(Plan))
        await session.execute(delete(Youth))
        await session.execute(delete(Masul))
        await session.execute(delete(Organization))
        from sqlalchemy import delete as del_
        from app.modules.users.models import User as UserModel
        from sqlalchemy import or_
        for email in demo_emails:
            await session.execute(
                del_(UserModel).where(UserModel.email == email)
            )
        await session.commit()
        log.info("✅ wipe_demo_data completed")