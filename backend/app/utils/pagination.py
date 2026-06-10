from typing import Generic, TypeVar

from pydantic import BaseModel, Field
from app.core.base_schema import CamelModel

T = TypeVar("T")


class PageParams(CamelModel):
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=1000)

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.limit


class Page(CamelModel, Generic[T]):
    data: list[T]
    total: int
    page: int
    limit: int

    @classmethod
    def build(cls, *, items: list[T], total: int, params: PageParams) -> "Page[T]":
        return cls(data=items, total=total, page=params.page, limit=params.limit)
