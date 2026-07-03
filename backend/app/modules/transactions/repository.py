"""Transactions-ledger repository — DB queries only (async). No business logic, no HTTP.

Functions ``flush`` so the service can use generated PKs in the same transaction; the service
owns ``commit``/``rollback``. Monthly summary totals are computed in SQL so they aggregate the
whole month regardless of list pagination — see ``docs/transactions.md``.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.modules.transactions.enums import TransactionDirection
from app.modules.transactions.models import Category, Transaction

_ZERO = Decimal("0")


# --- Categories -------------------------------------------------------------------------------


async def create_category(
    session: AsyncSession, *, user_id: int, name: str, icon: str
) -> Category:
    category = Category(user_id=user_id, name=name, icon=icon)
    session.add(category)
    await session.flush()
    return category


async def get_category(
    session: AsyncSession, *, user_id: int, category_id: int
) -> Category | None:
    """Return the user's category with this id, or ``None`` (scoped to the owner)."""
    result = await session.execute(
        select(Category).where(Category.id == category_id, Category.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def get_category_by_name(
    session: AsyncSession, *, user_id: int, name: str
) -> Category | None:
    """Case-insensitive name lookup within a user (backs the uniqueness pre-check)."""
    result = await session.execute(
        select(Category).where(
            Category.user_id == user_id,
            func.lower(Category.name) == name.lower(),
        )
    )
    return result.scalar_one_or_none()


async def list_categories(session: AsyncSession, *, user_id: int) -> list[Category]:
    """Every category of a user, unpaginated (bounded per-user set), sorted by name."""
    result = await session.execute(
        select(Category)
        .where(Category.user_id == user_id)
        .order_by(func.lower(Category.name), Category.id)
    )
    return list(result.scalars().all())


async def category_has_transactions(session: AsyncSession, *, category_id: int) -> bool:
    result = await session.execute(
        select(func.count())
        .select_from(Transaction)
        .where(Transaction.category_id == category_id)
    )
    return int(result.scalar_one()) > 0


async def delete_category(session: AsyncSession, category: Category) -> None:
    await session.delete(category)
    await session.flush()


# --- Transactions -----------------------------------------------------------------------------


def _filtered_transactions_select(
    *,
    user_id: int,
    month_range: tuple[date, date] | None,
    direction: TransactionDirection | None,
    category_id: int | None,
) -> Select:
    stmt = select(Transaction).where(Transaction.user_id == user_id)
    if month_range is not None:
        start, end = month_range
        stmt = stmt.where(Transaction.occurred_on >= start, Transaction.occurred_on < end)
    if direction is not None:
        stmt = stmt.where(Transaction.direction == direction)
    if category_id is not None:
        stmt = stmt.where(Transaction.category_id == category_id)
    return stmt


async def list_transactions(
    session: AsyncSession,
    *,
    user_id: int,
    offset: int,
    limit: int,
    month_range: tuple[date, date] | None = None,
    direction: TransactionDirection | None = None,
    category_id: int | None = None,
) -> list[Transaction]:
    """Page of transactions (newest first); category eager-loaded."""
    stmt = (
        _filtered_transactions_select(
            user_id=user_id,
            month_range=month_range,
            direction=direction,
            category_id=category_id,
        )
        .options(joinedload(Transaction.category))
        .order_by(Transaction.occurred_on.desc(), Transaction.id.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def count_transactions(
    session: AsyncSession,
    *,
    user_id: int,
    month_range: tuple[date, date] | None = None,
    direction: TransactionDirection | None = None,
    category_id: int | None = None,
) -> int:
    stmt = _filtered_transactions_select(
        user_id=user_id,
        month_range=month_range,
        direction=direction,
        category_id=category_id,
    )
    result = await session.execute(select(func.count()).select_from(stmt.subquery()))
    return int(result.scalar_one())


async def get_transaction(
    session: AsyncSession, *, user_id: int, transaction_id: int
) -> Transaction | None:
    """Return the user's transaction with its category eager-loaded, or ``None``."""
    result = await session.execute(
        select(Transaction)
        .where(Transaction.id == transaction_id, Transaction.user_id == user_id)
        .options(joinedload(Transaction.category))
    )
    return result.scalar_one_or_none()


async def create_transaction(
    session: AsyncSession,
    *,
    user_id: int,
    direction: TransactionDirection,
    amount: Decimal,
    description: str,
    category_id: int | None,
    occurred_on: date,
) -> Transaction:
    transaction = Transaction(
        user_id=user_id,
        direction=direction,
        amount=amount,
        description=description,
        category_id=category_id,
        occurred_on=occurred_on,
    )
    session.add(transaction)
    await session.flush()
    return transaction


async def delete_transaction(session: AsyncSession, transaction: Transaction) -> None:
    await session.delete(transaction)
    await session.flush()


# --- Monthly summary --------------------------------------------------------------------------


async def month_totals(
    session: AsyncSession, *, user_id: int, month_range: tuple[date, date]
) -> dict[TransactionDirection, Decimal]:
    """Total amount per direction for the month: ``{direction: total}``."""
    start, end = month_range
    result = await session.execute(
        select(Transaction.direction, func.sum(Transaction.amount))
        .where(
            Transaction.user_id == user_id,
            Transaction.occurred_on >= start,
            Transaction.occurred_on < end,
        )
        .group_by(Transaction.direction)
    )
    return {row[0]: row[1] for row in result.all()}


async def month_spend_by_category(
    session: AsyncSession, *, user_id: int, month_range: tuple[date, date]
) -> list[tuple[Category, Decimal]]:
    """Per-category expense (OUT) totals for the month, biggest spender first.

    Only categories with at least one OUT transaction that month appear.
    """
    start, end = month_range
    total = func.sum(Transaction.amount).label("total")
    result = await session.execute(
        select(Category, total)
        .join(Transaction, Transaction.category_id == Category.id)
        .where(
            Transaction.user_id == user_id,
            Transaction.direction == TransactionDirection.OUT,
            Transaction.occurred_on >= start,
            Transaction.occurred_on < end,
        )
        .group_by(Category.id)
        .order_by(total.desc(), func.lower(Category.name))
    )
    return [(row[0], row[1]) for row in result.all()]
