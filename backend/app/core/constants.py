from enum import StrEnum
from typing import Final

# Mirrors lib/types.ts → TOSHKENT_VILOYATI_DISTRICTS. Keep both lists in sync.
TOSHKENT_VILOYATI_DISTRICTS: Final[tuple[str, ...]] = (
    "Bekobod tumani",
    "Bo'ka tumani",
    "Bo'stonliq tumani",
    "Chinoz tumani",
    "Qibray tumani",
    "Ohangaron tumani",
    "Oqqo'rg'on tumani",
    "Parkent tumani",
    "Piskent tumani",
    "Quyi Chirchiq tumani",
    "Yangiyo'l tumani",
    "Yuqori Chirchiq tumani",
    "Zangiota tumani",
    "Toshkent tumani",
)


class UserRole(StrEnum):
    ADMIN = "admin"
    DIREKTOR = "direktor"
    TASHKILOT_DIREKTORI = "tashkilot_direktori"
    MASUL_HODIM = "masul_hodim"
    MODERATOR = "moderator"


DISTRICT_SCOPED_ROLES: Final[frozenset[UserRole]] = frozenset(
    {UserRole.TASHKILOT_DIREKTORI, UserRole.MASUL_HODIM}
)

CROSS_DISTRICT_ROLES: Final[frozenset[UserRole]] = frozenset(
    {UserRole.ADMIN, UserRole.DIREKTOR, UserRole.MODERATOR}
)


class YouthStatus(StrEnum):
    ACTIVE = "active"
    GRADUATED = "graduated"
    REMOVED = "removed"


class PlanStatus(StrEnum):
    DRAFT = "draft"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class MeetingAttendance(StrEnum):
    SCHEDULED = "scheduled"
    ATTENDED = "attended"
    NO_SHOW = "no_show"
    RESCHEDULED = "rescheduled"
