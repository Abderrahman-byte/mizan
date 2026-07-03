"""Transactions-ledger service — business logic. Calls the repository; owns the transaction
commit (except ``seed_default_categories``, which joins its caller's transaction).

No direct SQL and no HTTP concerns here (see ``docs/conventions.md`` §1).

Partial-update semantics: an omitted (``None``) optional field means "leave unchanged". The
category↔direction rule (expenses carry a category, income never does) is enforced here on both
create and update; flipping a transaction to ``IN`` clears its category automatically, flipping
to ``OUT`` requires a ``categoryId`` in the same request.
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from loguru import logger
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.transactions import engine, repository
from app.modules.transactions.enums import TransactionDirection
from app.modules.transactions.exceptions import (
    CategoryDirectionMismatchException,
    CategoryHasTransactionsException,
    CategoryNameTakenException,
    CategoryNotFoundException,
    TransactionNotFoundException,
)
from app.modules.transactions.models import Category, Transaction
from app.modules.transactions.schemas import (
    CategoryCreateRequest,
    CategoryRef,
    CategoryResponse,
    CategorySpend,
    CategoryUpdateRequest,
    MonthSummaryResponse,
    TransactionCreateRequest,
    TransactionResponse,
    TransactionUpdateRequest,
)

_ZERO = Decimal("0")

# The pre-created category set every account starts with (decision 2026-07-03): seeded at
# registration and backfilled for pre-existing users by the create-tables migration (which
# duplicates this list — keep the two in sync). Icons are frontend icon tokens.
DEFAULT_CATEGORIES: list[tuple[str, str]] = [
    ("Rent", "home"),
    ("Groceries", "cart"),
    ("Utilities", "bolt"),
    ("Phone & net", "wifi"),
    ("Transport & gas", "car"),
    ("Family support", "heart"),
    ("Eating out", "fork"),
    ("Coffee", "cup"),
    ("Cigarettes", "smoke"),
    ("Gym", "dumbbell"),
    ("Dating", "spark"),
    ("Clothes", "shirt"),
    ("Subscriptions", "play"),
    ("Savings", "piggy"),
]


def _today():
    return datetime.now(timezone.utc).date()


# --- Response builders ------------------------------------------------------------------------


def _category_response(category: Category) -> CategoryResponse:
    return CategoryResponse(
        id=category.id,
        name=category.name,
        icon=category.icon,
        created_at=category.created_at,
        updated_at=category.updated_at,
    )


def _category_ref(category: Category | None) -> CategoryRef | None:
    if category is None:
        return None
    return CategoryRef(id=category.id, name=category.name, icon=category.icon)


def _transaction_response(transaction: Transaction) -> TransactionResponse:
    return TransactionResponse(
        id=transaction.id,
        direction=transaction.direction,
        amount=transaction.amount,
        description=transaction.description,
        category=_category_ref(transaction.category),
        occurred_on=transaction.occurred_on,
        created_at=transaction.created_at,
        updated_at=transaction.updated_at,
    )


# --- Internal loaders -------------------------------------------------------------------------


async def _require_category(
    session: AsyncSession, user_id: int, category_id: int
) -> Category:
    category = await repository.get_category(
        session, user_id=user_id, category_id=category_id
    )
    if category is None:
        raise CategoryNotFoundException()
    return category


async def _require_transaction(
    session: AsyncSession, user_id: int, transaction_id: int
) -> Transaction:
    transaction = await repository.get_transaction(
        session, user_id=user_id, transaction_id=transaction_id
    )
    if transaction is None:
        raise TransactionNotFoundException()
    return transaction


# --- Categories -------------------------------------------------------------------------------


async def seed_default_categories(session: AsyncSession, user_id: int) -> None:
    """Create the default category set for a brand-new user.

    Called by the auth service inside the registration transaction (documented cross-module
    call, decision 2026-07-03) — so it flushes but does **not** commit; registration stays
    atomic. Assumes the user has no categories yet (they were just created).
    """
    for name, icon in DEFAULT_CATEGORIES:
        await repository.create_category(session, user_id=user_id, name=name, icon=icon)


async def create_category(
    session: AsyncSession, user_id: int, data: CategoryCreateRequest
) -> CategoryResponse:
    if await repository.get_category_by_name(session, user_id=user_id, name=data.name):
        raise CategoryNameTakenException()
    try:
        category = await repository.create_category(
            session, user_id=user_id, name=data.name, icon=data.icon
        )
    except IntegrityError:
        await session.rollback()
        raise CategoryNameTakenException()
    await session.commit()
    logger.bind(user_id=user_id, category_id=category.id).info("category created")
    return _category_response(category)


async def list_categories(
    session: AsyncSession, user_id: int
) -> list[CategoryResponse]:
    categories = await repository.list_categories(session, user_id=user_id)
    return [_category_response(c) for c in categories]


async def get_category(
    session: AsyncSession, user_id: int, category_id: int
) -> CategoryResponse:
    category = await _require_category(session, user_id, category_id)
    return _category_response(category)


async def update_category(
    session: AsyncSession, user_id: int, category_id: int, data: CategoryUpdateRequest
) -> CategoryResponse:
    category = await _require_category(session, user_id, category_id)

    if data.name is not None and data.name.lower() != category.name.lower():
        existing = await repository.get_category_by_name(
            session, user_id=user_id, name=data.name
        )
        if existing is not None and existing.id != category.id:
            raise CategoryNameTakenException()
    if data.name is not None:
        category.name = data.name
    if data.icon is not None:
        category.icon = data.icon

    try:
        await session.flush()
    except IntegrityError:
        await session.rollback()
        raise CategoryNameTakenException()
    await session.commit()
    await session.refresh(category)  # pick up server-side updated_at

    logger.bind(user_id=user_id, category_id=category.id).info("category updated")
    return _category_response(category)


async def delete_category(
    session: AsyncSession, user_id: int, category_id: int
) -> None:
    category = await _require_category(session, user_id, category_id)
    if await repository.category_has_transactions(session, category_id=category.id):
        raise CategoryHasTransactionsException()
    await repository.delete_category(session, category)
    await session.commit()
    logger.bind(user_id=user_id, category_id=category_id).info("category deleted")


# --- Transactions -----------------------------------------------------------------------------


async def _resolve_category_for_direction(
    session: AsyncSession,
    user_id: int,
    direction: TransactionDirection,
    category_id: int | None,
) -> Category | None:
    """Apply the category↔direction rule and (for OUT) validate ownership.

    Returns the loaded ``Category`` to attach (``None`` for IN). OUT without a category, or IN
    with one, → 409 ``CATEGORY_DIRECTION_MISMATCH``; an OUT category that isn't the user's → 404.
    """
    if direction is TransactionDirection.IN:
        if category_id is not None:
            raise CategoryDirectionMismatchException()
        return None
    if category_id is None:
        raise CategoryDirectionMismatchException()
    return await _require_category(session, user_id, category_id)


async def create_transaction(
    session: AsyncSession, user_id: int, data: TransactionCreateRequest
) -> TransactionResponse:
    category = await _resolve_category_for_direction(
        session, user_id, data.direction, data.category_id
    )
    transaction = await repository.create_transaction(
        session,
        user_id=user_id,
        direction=data.direction,
        amount=data.amount,
        description=data.description,
        category_id=category.id if category is not None else None,
        occurred_on=data.occurred_on or _today(),
    )
    await session.commit()
    transaction = await _require_transaction(session, user_id, transaction.id)
    logger.bind(user_id=user_id, transaction_id=transaction.id).info(
        "transaction created"
    )
    return _transaction_response(transaction)


async def list_transactions(
    session: AsyncSession,
    user_id: int,
    *,
    offset: int,
    limit: int,
    month: str | None = None,
    direction: TransactionDirection | None = None,
    category_id: int | None = None,
) -> tuple[list[TransactionResponse], int]:
    month_range = engine.month_bounds(month) if month is not None else None
    total = await repository.count_transactions(
        session,
        user_id=user_id,
        month_range=month_range,
        direction=direction,
        category_id=category_id,
    )
    transactions = await repository.list_transactions(
        session,
        user_id=user_id,
        offset=offset,
        limit=limit,
        month_range=month_range,
        direction=direction,
        category_id=category_id,
    )
    return [_transaction_response(t) for t in transactions], total


async def get_transaction(
    session: AsyncSession, user_id: int, transaction_id: int
) -> TransactionResponse:
    transaction = await _require_transaction(session, user_id, transaction_id)
    return _transaction_response(transaction)


async def update_transaction(
    session: AsyncSession,
    user_id: int,
    transaction_id: int,
    data: TransactionUpdateRequest,
) -> TransactionResponse:
    transaction = await _require_transaction(session, user_id, transaction_id)

    effective_direction = data.direction or transaction.direction
    if effective_direction is TransactionDirection.IN:
        # Income carries no category. Sending one is a rule violation; when merely flipping
        # OUT→IN, the existing category is cleared automatically.
        if data.category_id is not None:
            raise CategoryDirectionMismatchException()
        transaction.category = None
    else:
        effective_category_id = (
            data.category_id if data.category_id is not None else transaction.category_id
        )
        # Assign the relationship (not the FK column): the loaded ``category`` attribute
        # would otherwise go stale and leak the old value into the response.
        transaction.category = await _resolve_category_for_direction(
            session, user_id, effective_direction, effective_category_id
        )

    transaction.direction = effective_direction
    if data.amount is not None:
        transaction.amount = data.amount
    if data.description is not None:
        transaction.description = data.description
    if data.occurred_on is not None:
        transaction.occurred_on = data.occurred_on

    await session.commit()
    transaction = await _require_transaction(session, user_id, transaction_id)
    logger.bind(user_id=user_id, transaction_id=transaction_id).info(
        "transaction updated"
    )
    return _transaction_response(transaction)


async def delete_transaction(
    session: AsyncSession, user_id: int, transaction_id: int
) -> None:
    transaction = await _require_transaction(session, user_id, transaction_id)
    await repository.delete_transaction(session, transaction)
    await session.commit()
    logger.bind(user_id=user_id, transaction_id=transaction_id).info(
        "transaction deleted"
    )


# --- Monthly summary --------------------------------------------------------------------------


async def month_summary(
    session: AsyncSession, user_id: int, month: str
) -> MonthSummaryResponse:
    month_range = engine.month_bounds(month)
    totals = await repository.month_totals(
        session, user_id=user_id, month_range=month_range
    )
    by_category = await repository.month_spend_by_category(
        session, user_id=user_id, month_range=month_range
    )
    return MonthSummaryResponse(
        month=month,
        total_out=totals.get(TransactionDirection.OUT, _ZERO),
        total_in=totals.get(TransactionDirection.IN, _ZERO),
        by_category=[
            CategorySpend(category=_category_ref(category), total=total)
            for category, total in by_category
        ],
    )
