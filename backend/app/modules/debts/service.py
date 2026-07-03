"""Debt-ledger service — business logic. Calls the repository; owns the transaction commit.

No direct SQL and no HTTP concerns here (see ``docs/conventions.md`` §1). Derived ``outstanding``/
``status``/``balance`` come from ``engine`` (pure) or from SQL aggregates in the repository.

Partial-update semantics: an omitted (``None``) optional field means "leave unchanged" — so a
free-text ``description``/``note`` cannot be cleared back to null via PATCH (by design, kept
simple). Over-repayment is allowed, so repayments are never bounded against the principal.
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from loguru import logger
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.debts import engine, repository
from app.modules.debts.enums import DebtDirection, DebtStatus
from app.modules.debts.exceptions import (
    CounterpartyHasDebtsException,
    CounterpartyNameTakenException,
    CounterpartyNotFoundException,
    DebtNotFoundException,
    RepaymentNotFoundException,
)
from app.modules.debts.models import Counterparty, Debt
from app.modules.debts.schemas import (
    CounterpartyCreateRequest,
    CounterpartyRef,
    CounterpartyResponse,
    CounterpartyUpdateRequest,
    DebtCreateRequest,
    DebtDetailResponse,
    DebtSummaryResponse,
    DebtSummaryTotals,
    DebtUpdateRequest,
    RepaymentCreateRequest,
    RepaymentResponse,
    RepaymentUpdateRequest,
)

_ZERO = Decimal("0")


def _today():
    return datetime.now(timezone.utc).date()


# --- Response builders ----------------------------------------------------------------------


def _counterparty_response(
    counterparty: Counterparty, balance: Decimal
) -> CounterpartyResponse:
    return CounterpartyResponse(
        id=counterparty.id,
        name=counterparty.name,
        note=counterparty.note,
        balance=balance,
        created_at=counterparty.created_at,
        updated_at=counterparty.updated_at,
    )


def _summary_response(debt: Debt, outstanding: Decimal) -> DebtSummaryResponse:
    return DebtSummaryResponse(
        id=debt.id,
        counterparty=CounterpartyRef(id=debt.counterparty.id, name=debt.counterparty.name),
        direction=debt.direction,
        principal_amount=debt.principal_amount,
        outstanding=outstanding,
        status=engine.compute_status(
            debt.principal_amount, outstanding, debt.written_off_at
        ),
        description=debt.description,
        incurred_on=debt.incurred_on,
        written_off_at=debt.written_off_at,
        created_at=debt.created_at,
        updated_at=debt.updated_at,
    )


def _detail_response(debt: Debt) -> DebtDetailResponse:
    repayments = sorted(debt.repayments, key=lambda r: (r.paid_on, r.id))
    repaid_total = sum((r.amount for r in repayments), _ZERO)
    outstanding = engine.outstanding(debt.principal_amount, repaid_total)
    return DebtDetailResponse(
        id=debt.id,
        counterparty=CounterpartyRef(id=debt.counterparty.id, name=debt.counterparty.name),
        direction=debt.direction,
        principal_amount=debt.principal_amount,
        outstanding=outstanding,
        status=engine.compute_status(
            debt.principal_amount, outstanding, debt.written_off_at
        ),
        description=debt.description,
        incurred_on=debt.incurred_on,
        written_off_at=debt.written_off_at,
        created_at=debt.created_at,
        updated_at=debt.updated_at,
        repayments=[RepaymentResponse.model_validate(r) for r in repayments],
    )


# --- Internal loaders -----------------------------------------------------------------------


async def _require_debt(session: AsyncSession, user_id: int, debt_id: int) -> Debt:
    debt = await repository.get_debt(session, user_id=user_id, debt_id=debt_id)
    if debt is None:
        raise DebtNotFoundException()
    return debt


async def _require_counterparty(
    session: AsyncSession, user_id: int, counterparty_id: int
) -> Counterparty:
    counterparty = await repository.get_counterparty(
        session, user_id=user_id, counterparty_id=counterparty_id
    )
    if counterparty is None:
        raise CounterpartyNotFoundException()
    return counterparty


# --- Counterparties -------------------------------------------------------------------------


async def create_counterparty(
    session: AsyncSession, user_id: int, data: CounterpartyCreateRequest
) -> CounterpartyResponse:
    if await repository.get_counterparty_by_name(
        session, user_id=user_id, name=data.name
    ):
        raise CounterpartyNameTakenException()
    try:
        counterparty = await repository.create_counterparty(
            session, user_id=user_id, name=data.name, note=data.note
        )
    except IntegrityError:
        await session.rollback()
        raise CounterpartyNameTakenException()
    await session.commit()
    logger.bind(user_id=user_id, counterparty_id=counterparty.id).info(
        "counterparty created"
    )
    return _counterparty_response(counterparty, _ZERO)


async def list_counterparties(
    session: AsyncSession, user_id: int, *, offset: int, limit: int
) -> tuple[list[CounterpartyResponse], int]:
    total = await repository.count_counterparties(session, user_id=user_id)
    counterparties = await repository.list_counterparties(
        session, user_id=user_id, offset=offset, limit=limit
    )
    balances = await repository.counterparty_balances(
        session, user_id=user_id, counterparty_ids=[c.id for c in counterparties]
    )
    items = [
        _counterparty_response(c, balances.get(c.id, _ZERO)) for c in counterparties
    ]
    return items, total


async def get_counterparty(
    session: AsyncSession, user_id: int, counterparty_id: int
) -> CounterpartyResponse:
    counterparty = await _require_counterparty(session, user_id, counterparty_id)
    balances = await repository.counterparty_balances(
        session, user_id=user_id, counterparty_ids=[counterparty.id]
    )
    return _counterparty_response(counterparty, balances.get(counterparty.id, _ZERO))


async def update_counterparty(
    session: AsyncSession,
    user_id: int,
    counterparty_id: int,
    data: CounterpartyUpdateRequest,
) -> CounterpartyResponse:
    counterparty = await _require_counterparty(session, user_id, counterparty_id)

    if data.name is not None and data.name.lower() != counterparty.name.lower():
        existing = await repository.get_counterparty_by_name(
            session, user_id=user_id, name=data.name
        )
        if existing is not None and existing.id != counterparty.id:
            raise CounterpartyNameTakenException()
        counterparty.name = data.name
    if data.note is not None:
        counterparty.note = data.note

    try:
        await session.flush()
    except IntegrityError:
        await session.rollback()
        raise CounterpartyNameTakenException()
    await session.commit()
    await session.refresh(counterparty)  # pick up server-side updated_at

    balances = await repository.counterparty_balances(
        session, user_id=user_id, counterparty_ids=[counterparty.id]
    )
    logger.bind(user_id=user_id, counterparty_id=counterparty.id).info(
        "counterparty updated"
    )
    return _counterparty_response(counterparty, balances.get(counterparty.id, _ZERO))


async def delete_counterparty(
    session: AsyncSession, user_id: int, counterparty_id: int
) -> None:
    counterparty = await _require_counterparty(session, user_id, counterparty_id)
    if await repository.counterparty_has_debts(
        session, counterparty_id=counterparty.id
    ):
        raise CounterpartyHasDebtsException()
    await repository.delete_counterparty(session, counterparty)
    await session.commit()
    logger.bind(user_id=user_id, counterparty_id=counterparty_id).info(
        "counterparty deleted"
    )


# --- Debts ----------------------------------------------------------------------------------


async def create_debt(
    session: AsyncSession, user_id: int, data: DebtCreateRequest
) -> DebtDetailResponse:
    # Validate the counterparty belongs to this user before creating the debt.
    await _require_counterparty(session, user_id, data.counterparty_id)
    debt = await repository.create_debt(
        session,
        user_id=user_id,
        counterparty_id=data.counterparty_id,
        direction=data.direction,
        principal_amount=data.principal_amount,
        description=data.description,
        incurred_on=data.incurred_on or _today(),
    )
    await session.commit()
    debt = await _require_debt(session, user_id, debt.id)
    logger.bind(user_id=user_id, debt_id=debt.id).info("debt created")
    return _detail_response(debt)


async def list_debts(
    session: AsyncSession,
    user_id: int,
    *,
    offset: int,
    limit: int,
    counterparty_id: int | None = None,
    direction: DebtDirection | None = None,
    status: DebtStatus | None = None,
) -> tuple[list[DebtSummaryResponse], int]:
    total = await repository.count_debts(
        session,
        user_id=user_id,
        counterparty_id=counterparty_id,
        direction=direction,
        status=status,
    )
    rows = await repository.list_debts(
        session,
        user_id=user_id,
        offset=offset,
        limit=limit,
        counterparty_id=counterparty_id,
        direction=direction,
        status=status,
    )
    items = [_summary_response(debt, outstanding) for debt, outstanding in rows]
    return items, total


async def get_debt(
    session: AsyncSession, user_id: int, debt_id: int
) -> DebtDetailResponse:
    debt = await _require_debt(session, user_id, debt_id)
    return _detail_response(debt)


async def update_debt(
    session: AsyncSession, user_id: int, debt_id: int, data: DebtUpdateRequest
) -> DebtDetailResponse:
    debt = await _require_debt(session, user_id, debt_id)

    if data.counterparty_id is not None and data.counterparty_id != debt.counterparty_id:
        new_counterparty = await _require_counterparty(
            session, user_id, data.counterparty_id
        )
        debt.counterparty = new_counterparty
    if data.direction is not None:
        debt.direction = data.direction
    if data.principal_amount is not None:
        debt.principal_amount = data.principal_amount
    if data.description is not None:
        debt.description = data.description
    if data.incurred_on is not None:
        debt.incurred_on = data.incurred_on

    await session.commit()
    debt = await _require_debt(session, user_id, debt.id)
    logger.bind(user_id=user_id, debt_id=debt.id).info("debt updated")
    return _detail_response(debt)


async def delete_debt(session: AsyncSession, user_id: int, debt_id: int) -> None:
    debt = await _require_debt(session, user_id, debt_id)
    await repository.delete_debt(session, debt)
    await session.commit()
    logger.bind(user_id=user_id, debt_id=debt_id).info("debt deleted")


async def write_off_debt(
    session: AsyncSession, user_id: int, debt_id: int
) -> DebtDetailResponse:
    debt = await _require_debt(session, user_id, debt_id)
    if debt.written_off_at is None:  # idempotent: don't move an existing write-off date
        debt.written_off_at = _today()
        await session.commit()
        debt = await _require_debt(session, user_id, debt.id)
    logger.bind(user_id=user_id, debt_id=debt_id).info("debt written off")
    return _detail_response(debt)


async def clear_write_off(
    session: AsyncSession, user_id: int, debt_id: int
) -> DebtDetailResponse:
    debt = await _require_debt(session, user_id, debt_id)
    if debt.written_off_at is not None:
        debt.written_off_at = None
        await session.commit()
        debt = await _require_debt(session, user_id, debt.id)
    logger.bind(user_id=user_id, debt_id=debt_id).info("debt write-off cleared")
    return _detail_response(debt)


async def summary(session: AsyncSession, user_id: int) -> DebtSummaryTotals:
    totals = await repository.summary_totals(session, user_id=user_id)
    total_i_owe = totals.get(DebtDirection.I_OWE, _ZERO)
    total_owed_to_me = totals.get(DebtDirection.OWED_TO_ME, _ZERO)
    return DebtSummaryTotals(
        total_i_owe=total_i_owe,
        total_owed_to_me=total_owed_to_me,
        net=total_owed_to_me - total_i_owe,
    )


# --- Repayments -----------------------------------------------------------------------------


async def add_repayment(
    session: AsyncSession,
    user_id: int,
    debt_id: int,
    data: RepaymentCreateRequest,
) -> RepaymentResponse:
    await _require_debt(session, user_id, debt_id)  # scope check
    repayment = await repository.create_repayment(
        session,
        debt_id=debt_id,
        amount=data.amount,
        paid_on=data.paid_on or _today(),
        note=data.note,
    )
    await session.commit()
    logger.bind(user_id=user_id, debt_id=debt_id, repayment_id=repayment.id).info(
        "repayment added"
    )
    return RepaymentResponse.model_validate(repayment)


async def list_repayments(
    session: AsyncSession, user_id: int, debt_id: int
) -> list[RepaymentResponse]:
    await _require_debt(session, user_id, debt_id)  # scope check
    repayments = await repository.list_repayments(session, debt_id=debt_id)
    return [RepaymentResponse.model_validate(r) for r in repayments]


async def update_repayment(
    session: AsyncSession,
    user_id: int,
    debt_id: int,
    repayment_id: int,
    data: RepaymentUpdateRequest,
) -> RepaymentResponse:
    await _require_debt(session, user_id, debt_id)  # scope check
    repayment = await repository.get_repayment(
        session, debt_id=debt_id, repayment_id=repayment_id
    )
    if repayment is None:
        raise RepaymentNotFoundException()

    if data.amount is not None:
        repayment.amount = data.amount
    if data.paid_on is not None:
        repayment.paid_on = data.paid_on
    if data.note is not None:
        repayment.note = data.note

    await session.commit()
    await session.refresh(repayment)  # pick up server-side updated_at
    logger.bind(user_id=user_id, debt_id=debt_id, repayment_id=repayment_id).info(
        "repayment updated"
    )
    return RepaymentResponse.model_validate(repayment)


async def delete_repayment(
    session: AsyncSession, user_id: int, debt_id: int, repayment_id: int
) -> None:
    await _require_debt(session, user_id, debt_id)  # scope check
    repayment = await repository.get_repayment(
        session, debt_id=debt_id, repayment_id=repayment_id
    )
    if repayment is None:
        raise RepaymentNotFoundException()
    await repository.delete_repayment(session, repayment)
    await session.commit()
    logger.bind(user_id=user_id, debt_id=debt_id, repayment_id=repayment_id).info(
        "repayment deleted"
    )
