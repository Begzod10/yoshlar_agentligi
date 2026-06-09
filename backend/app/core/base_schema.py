"""CamelCase base for every API-facing Pydantic model.

Frontend (TypeScript) speaks camelCase; backend (Python) stays snake_case.
This base bridges the two:

  * `alias_generator=to_camel` — `full_name` -> `fullName` on the wire
  * `populate_by_name=True` — inputs accept BOTH snake_case and camelCase
  * `from_attributes=True` — allow building from SQLAlchemy models
  * `model_dump()` overridden to default `by_alias=True` so JSONB and
    audit-log snapshots stay in camelCase too.

`response_model_by_alias=True` is set globally on every APIRoute by
`app.main.create_app`, so route responses are camelCase automatically.
"""

from typing import Any

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )

    def model_dump(self, **kwargs: Any) -> dict[str, Any]:
        kwargs.setdefault("by_alias", True)
        return super().model_dump(**kwargs)

    def model_dump_json(self, **kwargs: Any) -> str:
        kwargs.setdefault("by_alias", True)
        return super().model_dump_json(**kwargs)


def schema_example(example: dict[str, Any]) -> ConfigDict:
    """ConfigDict with the same base config as `CamelModel` plus one
    Swagger example body. Set on per-schema `model_config` so the example
    lives next to the fields it documents.
    """
    return ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
        json_schema_extra={"example": example},
    )
