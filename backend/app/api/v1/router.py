"""v1 router.

Holds the infrastructure liveness probe plus the feature resource routers. More are
included here as modules are added.
"""

from fastapi import APIRouter

from app.api.v1.auth import router as auth_router

router = APIRouter()

# Auth endpoints: register is implemented; the rest are stubs (501) — see app/api/v1/auth.py.
router.include_router(auth_router, prefix="/auth", tags=["auth"])


@router.get("/health", tags=["system"])
async def health() -> dict:
    """Liveness probe. Returns the standard ``{"data": ...}`` success envelope."""
    return {"data": {"status": "ok"}}
