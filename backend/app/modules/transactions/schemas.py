"""Transactions-ledger request/response schemas (Pydantic v2).

JSON is camelCase on the wire, snake_case in Python (``to_camel`` alias generator). Request and
response models are kept separate. Contracts are in ``docs/transactions.md``.

Money: all amounts serialize as **decimal strings** (``"1500.50"``) via ``Money``; request
amounts (``MoneyInput``) accept a JSON string or number but are validated ``> 0`` and bounded to
``NUMERIC(12,2)`` (≤ 10 integer digits, ≤ 2 fractional). Dates are ``"YYYY-MM-DD"``; the month
filter/summary key is ``"YYYY-MM"``.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Annotated

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    PlainSerializer,
    field_validator,
    model_validator,
)
from pydantic.alias_generators import to_camel

from app.modules.transactions.enums import TransactionDirection

NAME_MAX_LENGTH = 100
ICON_MAX_LENGTH = 50
DESCRIPTION_MAX_LENGTH = 255

# Output: render Decimal as a fixed 2dp string ("500.00") in JSON.
Money = Annotated[
    Decimal,
    PlainSerializer(lambda v: f"{v:.2f}", return_type=str, when_used="json"),
]
# Input: positive, fits NUMERIC(12,2). Pydantic parses string or number into Decimal.
MoneyInput = Annotated[Decimal, Field(gt=0, max_digits=12, decimal_places=2)]


class _CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


def _strip_required(value: str, field_name: str) -> str:
    value = value.strip()
    if not value:
        raise ValueError(f"{field_name} must not be blank.")
    return value


# --- Categories -------------------------------------------------------------------------------


class CategoryCreateRequest(_CamelModel):
    name: str = Field(min_length=1, max_length=NAME_MAX_LENGTH)
    icon: str = Field(min_length=1, max_length=ICON_MAX_LENGTH)

    @field_validator("name")
    @classmethod
    def _strip_name(cls, value: str) -> str:
        return _strip_required(value, "Name")

    @field_validator("icon")
    @classmethod
    def _strip_icon(cls, value: str) -> str:
        return _strip_required(value, "Icon")


class CategoryUpdateRequest(_CamelModel):
    name: str | None = Field(default=None, min_length=1, max_length=NAME_MAX_LENGTH)
    icon: str | None = Field(default=None, min_length=1, max_length=ICON_MAX_LENGTH)

    @field_validator("name")
    @classmethod
    def _strip_name(cls, value: str | None) -> str | None:
        return None if value is None else _strip_required(value, "Name")

    @field_validator("icon")
    @classmethod
    def _strip_icon(cls, value: str | None) -> str | None:
        return None if value is None else _strip_required(value, "Icon")

    @model_validator(mode="after")
    def _at_least_one_field(self) -> "CategoryUpdateRequest":
        if self.name is None and self.icon is None:
            raise ValueError("Provide at least one field to update.")
        return self


class CategoryResponse(_CamelModel):
    id: int
    name: str
    icon: str
    created_at: datetime
    updated_at: datetime


class CategoryRef(_CamelModel):
    """Slim embedded category on a transaction (no flat FK ids in responses)."""

    id: int
    name: str
    icon: str


# --- Transactions -----------------------------------------------------------------------------


class TransactionCreateRequest(_CamelModel):
    direction: TransactionDirection
    amount: MoneyInput
    description: str = Field(min_length=1, max_length=DESCRIPTION_MAX_LENGTH)
    category_id: int | None = None  # required for OUT, forbidden for IN (service-enforced)
    occurred_on: date | None = None  # defaults to today (UTC) in the service

    @field_validator("description")
    @classmethod
    def _strip_description(cls, value: str) -> str:
        return _strip_required(value, "Description")


class TransactionUpdateRequest(_CamelModel):
    direction: TransactionDirection | None = None
    amount: MoneyInput | None = None
    description: str | None = Field(
        default=None, min_length=1, max_length=DESCRIPTION_MAX_LENGTH
    )
    category_id: int | None = None
    occurred_on: date | None = None

    @field_validator("description")
    @classmethod
    def _strip_description(cls, value: str | None) -> str | None:
        return None if value is None else _strip_required(value, "Description")

    @model_validator(mode="after")
    def _at_least_one_field(self) -> "TransactionUpdateRequest":
        if all(
            getattr(self, f) is None
            for f in ("direction", "amount", "description", "category_id", "occurred_on")
        ):
            raise ValueError("Provide at least one field to update.")
        return self


class TransactionResponse(_CamelModel):
    id: int
    direction: TransactionDirection
    amount: Money
    description: str
    category: CategoryRef | None  # null exactly when direction is IN
    occurred_on: date
    created_at: datetime
    updated_at: datetime


# --- Monthly summary --------------------------------------------------------------------------


class CategorySpend(_CamelModel):
    """One category's total expense (OUT) for the summarized month."""

    category: CategoryRef
    total: Money


class MonthSummaryResponse(_CamelModel):
    month: str  # "YYYY-MM", echoed from the query
    total_out: Money
    total_in: Money
    # Only categories with OUT transactions that month, biggest spender first.
    by_category: list[CategorySpend]
