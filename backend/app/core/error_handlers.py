"""Centralized exception handlers — registered once at app startup.

Order matters (most specific first). Every error returns the standard envelope; raw
exceptions and stack traces are never sent to the client.
"""

from __future__ import annotations

import secrets

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from loguru import logger
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.exceptions import APIException
from app.core.responses import ErrorBody, ErrorDetail, ErrorResponse

# Framework/Pydantic error type -> stable client code.
PYDANTIC_ERROR_CODE_MAP = {
    "missing": "REQUIRED_FIELD",
    "string_too_short": "STRING_TOO_SHORT",
    "string_too_long": "STRING_TOO_LONG",
    "enum": "INVALID_ENUM",
    "int_parsing": "INVALID_INTEGER",
    "float_parsing": "INVALID_FLOAT",
    "bool_parsing": "INVALID_BOOLEAN",
    "datetime_parsing": "INVALID_DATETIME",
    "date_parsing": "INVALID_DATE",
    "greater_than": "VALUE_TOO_SMALL",
    "greater_than_equal": "VALUE_TOO_SMALL",
    "less_than": "VALUE_TOO_LARGE",
    "less_than_equal": "VALUE_TOO_LARGE",
}


def _envelope(status_code: int, code: str, message: str, details=None) -> JSONResponse:
    body = ErrorResponse(error=ErrorBody(code=code, message=message, details=details))
    return JSONResponse(status_code=status_code, content=body.model_dump())


async def _api_exception_handler(request: Request, exc: APIException) -> JSONResponse:
    logger.bind(code=exc.code, status_code=exc.status_code).warning(exc.message)
    return _envelope(exc.status_code, exc.code, exc.message, exc.details)


async def _http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    return _envelope(exc.status_code, "HTTP_ERROR", str(exc.detail))


async def _validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    details = [
        ErrorDetail(
            field=str(err["loc"][-1]) if err.get("loc") else None,
            code=PYDANTIC_ERROR_CODE_MAP.get(err.get("type", ""), "INVALID_FIELD"),
            message=err.get("msg", "Invalid value."),
        )
        for err in exc.errors()
    ]
    return _envelope(
        status.HTTP_400_BAD_REQUEST,
        "VALIDATION_ERROR",
        "Invalid request payload.",
        details,
    )


async def _unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    error_id = secrets.token_hex(4)
    logger.bind(error_id=error_id).exception("unhandled exception")
    return _envelope(
        status.HTTP_500_INTERNAL_SERVER_ERROR,
        "INTERNAL_SERVER_ERROR",
        f"An unexpected error occurred. Reference: {error_id}",
    )


def register_exception_handlers(app: FastAPI) -> None:
    # Most specific first.
    app.add_exception_handler(APIException, _api_exception_handler)
    app.add_exception_handler(StarletteHTTPException, _http_exception_handler)
    app.add_exception_handler(RequestValidationError, _validation_exception_handler)
    app.add_exception_handler(Exception, _unhandled_exception_handler)
