"""Debt-ledger ORM models: ``Counterparty``, ``Debt``, ``Repayment``.

Design in ``docs/debts.md``. ``id``/``created_at``/``updated_at`` come from ``IdTimestampMixin``.

- ``counterparties`` — reusable per-user contacts. Name is unique per user, case-insensitively,
  via the functional unique index ``uq_counterparties_user_name`` on ``(user_id, lower(name))``.
- ``debts`` — discrete loans. ``direction`` is a native PG enum; ``principal_amount`` is
  ``NUMERIC(12,2)`` (DH, no currency column). ``written_off_at`` (nullable date) marks a
  forgiven/cancelled debt. ``outstanding``/``status`` are derived, never stored.
- ``repayments`` — partial repayments of one debt. Over-repayment is allowed by design, so no
  amount ceiling is enforced.

FK delete behaviour: ``user_id`` and ``debt_id`` cascade (cleaning up a user/debt removes its
rows); ``debts.counterparty_id`` deliberately has **no** cascade — deleting a counterparty that
still has debts is blocked in the service (and the FK restricts it as a DB backstop).
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Date,
    Enum,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IdTimestampMixin
from app.modules.debts.enums import DebtDirection

# Shared money column type: DH amounts, up to 10 integer digits + 2 fractional. asdecimal keeps
# values as Decimal in Python (no float rounding).
_MONEY = Numeric(12, 2, asdecimal=True)


class Counterparty(Base, IdTimestampMixin):
    __tablename__ = "counterparties"

    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    debts: Mapped[list["Debt"]] = relationship(back_populates="counterparty")

    __table_args__ = (
        # Case-insensitive uniqueness per user — one "Karim" per account.
        Index(
            "uq_counterparties_user_name",
            "user_id",
            func.lower(name),
            unique=True,
        ),
    )


class Debt(Base, IdTimestampMixin):
    __tablename__ = "debts"

    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    counterparty_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("counterparties.id"),  # no cascade: deletion is blocked in the service
        nullable=False,
        index=True,
    )
    direction: Mapped[DebtDirection] = mapped_column(
        Enum(DebtDirection, name="debt_direction"), nullable=False
    )
    principal_amount: Mapped[Decimal] = mapped_column(_MONEY, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    incurred_on: Mapped[date] = mapped_column(Date, nullable=False)
    written_off_at: Mapped[date | None] = mapped_column(Date, nullable=True)

    counterparty: Mapped["Counterparty"] = relationship(back_populates="debts")
    repayments: Mapped[list["Repayment"]] = relationship(
        back_populates="debt",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        CheckConstraint("principal_amount > 0", name="ck_debts_principal_positive"),
    )


class Repayment(Base, IdTimestampMixin):
    __tablename__ = "repayments"

    debt_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("debts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    amount: Mapped[Decimal] = mapped_column(_MONEY, nullable=False)
    paid_on: Mapped[date] = mapped_column(Date, nullable=False)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)

    debt: Mapped["Debt"] = relationship(back_populates="repayments")

    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_repayments_amount_positive"),
    )
