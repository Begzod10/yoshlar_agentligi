from datetime import datetime
from uuid import UUID

from pydantic import EmailStr, Field, model_validator

from app.core.base_schema import CamelModel, schema_example
from app.core.constants import CROSS_DISTRICT_ROLES, DISTRICT_SCOPED_ROLES, UserRole


class UserBase(CamelModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    role: UserRole
    district_id: str | None = None
    phone: str | None = None

    @model_validator(mode="after")
    def _validate_district_role(self) -> "UserBase":
        if self.role in DISTRICT_SCOPED_ROLES and not self.district_id:
            raise ValueError("district_id_required_for_role")
        if self.role in CROSS_DISTRICT_ROLES and self.district_id is not None:
            raise ValueError("district_id_forbidden_for_role")
        return self


class UserCreate(UserBase):
    model_config = schema_example(
        {
            "email": "sherzod@yoshlar.uz",
            "fullName": "Aliyev Sherzod Anvarovich",
            "role": "tashkilot_direktori",
            "districtId": "Bekobod tumani",
            "phone": "+998901234567",
            "password": "Yangi!Parol2026",
        }
    )
    password: str = Field(min_length=8, max_length=72)


class UserUpdate(CamelModel):
    model_config = schema_example(
        {"fullName": "Aliyev Sherzod", "phone": "+998901112233", "isActive": True}
    )
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    phone: str | None = None
    is_active: bool | None = None


class UserRead(CamelModel):
    model_config = schema_example(
        {
            "id": "f6ba5d45-3cbe-424b-ae33-1c40a6a75b4f",
            "email": "admin@yoshlar.uz",
            "fullName": "Administrator",
            "role": "admin",
            "districtId": None,
            "phone": None,
            "isActive": True,
            "lastLoginAt": "2026-05-28T07:32:07.727445Z",
            "createdAt": "2026-05-20T07:32:07.727445Z",
        }
    )

    id: UUID
    email: EmailStr
    full_name: str
    role: UserRole
    district_id: str | None
    phone: str | None
    avatar_url: str | None = None
    is_active: bool
    last_login_at: datetime | None
    created_at: datetime
