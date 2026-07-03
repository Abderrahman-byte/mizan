"""Category endpoints (the transactions ledger's spending categories).

Routes live under ``app/api/`` (decision 2026-06-30); the ``transactions`` feature module
(``app/modules/transactions/``) holds the non-routing layers. Every route is guarded by
``CurrentUser`` and scoped to that user's rows. Contracts in ``docs/transactions.md``.

The list is deliberately **unpaginated** (decision 2026-07-03): a user's category set is small
and bounded, and the expense category picker needs all of it — same exception as a debt's
repayments list.
"""

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DBSession
from app.core.responses import SuccessResponse
from app.modules.transactions import service
from app.modules.transactions.schemas import (
    CategoryCreateRequest,
    CategoryResponse,
    CategoryUpdateRequest,
)

router = APIRouter()


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=SuccessResponse[CategoryResponse],
)
async def create_category(
    payload: CategoryCreateRequest,
    current_user: CurrentUser,
    session: DBSession,
) -> SuccessResponse[CategoryResponse]:
    """Create a category. Name is unique per user (case-insensitive) → 409
    ``CATEGORY_NAME_TAKEN`` on collision."""
    result = await service.create_category(session, current_user.id, payload)
    return SuccessResponse(data=result)


@router.get("", response_model=SuccessResponse[list[CategoryResponse]])
async def list_categories(
    current_user: CurrentUser,
    session: DBSession,
) -> SuccessResponse[list[CategoryResponse]]:
    """All the user's categories (full list, sorted by name)."""
    result = await service.list_categories(session, current_user.id)
    return SuccessResponse(data=result)


@router.get("/{category_id}", response_model=SuccessResponse[CategoryResponse])
async def get_category(
    category_id: int,
    current_user: CurrentUser,
    session: DBSession,
) -> SuccessResponse[CategoryResponse]:
    """One category. Unknown id → 404 ``CATEGORY_NOT_FOUND``."""
    result = await service.get_category(session, current_user.id, category_id)
    return SuccessResponse(data=result)


@router.patch("/{category_id}", response_model=SuccessResponse[CategoryResponse])
async def update_category(
    category_id: int,
    payload: CategoryUpdateRequest,
    current_user: CurrentUser,
    session: DBSession,
) -> SuccessResponse[CategoryResponse]:
    """Edit a category's name and/or icon (at least one field)."""
    result = await service.update_category(session, current_user.id, category_id, payload)
    return SuccessResponse(data=result)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: int,
    current_user: CurrentUser,
    session: DBSession,
) -> None:
    """Delete a category — **blocked** (409 ``CATEGORY_HAS_TRANSACTIONS``) while transactions
    still reference it."""
    await service.delete_category(session, current_user.id, category_id)
