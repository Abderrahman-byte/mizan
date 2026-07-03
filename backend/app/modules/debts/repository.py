"""Debt-ledger repository — DB queries only (async). No business logic, no HTTP.

Functions ``flush`` so the service can use generated PKs in the same transaction; the service
owns ``commit``/``rollback``. Derived ``outstanding`` is computed in SQL (via a per-debt repayment
-total subquery) so list/summary/balance reads stay single-query and paginate correctly — see
``docs/debts.md``.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy import Select, case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.modules.debts.enums import DebtDirection, DebtStatus
from app.modules.debts.models import Counterparty, Debt, Repayment

_ZERO = Decimal("0")


# --- Counterparties -------------------------------------------------------------------------


async def create_counterparty(
    session: AsyncSession, *, user_id: int, name: str, note: str | None
) -> Counterparty:
    counterparty = Counterparty(user_id=user_id, name=name, note=note)
    session.add(counterparty)
    await session.flush()
    return counterparty


async def get_counterparty(
    session: AsyncSession, *, user_id: int, counterparty_id: int
) -> Counterparty | None:
    """Return the user's counterparty with this id, or ``None`` (scoped to the owner)."""
    result = await session.execute(
        select(Counterparty).where(
            Counterparty.id == counterparty_id, Counterparty.user_id == user_id
        )
    )
    return result.scalar_one_or_none()


async def get_counterparty_by_name(
    session: AsyncSession, *, user_id: int, name: str
) -> Counterparty | None:
    """Case-insensitive name lookup within a user (backs the uniqueness pre-check)."""
    result = await session.execute(
        select(Counterparty).where(
            Counterparty.user_id == user_id,
            func.lower(Counterparty.name) == name.lower(),
        )
    )
    return result.scalar_one_or_none()


async def list_counterparties(
    session: AsyncSession, *, user_id: int, offset: int, limit: int
) -> list[Counterparty]:
    result = await session.execute(
        select(Counterparty)
        .where(Counterparty.user_id == user_id)
        .order_by(func.lower(Counterparty.name), Counterparty.id)
        .offset(offset)
        .limit(limit)
    )
    return list(result.scalars().all())


async def list_all_counterparties(
    session: AsyncSession, *, user_id: int
) -> list[Counterparty]:
    """Every counterparty of a user, unpaginated (backs the import name-matching)."""
    result = await session.execute(
        select(Counterparty).where(Counterparty.user_id == user_id)
    )
    return list(result.scalars().all())


async def list_counterparties_with_debts(
    session: AsyncSession, *, user_id: int
) -> list[Counterparty]:
    """Every counterparty with debts + repayments eager-loaded (backs the ledger export)."""
    result = await session.execute(
        select(Counterparty)
        .where(Counterparty.user_id == user_id)
        .options(selectinload(Counterparty.debts).selectinload(Debt.repayments))
        .order_by(func.lower(Counterparty.name), Counterparty.id)
    )
    return list(result.scalars().all())


async def count_counterparties(session: AsyncSession, *, user_id: int) -> int:
    result = await session.execute(
        select(func.count())
        .select_from(Counterparty)
        .where(Counterparty.user_id == user_id)
    )
    return int(result.scalar_one())


async def counterparty_balances(
    session: AsyncSession, *, user_id: int, counterparty_ids: list[int]
) -> dict[int, Decimal]:
    """Signed net outstanding per counterparty (excl. written-off debts).

    Returns ``{counterparty_id: balance}``; ids with no active debts are simply absent (the
    service defaults them to 0).
    """
    if not counterparty_ids:
        return {}

    repaid = _repaid_subquery()
    outstanding = Debt.principal_amount - func.coalesce(repaid.c.paid, _ZERO)
    signed = case(
        (Debt.direction == DebtDirection.I_OWE, -outstanding), else_=outstanding
    )
    result = await session.execute(
        select(Debt.counterparty_id, func.sum(signed))
        .select_from(Debt)
        .outerjoin(repaid, repaid.c.debt_id == Debt.id)
        .where(
            Debt.user_id == user_id,
            Debt.counterparty_id.in_(counterparty_ids),
            Debt.written_off_at.is_(None),
        )
        .group_by(Debt.counterparty_id)
    )
    return {row[0]: row[1] for row in result.all()}


async def counterparty_has_debts(session: AsyncSession, *, counterparty_id: int) -> bool:
    result = await session.execute(
        select(func.count())
        .select_from(Debt)
        .where(Debt.counterparty_id == counterparty_id)
    )
    return int(result.scalar_one()) > 0


async def delete_counterparty(session: AsyncSession, counterparty: Counterparty) -> None:
    await session.delete(counterparty)
    await session.flush()


# --- Debts ----------------------------------------------------------------------------------


def _repaid_subquery():
    """Per-debt repayment totals: ``(debt_id, paid)``."""
    return (
        select(
            Repayment.debt_id.label("debt_id"),
            func.coalesce(func.sum(Repayment.amount), _ZERO).label("paid"),
        )
        .group_by(Repayment.debt_id)
        .subquery()
    )


