from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.core.base_schema import CamelModel, schema_example


class MasulBase(CamelModel):
    full_name: str = Field(min_length=2, max_length=255)
    district_id: str = Field(min_length=1, max_length=64)
    organization_id: UUID | None = None
    phone: str | None = Field(default=None, max_length=32)
    position: str | None = Field(default=None, max_length=128)


class MasulCreate(MasulBase):
    model_config = schema_example(
        {
            "fullName": "Aliyev Bobur Anvarovich",
            "districtId": "Bekobod tumani",
            "organizationId": "3ef0d8f4-2d03-4ca3-93c5-a444a69ea1ff",
            "phone": "+998901234567",
            "position": "O'qituvchi",
        }
    )


class MasulUpdate(CamelModel):
    model_config = schema_example(
        {"phone": "+998905554433", "position": "Tarbiyaviy ishlar bo'yicha mas'ul"}
    )
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    organization_id: UUID | None = None
    phone: str | None = Field(default=None, max_length=32)
    position: str | None = Field(default=None, max_length=128)


class MasulRead(CamelModel):
    model_config = schema_example(
        {
            "id": "eb33f00f-cfd4-4800-a4a2-260f0a26eefb",
            "fullName": "Aliyev Bobur Anvarovich",
            "districtId": "Bekobod tumani",
            "organizationId": "3ef0d8f4-2d03-4ca3-93c5-a444a69ea1ff",
            "phone": "+998901234567",
            "position": "O'qituvchi",
            "createdAt": "2026-05-28T07:33:27.947031Z",
        }
    )
    id: UUID
    full_name: str
    district_id: str
    organization_id: UUID | None
    phone: str | None
    position: str | None
    created_at: datetime
