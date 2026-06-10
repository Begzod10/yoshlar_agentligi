from pydantic import EmailStr

from app.core.base_schema import CamelModel, schema_example
from app.modules.users.schemas import UserRead


class LoginRequest(CamelModel):
    model_config = schema_example(
        {"email": "admin@yoshlar.uz", "password": "admin123"}
    )
    email: EmailStr
    password: str


class TokenResponse(CamelModel):
    model_config = schema_example(
        {
            "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "tokenType": "bearer",
            "user": {
                "id": "f6ba5d45-3cbe-424b-ae33-1c40a6a75b4f",
                "email": "admin@yoshlar.uz",
                "fullName": "Administrator",
                "role": "admin",
                "districtId": None,
                "phone": None,
                "isActive": True,
                "lastLoginAt": "2026-05-28T07:32:07.727445Z",
                "createdAt": "2026-05-20T07:32:07.727445Z",
            },
        }
    )
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserRead


class RefreshRequest(CamelModel):
    model_config = schema_example({"refreshToken": "eyJhbGciOi..."})
    refresh_token: str