def _filtered_debts_select(
    *,
    user_id: int,
    counterparty_id: int | None,
    direction: DebtDirection | None,
    status: DebtStatus | None,
) -> tuple[Select, object]:
    """Build the filtered ``debts`` select joined to repayment totals.

    Returns ``(select(Debt, outstanding), outstanding_expr)``. Status filtering happens here in
    SQL so pagination counts the post-filter rows.
    """
    repaid = _repaid_subquery()
    paid = func.coalesce(repaid.c.paid, _ZERO)
    outstanding = (Debt.principal_amount - paid).label("outstanding")

    stmt = (
        select(Debt, outstanding)
        .select_from(Debt)
        .outerjoin(repaid, repaid.c.debt_id == Debt.id)
        .where(Debt.user_id == user_id)
    )
    if counterparty_id is not None:
        stmt = stmt.where(Debt.counterparty_id == counterparty_id)
    if direction is not None:
        stmt = stmt.where(Debt.direction == direction)

    if status is DebtStatus.WRITTEN_OFF:
        stmt = stmt.where(Debt.written_off_at.is_not(None))
    elif status is DebtStatus.OPEN:
        stmt = stmt.where(Debt.written_off_at.is_(None), paid == _ZERO)
    elif status is DebtStatus.SETTLED:
        stmt = stmt.where(
            Debt.written_off_at.is_(None), Debt.principal_amount - paid <= _ZERO
        )
    elif status is DebtStatus.PARTIALLY_PAID:
        stmt = stmt.where(
            Debt.written_off_at.is_(None),
            paid > _ZERO,
            Debt.principal_amount - paid > _ZERO,
        )

    return stmt, outstanding


async def list_debts(
    session: AsyncSession,
    *,
    user_id: int,
    offset: int,
    limit: int,
    counterparty_id: int | None = None,
    direction: DebtDirection | None = None,
    status: DebtStatus | None = None,
) -> list[tuple[Debt, Decimal]]:
    """Page of debts (newest first) as ``(debt, outstanding)``; counterparty eager-loaded."""
    stmt, _ = _filtered_debts_select(
        user_id=user_id,
        counterparty_id=counterparty_id,
        direction=direction,
        status=status,
    )
    stmt = (
        stmt.options(joinedload(Debt.counterparty))
        .order_by(Debt.incurred_on.desc(), Debt.id.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await session.execute(stmt)
    return [(row[0], row[1]) for row in result.all()]


async def count_debts(
    session: AsyncSession,
    *,
    user_id: int,
    counterparty_id: int | None = None,
    direction: DebtDirection | None = None,
    status: DebtStatus | None = None,
) -> int:
    stmt, _ = _filtered_debts_select(
        user_id=user_id,
        counterparty_id=counterparty_id,
        direction=direction,
        status=status,
    )
    result = await session.execute(
        select(func.count()).select_from(stmt.subquery())
    )
    return int(result.scalar_one())


async def get_debt(
    session: AsyncSession, *, user_id: int, debt_id: int
) -> Debt | None:
    """Return the user's debt with counterparty + repayments eager-loaded, or ``None``."""
    result = await session.execute(
        select(Debt)
        .where(Debt.id == debt_id, Debt.user_id == user_id)
        .options(joinedload(Debt.counterparty), selectinload(Debt.repayments))
    )
    return result.unique().scalar_one_or_none()


async def create_debt(
    session: AsyncSession,
    *,
    user_id: int,
    counterparty_id: int,
    direction: DebtDirection,
    principal_amount: Decimal,
    description: str | None,
    incurred_on: date,
    written_off_at: date | None = None,
) -> Debt:
    debt = Debt(
        user_id=user_id,
        counterparty_id=counterparty_id,
        direction=direction,
        principal_amount=principal_amount,
        description=description,
        incurred_on=incurred_on,
        written_off_at=written_off_at,
    )
    session.add(debt)
    await session.flush()
    return debt


async def delete_debt(session: AsyncSession, debt: Debt) -> None:
    await session.delete(debt)
    await session.flush()


async def summary_totals(
    session: AsyncSession, *, user_id: int
) -> dict[DebtDirection, Decimal]:
    """Total outstanding per direction (excl. written-off): ``{direction: total}``."""
    repaid = _repaid_subquery()
    outstanding = Debt.principal_amount - func.coalesce(repaid.c.paid, _ZERO)
    result = await session.execute(
        select(Debt.direction, func.sum(outstanding))
        .select_from(Debt)
        .outerjoin(repaid, repaid.c.debt_id == Debt.id)
        .where(Debt.user_id == user_id, Debt.written_off_at.is_(None))
        .group_by(Debt.direction)
    )
    return {row[0]: row[1] for row in result.all()}


# --- Repayments -----------------------------------------------------------------------------


async def create_repayment(
    session: AsyncSession,
    *,
    debt_id: int,
    amount: Decimal,
    paid_on: date,
    note: str | None,
) -> Repayment:
    repayment = Repayment(debt_id=debt_id, amount=amount, paid_on=paid_on, note=note)
    session.add(repayment)
    await session.flush()
    return repayment


async def get_repayment(
    session: AsyncSession, *, debt_id: int, repayment_id: int
) -> Repayment | None:
    result = await session.execute(
        select(Repayment).where(
            Repayment.id == repayment_id, Repayment.debt_id == debt_id
        )
    )
    return result.scalar_one_or_none()


async def list_repayments(
    session: AsyncSession, *, debt_id: int
) -> list[Repayment]:
    result = await session.execute(
        select(Repayment)
        .where(Repayment.debt_id == debt_id)
        .order_by(Repayment.paid_on, Repayment.id)
    )
    return list(result.scalars().all())


async def delete_repayment(session: AsyncSession, repayment: Repayment) -> None:
    await session.delete(repayment)
    await session.flush()
