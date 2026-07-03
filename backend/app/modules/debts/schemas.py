"""Debt-ledger request/response schemas (Pydantic v2).

JSON is camelCase on the wire, snake_case in Python (``to_camel`` alias generator). Request and
response models are kept separate. Contracts are in ``docs/debts.md``.

Money: all amounts serialize as **decimal strings** (``"1500.50"``) via ``Money``; request
amounts (``MoneyInput``) accept a JSON string or number but are validated ``> 0`` and bounded to
``NUMERIC(12,2)`` (≤ 10 integer digits, ≤ 2 fractional). Dates are ``"YYYY-MM-DD"``.
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

from app.modules.debts.enums import DebtDirection, DebtStatus

NAME_MAX_LENGTH = 100
DESCRIPTION_MAX_LENGTH = 255
NOTE_MAX_LENGTH = 255

# Output: render Decimal as a fixed 2dp string ("500.00", "-1250.50") in JSON.
Money = Annotated[
    Decimal,
    PlainSerializer(lambda v: f"{v:.2f}", return_type=str, when_used="json"),
]
# Input: positive, fits NUMERIC(12,2). Pydantic parses string or number into Decimal.
MoneyInput = Annotated[Decimal, Field(gt=0, max_digits=12, decimal_places=2)]


class _CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class _CamelORMModel(_CamelModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )


def _strip_optional(value: str | None) -> str | None:
    """Trim a free-text field; collapse an empty/whitespace-only string to ``None``."""
    if value is None:
        return None
    value = value.strip()
    return value or None


# --- Counterparties -------------------------------------------------------------------------


class CounterpartyCreateRequest(_CamelModel):
    name: str = Field(min_length=1, max_length=NAME_MAX_LENGTH)
    note: str | None = Field(default=None, max_length=NOTE_MAX_LENGTH)

    @field_validator("name")
    @classmethod
    def _strip_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Name must not be blank.")
        return value

    @field_validator("note")
    @classmethod
    def _strip_note(cls, value: str | None) -> str | None:
        return _strip_optional(value)


class CounterpartyUpdateRequest(_CamelModel):
    name: str | None = Field(default=None, min_length=1, max_length=NAME_MAX_LENGTH)
    note: str | None = Field(default=None, max_length=NOTE_MAX_LENGTH)

    @field_validator("name")
    @classmethod
    def _strip_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("Name must not be blank.")
        return value

    @field_validator("note")
    @classmethod
    def _strip_note(cls, value: str | None) -> str | None:
        return _strip_optional(value)

    @model_validator(mode="after")
    def _at_least_one_field(self) -> "CounterpartyUpdateRequest":
        if self.name is None and self.note is None:
            raise ValueError("Provide at least one field to update.")
        return self


class CounterpartyResponse(_CamelModel):
    id: int
    name: str
    note: str | None
    balance: Money  # signed net outstanding (excl. written-off); 0 with no debts
    created_at: datetime
    updated_at: datetime


# --- Repayments -----------------------------------------------------------------------------


class RepaymentCreateRequest(_CamelModel):
    amount: MoneyInput
    paid_on: date | None = None
    note: str | None = Field(default=None, max_length=NOTE_MAX_LENGTH)

    @field_validator("note")
    @classmethod
    def _strip_note(cls, value: str | None) -> str | None:
        return _strip_optional(value)


class RepaymentUpdateRequest(_CamelModel):
    amount: MoneyInput | None = None
    paid_on: date | None = None
    note: str | None = Field(default=None, max_length=NOTE_MAX_LENGTH)

    @field_validator("note")
    @classmethod
    def _strip_note(cls, value: str | None) -> str | None:
        return _strip_optional(value)

    @model_validator(mode="after")
    def _at_least_one_field(self) -> "RepaymentUpdateRequest":
        if self.amount is None and self.paid_on is None and self.note is None:
            raise ValueError("Provide at least one field to update.")
        return self


class RepaymentResponse(_CamelORMModel):
    id: int
    amount: Money
    paid_on: date
    note: str | None
    created_at: datetime
    updated_at: datetime


# --- Debts ----------------------------------------------------------------------------------


class CounterpartyRef(_CamelModel):
    """Slim embedded counterparty on a debt (no flat FK ids in responses)."""

    id: int
    name: str


class DebtCreateRequest(_CamelModel):
    counterparty_id: int
    direction: DebtDirection
    principal_amount: MoneyInput
    description: str | None = Field(default=None, max_length=DESCRIPTION_MAX_LENGTH)
    incurred_on: date | None = None  # defaults to today (UTC) in the service

    @field_validator("description")
    @classmethod
    def _strip_description(cls, value: str | None) -> str | None:
        return _strip_optional(value)


class DebtUpdateRequest(_CamelModel):
    counterparty_id: int | None = None
    direction: DebtDirection | None = None
    principal_amount: MoneyInput | None = None
    description: str | None = Field(default=None, max_length=DESCRIPTION_MAX_LENGTH)
    incurred_on: date | None = None

    @field_validator("description")
    @classmethod
    def _strip_description(cls, value: str | None) -> str | None:
        return _strip_optional(value)

    @model_validator(mode="after")
    def _at_least_one_field(self) -> "DebtUpdateRequest":
        if all(
            getattr(self, f) is None
            for f in ("counterparty_id", "direction", "principal_amount",
                      "description", "incurred_on")
        ):
            raise ValueError("Provide at least one field to update.")
        return self


class DebtSummaryResponse(_CamelModel):
    id: int
    counterparty: CounterpartyRef
    direction: DebtDirection
    principal_amount: Money
    outstanding: Money
    status: DebtStatus
    description: str | None
    incurred_on: date
    written_off_at: date | None
    created_at: datetime
    updated_at: datetime


class DebtDetailResponse(DebtSummaryResponse):
    repayments: list[RepaymentResponse]


class DebtSummaryTotals(_CamelModel):
    total_i_owe: Money
    total_owed_to_me: Money
    net: Money
