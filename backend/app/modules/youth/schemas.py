from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import Field

from app.core.base_schema import CamelModel, schema_example
from app.core.constants import YouthStatus


class YouthBase(CamelModel):
    full_name: str = Field(min_length=2, max_length=255)
    district_id: str = Field(min_length=1, max_length=64)
    masul_id: UUID | None = None
    organization_id: UUID | None = None
    category: str | None = Field(default=None, max_length=128)
    contact: str | None = Field(default=None, max_length=64)
    date_of_birth: date | None = None
    address: str | None = Field(default=None, max_length=255)
    notes: str | None = Field(default=None, max_length=2000)


class YouthCreate(YouthBase):
    model_config = schema_example(
        {
            "fullName": "Karimov Ali Akmaljonovich",
            "districtId": "Bekobod tumani",
            "masulId": "eb33f00f-cfd4-4800-a4a2-260f0a26eefb",
            "organizationId": "3ef0d8f4-2d03-4ca3-93c5-a444a69ea1ff",
            "contact": "+998905554433",
            "dateOfBirth": "2005-06-15",
            "address": "Bekobod sh., Yangi yo'l ko'chasi 7",
            "notes": "Faol yosh, sport bilan shug'ullanadi",
        }
    )


class YouthUpdate(CamelModel):
    model_config = schema_example(
        {
            "contact": "+998 99 111 22 33",
            "address": "Bekobod sh., Mustaqillik 15",
            "notes": "Oilada vaziyat o'zgardi, qo'shimcha kuzatuv talab etiladi",
        }
    )
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    masul_id: UUID | None = None
    organization_id: UUID | None = None
    category: str | None = Field(default=None, max_length=128)
    contact: str | None = Field(default=None, max_length=64)
    date_of_birth: date | None = None
    address: str | None = Field(default=None, max_length=255)
    notes: str | None = Field(default=None, max_length=2000)


class YouthUpdateByMasul(CamelModel):
    """Restricted update payload for masul_hodim role."""

    model_config = schema_example(
        {"contact": "+998 99 111 22 33", "notes": "Telefon raqami yangilandi"}
    )
    contact: str | None = Field(default=None, max_length=64)
    notes: str | None = Field(default=None, max_length=2000)


class YouthStatusUpdate(CamelModel):
    model_config = schema_example({"status": "graduated"})
    status: YouthStatus


class YouthAssignMasul(CamelModel):
    model_config = schema_example(
        {"masulId": "eb33f00f-cfd4-4800-a4a2-260f0a26eefb"}
    )
    masul_id: UUID


class YouthRead(CamelModel):
    model_config = schema_example(
        {
            "id": "6d41303a-29eb-4589-b80f-a60f27367e71",
            "fullName": "Karimov Ali Akmaljonovich",
            "districtId": "Bekobod tumani",
            "masulId": "eb33f00f-cfd4-4800-a4a2-260f0a26eefb",
            "organizationId": "3ef0d8f4-2d03-4ca3-93c5-a444a69ea1ff",
            "status": "active",
            "contact": "+998905554433",
            "dateOfBirth": "2005-06-15",
            "address": "Bekobod sh., Yangi yo'l 7",
            "notes": "Faol yosh, sport bilan shug'ullanadi",
            "removalProposal": None,
            "createdAt": "2026-05-28T07:33:28.030501Z",
        }
    )
    id: UUID
    full_name: str
    district_id: str
    masul_id: UUID | None
    organization_id: UUID | None
    status: YouthStatus
    category: str | None
    contact: str | None
    date_of_birth: date | None
    address: str | None
    notes: str | None
    removal_proposal: dict[str, Any] | None
    created_at: datetime
