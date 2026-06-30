"""Auth service — business logic. Calls the repository; owns the transaction commit.

No direct SQL and no HTTP concerns here (see ``docs/conventions.md`` §1).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from loguru import logger
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.core.config import REFRESH_TOKEN_TTL_DAYS
from app.modules.auth import repository
from app.modules.auth.exceptions import (
    EmailTakenException,
    InvalidCredentialsException,
    RefreshTokenExpiredException,
    RefreshTokenInvalidException,
)
from app.modules.auth.models import RefreshToken
from app.modules.auth.schemas import (
    LoginRequest,
    LoginResponse,
    LogoutRequest,
    RefreshRequest,
    RefreshResponse,
    RegisterRequest,
    RegisterResponse,
    UserResponse,
)


async def _open_session(session: AsyncSession, user_id: int) -> tuple[str, str]:
    """Open a DB-backed refresh session and mint an access token for ``user_id``.

    Returns ``(access_token, refresh_token)``. The opaque refresh token is returned to the
    caller; only its bcrypt hash is persisted. Does not commit — the caller owns the
    transaction.
    """
    secret = security.generate_refresh_token()
    expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_TTL_DAYS)
    row = await repository.create_refresh_token(
        session,
        user_id=user_id,
        token_hash=security.hash_refresh_token(secret),
        expires_at=expires_at,
    )
    # The row id prefixes the client token so the (bcrypt-salted, un-look-up-able) session can
    # be addressed directly on refresh/logout.
    refresh_token = security.format_refresh_token(row.id, secret)
    access_token = security.create_access_token(user_id)
    return access_token, refresh_token


async def _resolve_refresh_session(
    session: AsyncSession, token: str
) -> RefreshToken:
    """Resolve a client refresh token to its **live** session row.

    Loads the row addressed by the token's id prefix and verifies the secret against the stored
    bcrypt hash. Raises ``REFRESH_TOKEN_INVALID`` for a malformed/unknown/mismatched/already-revoked
    token and ``REFRESH_TOKEN_EXPIRED`` for a row past ``expires_at``. Shared by refresh + logout.
    """
    try:
        token_id, secret = security.parse_refresh_token(token)
    except security.RefreshTokenMalformed:
        raise RefreshTokenInvalidException()

    row = await repository.get_refresh_token_by_id(session, token_id)
    if row is None or not security.verify_refresh_token(secret, row.token_hash):
        raise RefreshTokenInvalidException()
    if row.revoked_at is not None:
        raise RefreshTokenInvalidException()
    if row.expires_at <= datetime.now(timezone.utc):
        raise RefreshTokenExpiredException()
    return row


async def register(session: AsyncSession, data: RegisterRequest) -> RegisterResponse:
    """Create a user and open a refresh session, returning the user + a token pair.

    The email is already normalized (trim + lowercase) by the request schema. Uniqueness is
    pre-checked for a clean ``EMAIL_TAKEN`` error and re-checked via the DB unique constraint
    as a race backstop.
    """
    if await repository.get_user_by_email(session, data.email) is not None:
        raise EmailTakenException()

    password_hash = security.hash_password(data.password)
    try:
        user = await repository.create_user(
            session,
            email=data.email,
            display_name=data.display_name,
            password_hash=password_hash,
        )
    except IntegrityError:
        # Lost the check-then-insert race; the unique constraint is the source of truth.
        await session.rollback()
        raise EmailTakenException()

    access_token, refresh_token = await _open_session(session, user.id)
    await session.commit()

    logger.bind(user_id=user.id).info("user registered")

    return RegisterResponse(
        user=UserResponse.model_validate(user),
        access_token=access_token,
        refresh_token=refresh_token,
    )


async def login(session: AsyncSession, data: LoginRequest) -> LoginResponse:
    """Verify credentials and open a refresh session, returning the user + a token pair.

    The email is already normalized (trim + lowercase) by the request schema. An unknown
    email and a wrong password are reported identically as ``INVALID_CREDENTIALS`` (401) so
    the response never reveals whether the account exists.
    """
    user = await repository.get_user_by_email(session, data.email)
    if user is None or not security.verify_password(data.password, user.password_hash):
        raise InvalidCredentialsException()

    access_token, refresh_token = await _open_session(session, user.id)
    await session.commit()

    logger.bind(user_id=user.id).info("user logged in")

    return LoginResponse(
        user=UserResponse.model_validate(user),
        access_token=access_token,
        refresh_token=refresh_token,
    )


async def refresh(session: AsyncSession, data: RefreshRequest) -> RefreshResponse:
    """Rotate a live refresh session: revoke the presented one and issue a fresh pair.

    Returns only the new ``(access, refresh)`` pair. The old session is revoked (not deleted) so
    a replayed token is rejected as ``REFRESH_TOKEN_INVALID`` rather than silently re-accepted.
    """
    row = await _resolve_refresh_session(session, data.refresh_token)
    await repository.revoke_refresh_token(
        session, row, revoked_at=datetime.now(timezone.utc)
    )
    access_token, refresh_token = await _open_session(session, row.user_id)
    await session.commit()

    logger.bind(user_id=row.user_id).info("refresh token rotated")

    return RefreshResponse(access_token=access_token, refresh_token=refresh_token)


async def logout(session: AsyncSession, data: LogoutRequest) -> None:
    """Revoke the presented refresh session (true server-side logout). No response body.

    Resolves the same way as refresh, so a malformed/unknown/already-revoked token yields
    ``REFRESH_TOKEN_INVALID`` and an expired one ``REFRESH_TOKEN_EXPIRED``.
    """
    row = await _resolve_refresh_session(session, data.refresh_token)
    await repository.revoke_refresh_token(
        session, row, revoked_at=datetime.now(timezone.utc)
    )
    await session.commit()

    logger.bind(user_id=row.user_id).info("user logged out")
