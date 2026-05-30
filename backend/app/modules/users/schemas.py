from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from app.core.constants import CROSS_DISTRICT_ROLES, DISTRICT_SCOPED_ROLES, UserRole


class UserBase(BaseModel):
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
    password: str = Field(min_length=8, max_length=72)


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    phone: str | None = None
    is_active: bool | None = None


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    full_name: str
    role: UserRole
    district_id: str | None
    phone: str | None
    is_active: bool
    last_login_at: datetime | None
    created_at: datetime
