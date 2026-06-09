from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.core.base_schema import CamelModel, schema_example


class OrganizationBase(CamelModel):
    name: str = Field(min_length=2, max_length=255)
    district_id: str = Field(min_length=1, max_length=64)
    type: str | None = Field(default=None, max_length=64)
    contact_phone: str | None = Field(default=None, max_length=32)
    address: str | None = Field(default=None, max_length=255)
    head_name: str | None = Field(default=None, max_length=255)


class OrganizationCreate(OrganizationBase):
    model_config = schema_example(
        {
            "name": "Bekobod tumani 5-maktab",
            "districtId": "Bekobod tumani",
            "type": "maktab",
            "contactPhone": "+998 71 123 45 67",
            "address": "Bekobod sh., Mustaqillik ko'chasi 12",
            "headName": "Karimov Sherzod Akmaljonovich",
        }
    )


class OrganizationUpdate(CamelModel):
    model_config = schema_example(
        {"headName": "Yangi rahbar Aliyev Bobur", "contactPhone": "+998 71 222 33 44"}
    )

    name: str | None = Field(default=None, min_length=2, max_length=255)
    district_id: str | None = Field(default=None, min_length=1, max_length=64)
    type: str | None = Field(default=None, max_length=64)
    contact_phone: str | None = Field(default=None, max_length=32)
    address: str | None = Field(default=None, max_length=255)
    head_name: str | None = Field(default=None, max_length=255)


class OrganizationRead(CamelModel):
    model_config = schema_example(
        {
            "id": "3ef0d8f4-2d03-4ca3-93c5-a444a69ea1ff",
            "name": "Bekobod tumani 5-maktab",
            "districtId": "Bekobod tumani",
            "type": "maktab",
            "contactPhone": "+998 71 123 45 67",
            "address": "Bekobod sh., Mustaqillik ko'chasi 12",
            "headName": "Karimov Sherzod",
            "createdAt": "2026-05-28T07:33:27.865629Z",
        }
    )

    id: UUID
    name: str
    district_id: str
    type: str | None
    contact_phone: str | None
    address: str | None
    head_name: str | None
    created_at: datetime
