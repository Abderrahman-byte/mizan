"""Debt + repayment endpoints (the debt/loan ledger).

Routes live under ``app/api/`` (decision 2026-06-30); the ``debts`` feature module
(``app/modules/debts/``) holds the non-routing layers. Every route is guarded by ``CurrentUser``
and scoped to that user's rows. Contracts in ``docs/debts.md``.

Route order note: the static ``/summary``, ``/export``, and ``/import`` paths are declared
before the parametrised ``/{debt_id}`` routes so they are never parsed as a debt id.
"""

from fastapi import APIRouter, Query, status

from app.api.deps import CurrentUser, DBSession, Pagination
from app.core.pagination import build_pagination_meta
from app.core.responses import PaginatedResponse, SuccessResponse
from app.modules.debts import service
from app.modules.debts.enums import DebtDirection, DebtStatus
from app.modules.debts.schemas import (
    DebtCreateRequest,
    DebtDetailResponse,
    DebtExportDocument,
    DebtImportResult,
    DebtSummaryResponse,
    DebtSummaryTotals,
    DebtUpdateRequest,
    RepaymentCreateRequest,
    RepaymentResponse,
    RepaymentUpdateRequest,
)

router = APIRouter()


# --- Debts ----------------------------------------------------------------------------------


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=SuccessResponse[DebtDetailResponse],
)
async def create_debt(
    payload: DebtCreateRequest,
    current_user: CurrentUser,
    session: DBSession,
) -> SuccessResponse[DebtDetailResponse]:
    """Create a debt. Unknown ``counterpartyId`` → 404 ``COUNTERPARTY_NOT_FOUND``; ``incurredOn``
    defaults to today when omitted."""
    result = await service.create_debt(session, current_user.id, payload)
    return SuccessResponse(data=result)


@router.get("", response_model=PaginatedResponse[DebtSummaryResponse])
async def list_debts(
    current_user: CurrentUser,
    session: DBSession,
    pagination: Pagination,
    counterparty_id: int | None = Query(None),
    direction: DebtDirection | None = Query(None),
    status: DebtStatus | None = Query(None),
) -> PaginatedResponse[DebtSummaryResponse]:
    """List the user's debts (paginated, newest first), filterable by counterparty/direction/status.

    Items are the summary shape (no ``repayments``); fetch a single debt for its repayments.
    """
    items, total = await service.list_debts(
        session,
        current_user.id,
        offset=pagination.offset,
        limit=pagination.page_size,
        counterparty_id=counterparty_id,
        direction=direction,
        status=status,
    )
    meta = build_pagination_meta(pagination.page, pagination.page_size, total)
    return PaginatedResponse(data=items, pagination=meta)


@router.get("/summary", response_model=SuccessResponse[DebtSummaryTotals])
async def debts_summary(
    current_user: CurrentUser,
    session: DBSession,
) -> SuccessResponse[DebtSummaryTotals]:
    """Global net position: ``totalIOwe`` / ``totalOwedToMe`` / ``net`` (written-off excluded)."""
    result = await service.summary(session, current_user.id)
    return SuccessResponse(data=result)


@router.get("/export", response_model=SuccessResponse[DebtExportDocument])
async def export_debts(
    current_user: CurrentUser,
    session: DBSession,
) -> SuccessResponse[DebtExportDocument]:
    """The whole ledger as a portable ``mizan-debts`` v1 document (all counterparties, all
    debts incl. written-off, full repayment history; no DB ids). Contract in ``docs/debts.md``."""
    result = await service.export_ledger(session, current_user.id)
    return SuccessResponse(data=result)


@router.post(
    "/import",
    status_code=status.HTTP_201_CREATED,
    response_model=SuccessResponse[DebtImportResult],
)
async def import_debts(
    payload: DebtExportDocument,
    current_user: CurrentUser,
    session: DBSession,
) -> SuccessResponse[DebtImportResult]:
    """Merge a ``mizan-debts`` document into the ledger (atomic). Counterparties match by name
    (case-insensitive); all debts in the file are created. Unknown version → 400
    ``UNSUPPORTED_EXPORT_VERSION``."""
    result = await service.import_ledger(session, current_user.id, payload)
    return SuccessResponse(data=result)


