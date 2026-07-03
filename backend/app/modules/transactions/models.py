"""Transactions-ledger ORM models: ``Category``, ``Transaction``.

Design in ``docs/transactions.md``. ``id``/``created_at``/``updated_at`` come from
``IdTimestampMixin``.

- ``categories`` — reusable per-user spending categories. Name is unique per user,
  case-insensitively, via the functional unique index ``uq_categories_user_name`` on
  ``(user_id, lower(name))``. ``icon`` is an opaque frontend icon token (e.g. ``"cart"``) the
  backend stores but never interprets.
- ``transactions`` — single ledger entries. ``direction`` is a native PG enum; ``amount`` is
  ``NUMERIC(12,2)`` (DH, no currency column). The category↔direction rule (``OUT`` requires a
  category, ``IN`` must have none) is enforced in the service, with the DB CHECK
  ``ck_transactions_category_direction`` as a backstop.

FK delete behaviour: ``user_id`` cascades (cleaning up a user removes their rows);
``transactions.category_id`` deliberately has **no** cascade — deleting a category that still
has transactions is blocked in the service (and the FK restricts it as a DB backstop).
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
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IdTimestampMixin
from app.modules.transactions.enums import TransactionDirection

# Shared money column type: DH amounts, up to 10 integer digits + 2 fractional. asdecimal keeps
# values as Decimal in Python (no float rounding).
_MONEY = Numeric(12, 2, asdecimal=True)


class Category(Base, IdTimestampMixin):
    __tablename__ = "categories"

    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    icon: Mapped[str] = mapped_column(String(50), nullable=False)

    transactions: Mapped[list["Transaction"]] = relationship(back_populates="category")

    __table_args__ = (
        # Case-insensitive uniqueness per user — one "Groceries" per account.
        Index(
            "uq_categories_user_name",
            "user_id",
            func.lower(name),
            unique=True,
        ),
    )


class Transaction(Base, IdTimestampMixin):
    __tablename__ = "transactions"

    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("categories.id"),  # no cascade: deletion is blocked in the service
        nullable=True,
        index=True,
    )
    direction: Mapped[TransactionDirection] = mapped_column(
        Enum(TransactionDirection, name="transaction_direction"), nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(_MONEY, nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    occurred_on: Mapped[date] = mapped_column(Date, nullable=False)

    category: Mapped["Category | None"] = relationship(back_populates="transactions")

    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_transactions_amount_positive"),
        # Backstop for the service-enforced rule: expenses carry a category, income never does.
        CheckConstraint(
            "(direction = 'OUT' AND category_id IS NOT NULL)"
            " OR (direction = 'IN' AND category_id IS NULL)",
            name="ck_transactions_category_direction",
        ),
    )
