"""Shared API dependencies (DB session, auth, pagination) as reusable annotated types."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.core.pagination import PaginationParams
from app.db.session import get_db
from app.modules.auth import repository as auth_repository
from app.modules.auth.exceptions import (
    AuthTokenExpiredException,
    AuthTokenInvalidException,
)
from app.modules.auth.models import User

DBSession = Annotated[AsyncSession, Depends(get_db)]
Pagination = Annotated[PaginationParams, Depends()]

# auto_error=False so a missing/blank Authorization header yields our standard error envelope
# (via the exception handlers) instead of FastAPI's default 403 body.
_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    session: DBSession,
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)
    ],
) -> User:
    """Resolve the user from the ``Authorization: Bearer <access-token>`` header.

    Shared by every protected route. Raises ``AUTH_TOKEN_EXPIRED`` (401) for an expired access
    token and ``AUTH_TOKEN_INVALID`` (401) for a missing/malformed/badly-signed/wrong-type token
    or one whose user no longer exists.
    """
    if credentials is None or not credentials.credentials:
        raise AuthTokenInvalidException()

    try:
        user_id = security.decode_access_token(credentials.credentials)
    except security.AccessTokenExpired:
        raise AuthTokenExpiredException()
    except security.AccessTokenInvalid:
        raise AuthTokenInvalidException()

    user = await auth_repository.get_user_by_id(session, user_id)
    if user is None:
        raise AuthTokenInvalidException()
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
