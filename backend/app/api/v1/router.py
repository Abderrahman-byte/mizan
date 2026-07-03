"""v1 router.

Holds the infrastructure liveness probe plus the feature resource routers. More are
included here as modules are added.
"""

from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.categories import router as categories_router
from app.api.v1.counterparties import router as counterparties_router
from app.api.v1.debts import router as debts_router
from app.api.v1.transactions import router as transactions_router

router = APIRouter()

# Auth endpoints: register is implemented; the rest are stubs (501) — see app/api/v1/auth.py.
router.include_router(auth_router, prefix="/auth", tags=["auth"])

# Debt/loan ledger — see app/api/v1/{counterparties,debts}.py and docs/debts.md.
router.include_router(
    counterparties_router, prefix="/counterparties", tags=["counterparties"]
)
router.include_router(debts_router, prefix="/debts", tags=["debts"])

# Transactions ledger — see app/api/v1/{categories,transactions}.py and docs/transactions.md.
router.include_router(categories_router, prefix="/categories", tags=["categories"])
router.include_router(transactions_router, prefix="/transactions", tags=["transactions"])


@router.get("/health", tags=["system"])
async def health() -> dict:
    """Liveness probe. Returns the standard ``{"data": ...}`` success envelope."""
    return {"data": {"status": "ok"}}
