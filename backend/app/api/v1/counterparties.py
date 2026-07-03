"""Counterparty endpoints — reusable per-user contacts for the debt ledger.

Routes live under ``app/api/`` (decision 2026-06-30); the ``debts`` feature module
(``app/modules/debts/``) holds the non-routing layers. Every route is guarded by ``CurrentUser``
and scoped to that user's rows. Contracts in ``docs/debts.md``.
"""

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DBSession, Pagination
from app.core.pagination import build_pagination_meta
from app.core.responses import PaginatedResponse, SuccessResponse
from app.modules.debts import service
from app.modules.debts.schemas import (
    CounterpartyCreateRequest,
    CounterpartyResponse,
    CounterpartyUpdateRequest,
)

router = APIRouter()


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=SuccessResponse[CounterpartyResponse],
)
async def create_counterparty(
    payload: CounterpartyCreateRequest,
    current_user: CurrentUser,
    session: DBSession,
) -> SuccessResponse[CounterpartyResponse]:
    """Create a counterparty. Duplicate name (per user, case-insensitive) → 409
    ``COUNTERPARTY_NAME_TAKEN``."""
    result = await service.create_counterparty(session, current_user.id, payload)
    return SuccessResponse(data=result)


@router.get("", response_model=PaginatedResponse[CounterpartyResponse])
async def list_counterparties(
    current_user: CurrentUser,
    session: DBSession,
    pagination: Pagination,
) -> PaginatedResponse[CounterpartyResponse]:
    """List the user's counterparties (paginated), each with its inline net ``balance``."""
    items, total = await service.list_counterparties(
        session, current_user.id, offset=pagination.offset, limit=pagination.page_size
    )
    meta = build_pagination_meta(pagination.page, pagination.page_size, total)
    return PaginatedResponse(data=items, pagination=meta)


@router.get("/{counterparty_id}", response_model=SuccessResponse[CounterpartyResponse])
async def get_counterparty(
    counterparty_id: int,
    current_user: CurrentUser,
    session: DBSession,
) -> SuccessResponse[CounterpartyResponse]:
    """One counterparty with its net ``balance``. Unknown id → 404 ``COUNTERPARTY_NOT_FOUND``."""
    result = await service.get_counterparty(session, current_user.id, counterparty_id)
    return SuccessResponse(data=result)


@router.patch("/{counterparty_id}", response_model=SuccessResponse[CounterpartyResponse])
async def update_counterparty(
    counterparty_id: int,
    payload: CounterpartyUpdateRequest,
    current_user: CurrentUser,
    session: DBSession,
) -> SuccessResponse[CounterpartyResponse]:
    """Edit a counterparty's name/note. Name clash → 409 ``COUNTERPARTY_NAME_TAKEN``."""
    result = await service.update_counterparty(
        session, current_user.id, counterparty_id, payload
    )
    return SuccessResponse(data=result)


@router.delete("/{counterparty_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_counterparty(
    counterparty_id: int,
    current_user: CurrentUser,
    session: DBSession,
) -> None:
    """Delete a counterparty. Blocked while it has debts → 409 ``COUNTERPARTY_HAS_DEBTS``."""
    await service.delete_counterparty(session, current_user.id, counterparty_id)
