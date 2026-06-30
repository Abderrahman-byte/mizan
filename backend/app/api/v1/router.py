"""v1 router.

Holds only the infrastructure liveness probe for now. Feature resource routers are
included here as modules are added (none yet).
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health", tags=["system"])
async def health() -> dict:
    """Liveness probe. Returns the standard ``{"data": ...}`` success envelope."""
    return {"data": {"status": "ok"}}
