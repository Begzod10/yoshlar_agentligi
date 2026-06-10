from datetime import datetime
from uuid import UUID

from pydantic import EmailStr, Field

from app.core.base_schema import CamelModel, schema_example
from app.core.constants import UserRole


class ProfileUpdate(CamelModel):
    model_config = schema_example(
        {
            "fullName": "Aliyev Sherzod",
            "email": "sherzod@yoshlar.uz",
            "phone": "+998901234567",
            "avatarUrl": "https://cdn.example.com/avatars/abc.jpg",
        }
    )
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=32)
    avatar_url: str | None = Field(default=None, max_length=500)


class ProfileRead(CamelModel):
    id: UUID
    email: EmailStr
    full_name: str
    role: UserRole
    district_id: str | None
    phone: str | None
    avatar_url: str | None
    is_active: bool
    last_login_at: datetime | None
    created_at: datetime


class ChangePasswordRequest(CamelModel):
    model_config = schema_example(
        {"currentPassword": "OldPass123!", "newPassword": "NewSecure456@"}
    )
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=72)


class NotificationSettings(CamelModel):
    model_config = schema_example(
        {
            "emailEnabled": True,
            "smsEnabled": False,
            "pushEnabled": True,
            "youthUpdates": True,
            "planReminders": True,
            "meetingReminders": True,
            "dailyReport": True,
            "weeklyReport": False,
        }
    )
    email_enabled: bool = True
    sms_enabled: bool = False
    push_enabled: bool = True
    youth_updates: bool = True
    plan_reminders: bool = True
    meeting_reminders: bool = True
    daily_report: bool = True
    weekly_report: bool = False


class UserPreferencesRead(CamelModel):
    model_config = schema_example(
        {"theme": "system", "language": "uz", "notifications": {}}
    )
    theme: str
    language: str
    notifications: NotificationSettings


class UserPreferencesUpdate(CamelModel):
    model_config = schema_example({"theme": "dark", "language": "ru"})
    theme: str | None = Field(default=None, pattern="^(light|dark|system)$")
    language: str | None = Field(default=None, pattern="^(uz|ru|en)$")


class SessionRead(CamelModel):
    model_config = schema_example(
        {
            "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "ip": "192.168.1.100",
            "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...",
            "createdAt": "2026-06-01T10:00:00Z",
            "lastActiveAt": "2026-06-02T08:30:00Z",
            "isCurrent": True,
        }
    )
    id: UUID
    ip: str | None
    user_agent: str | None
    created_at: datetime
    last_active_at: datetime
    expires_at: datetime
    is_current: bool
