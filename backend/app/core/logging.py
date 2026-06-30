"""Structured (flat JSON) logging via loguru.

Every entry carries timestamp, level, service, and request_id. `request_id` is bound
per-request in the context middleware. Never log secrets, tokens, or PII.
"""

from __future__ import annotations

import json
import sys
from datetime import timezone

from loguru import logger

from app.core.config import settings

SERVICE_NAME = "mizan-backend"


def _serialize(message) -> None:
    record = message.record
    payload = {
        "timestamp": record["time"].astimezone(timezone.utc).isoformat(),
        "level": record["level"].name,
        "service": SERVICE_NAME,
        "request_id": record["extra"].get("request_id"),
        "message": record["message"],
    }
    # Surface any additionally-bound context (logger.bind(key=value)).
    for key, value in record["extra"].items():
        if key not in payload:
            payload[key] = value
    if record["exception"] is not None:
        payload["exception"] = str(record["exception"])
    sys.stdout.write(json.dumps(payload, default=str) + "\n")


def configure_logging() -> None:
    """Replace loguru's default handler with the flat-JSON sink. Call once at startup."""
    logger.remove()
    logger.configure(extra={"request_id": None})
    logger.add(_serialize, level=settings.log_level.upper(), backtrace=False, diagnose=False)
