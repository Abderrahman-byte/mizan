"""Transaction endpoints (the monthly spending/income ledger).

Routes live under ``app/api/`` (decision 2026-06-30); the ``transactions`` feature module
(``app/modules/transactions/``) holds the non-routing layers. Every route is guarded by
``CurrentUser`` and scoped to that user's rows. Contracts in ``docs/transactions.md``.

Route order note: the static ``/summary`` path is declared before the parametrised
``/{transaction_id}`` routes so it is never parsed as a transaction id.
"""

from fastapi import APIRouter, Query, status

from app.api.deps import CurrentUser, DBSession, Pagination
from app.core.pagination import build_pagination_meta
from app.core.responses import PaginatedResponse, SuccessResponse
from app.modules.transactions import service
from app.modules.transactions.enums import TransactionDirection
from app.modules.transactions.schemas import (
    MonthSummaryResponse,
    TransactionCreateRequest,
    TransactionResponse,
    TransactionUpdateRequest,
)

router = APIRouter()

# "YYYY-MM" — a calendar month key. Malformed values fail request validation (400).
MONTH_PATTERN = r"^\d{4}-(0[1-9]|1[0-2])$"


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=SuccessResponse[TransactionResponse],
)
async def create_transaction(
    payload: TransactionCreateRequest,
    current_user: CurrentUser,
    session: DBSession,
) -> SuccessResponse[TransactionResponse]:
    """Create a ledger entry. ``OUT`` requires a ``categoryId`` (the user's own, else 404);
    ``IN`` must not send one — violations → 409 ``CATEGORY_DIRECTION_MISMATCH``. ``occurredOn``
    defaults to today when omitted."""
    result = await service.create_transaction(session, current_user.id, payload)
    return SuccessResponse(data=result)


@router.get("", response_model=PaginatedResponse[TransactionResponse])
async def list_transactions(
    current_user: CurrentUser,
    session: DBSession,
    pagination: Pagination,
    month: str | None = Query(None, pattern=MONTH_PATTERN),
    direction: TransactionDirection | None = Query(None),
    category_id: int | None = Query(None),
) -> PaginatedResponse[TransactionResponse]:
    """List the user's transactions (paginated, newest first), filterable by month
    (``?month=YYYY-MM``), direction, and category. Each item embeds its ``category``
    (``null`` for income)."""
    items, total = await service.list_transactions(
        session,
        current_user.id,
        offset=pagination.offset,
        limit=pagination.page_size,
        month=month,
        direction=direction,
        category_id=category_id,
    )
    meta = build_pagination_meta(pagination.page, pagination.page_size, total)
    return PaginatedResponse(data=items, pagination=meta)


@router.get("/summary", response_model=SuccessResponse[MonthSummaryResponse])
async def month_summary(
    current_user: CurrentUser,
    session: DBSession,
    month: str = Query(pattern=MONTH_PATTERN),
) -> SuccessResponse[MonthSummaryResponse]:
    """One month's aggregates: ``totalOut`` / ``totalIn`` plus per-category expense totals
    (``byCategory``, biggest spender first). Derived in SQL over the whole month, so it stays
    correct regardless of list pagination."""
    result = await service.month_summary(session, current_user.id, month)
    return SuccessResponse(data=result)


@router.get("/{transaction_id}", response_model=SuccessResponse[TransactionResponse])
async def get_transaction(
    transaction_id: int,
    current_user: CurrentUser,
    session: DBSession,
) -> SuccessResponse[TransactionResponse]:
    """One transaction. Unknown id → 404 ``TRANSACTION_NOT_FOUND``."""
    result = await service.get_transaction(session, current_user.id, transaction_id)
    return SuccessResponse(data=result)


@router.patch("/{transaction_id}", response_model=SuccessResponse[TransactionResponse])
async def update_transaction(
    transaction_id: int,
    payload: TransactionUpdateRequest,
    current_user: CurrentUser,
    session: DBSession,
) -> SuccessResponse[TransactionResponse]:
    """Edit any transaction field (at least one). Flipping to ``IN`` clears the category
    automatically; flipping to ``OUT`` requires a ``categoryId`` in the same request."""
    result = await service.update_transaction(
        session, current_user.id, transaction_id, payload
    )
    return SuccessResponse(data=result)


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: int,
    current_user: CurrentUser,
    session: DBSession,
) -> None:
    """Delete a transaction."""
    await service.delete_transaction(session, current_user.id, transaction_id)
