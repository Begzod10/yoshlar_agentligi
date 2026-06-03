from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field

from app.core.base_schema import CamelModel, schema_example


class ProposeRemoval(CamelModel):
    model_config = schema_example(
        {
            "reason": "Yosh boshqa shaharga ko'chib ketdi va o'tgan 6 oy mobaynida hech qanday aloqaga chiqmagan."
        }
    )
    reason: str = Field(min_length=20, max_length=2000)


class RejectRemoval(CamelModel):
    model_config = schema_example(
        {"comment": "Qo'shimcha tekshiruv talab etiladi, mas'ul bilan suhbatlashing."}
    )
    comment: str = Field(min_length=10, max_length=2000)


class RemovalProposal(CamelModel):
    status: Literal["pending"] = "pending"
    reason: str
    proposed_by: UUID
    proposed_at: datetime


class PendingRemovalRead(CamelModel):
    model_config = schema_example(
        {
            "youthId": "6d41303a-29eb-4589-b80f-a60f27367e71",
            "fullName": "Karimov Ali",
            "districtId": "Bekobod tumani",
            "proposal": {
                "status": "pending",
                "reason": "Yosh boshqa shaharga ko'chib ketdi...",
                "proposedBy": "a4f73ada-6f14-4167-a0a2-e5e92a45f3e9",
                "proposedAt": "2026-05-28T07:33:28.112297+00:00",
            },
        }
    )
    youth_id: UUID
    full_name: str
    district_id: str
    proposal: dict