@router.get("/{debt_id}", response_model=SuccessResponse[DebtDetailResponse])
async def get_debt(
    debt_id: int,
    current_user: CurrentUser,
    session: DBSession,
) -> SuccessResponse[DebtDetailResponse]:
    """One debt with its embedded ``repayments`` + derived ``outstanding``/``status``. Unknown id
    → 404 ``DEBT_NOT_FOUND``."""
    result = await service.get_debt(session, current_user.id, debt_id)
    return SuccessResponse(data=result)


@router.patch("/{debt_id}", response_model=SuccessResponse[DebtDetailResponse])
async def update_debt(
    debt_id: int,
    payload: DebtUpdateRequest,
    current_user: CurrentUser,
    session: DBSession,
) -> SuccessResponse[DebtDetailResponse]:
    """Edit any debt field. A new ``counterpartyId`` must belong to the user (else 404)."""
    result = await service.update_debt(session, current_user.id, debt_id, payload)
    return SuccessResponse(data=result)


@router.delete("/{debt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_debt(
    debt_id: int,
    current_user: CurrentUser,
    session: DBSession,
) -> None:
    """Delete a debt and (cascade) its repayments."""
    await service.delete_debt(session, current_user.id, debt_id)


@router.post("/{debt_id}/write-off", response_model=SuccessResponse[DebtDetailResponse])
async def write_off_debt(
    debt_id: int,
    current_user: CurrentUser,
    session: DBSession,
) -> SuccessResponse[DebtDetailResponse]:
    """Forgive/cancel a debt: stamp ``writtenOffAt`` = today (idempotent). Excludes it from
    reporting; status becomes ``written_off``."""
    result = await service.write_off_debt(session, current_user.id, debt_id)
    return SuccessResponse(data=result)


@router.delete("/{debt_id}/write-off", response_model=SuccessResponse[DebtDetailResponse])
async def clear_write_off(
    debt_id: int,
    current_user: CurrentUser,
    session: DBSession,
) -> SuccessResponse[DebtDetailResponse]:
    """Reactivate a written-off debt: clear ``writtenOffAt``."""
    result = await service.clear_write_off(session, current_user.id, debt_id)
    return SuccessResponse(data=result)


# --- Repayments (nested under a debt) -------------------------------------------------------


@router.post(
    "/{debt_id}/repayments",
    status_code=status.HTTP_201_CREATED,
    response_model=SuccessResponse[RepaymentResponse],
)
async def add_repayment(
    debt_id: int,
    payload: RepaymentCreateRequest,
    current_user: CurrentUser,
    session: DBSession,
) -> SuccessResponse[RepaymentResponse]:
    """Add a (partial) repayment. Over-repayment is allowed. ``paidOn`` defaults to today."""
    result = await service.add_repayment(session, current_user.id, debt_id, payload)
    return SuccessResponse(data=result)


@router.get(
    "/{debt_id}/repayments",
    response_model=SuccessResponse[list[RepaymentResponse]],
)
async def list_repayments(
    debt_id: int,
    current_user: CurrentUser,
    session: DBSession,
) -> SuccessResponse[list[RepaymentResponse]]:
    """List a debt's repayments (full list, oldest first). Unknown debt → 404 ``DEBT_NOT_FOUND``."""
    result = await service.list_repayments(session, current_user.id, debt_id)
    return SuccessResponse(data=result)


@router.patch(
    "/{debt_id}/repayments/{repayment_id}",
    response_model=SuccessResponse[RepaymentResponse],
)
async def update_repayment(
    debt_id: int,
    repayment_id: int,
    payload: RepaymentUpdateRequest,
    current_user: CurrentUser,
    session: DBSession,
) -> SuccessResponse[RepaymentResponse]:
    """Edit a repayment. Unknown id under this debt → 404 ``REPAYMENT_NOT_FOUND``."""
    result = await service.update_repayment(
        session, current_user.id, debt_id, repayment_id, payload
    )
    return SuccessResponse(data=result)


@router.delete(
    "/{debt_id}/repayments/{repayment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_repayment(
    debt_id: int,
    repayment_id: int,
    current_user: CurrentUser,
    session: DBSession,
) -> None:
    """Delete a repayment to correct a mistake."""
    await service.delete_repayment(session, current_user.id, debt_id, repayment_id)
