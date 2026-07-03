"""Standard response envelopes (success + error)."""

from __future__ import annotations

from typing import Generic, TypeVar

from pydantic import BaseModel

from app.core.pagination import PaginationMeta

DataT = TypeVar("DataT")


class ErrorDetail(BaseModel):
    code: str
    message: str
    field: str | None = None


class ErrorBody(BaseModel):
    code: str
    message: str
    details: list[ErrorDetail] | dict | str | None = None


class ErrorResponse(BaseModel):
    error: ErrorBody


class SuccessResponse(BaseModel, Generic[DataT]):
    data: DataT


class PaginatedResponse(BaseModel, Generic[DataT]):
    """List envelope: ``data`` array + a ``pagination`` meta block (see ``conventions.md`` §2)."""

    data: list[DataT]
    pagination: PaginationMeta
