"""Auth endpoints.

The auth endpoint *set* is confirmed (2026-06-30): register, login, refresh, logout,
forgot-password, reset-password, plus ``me`` (added 2026-06-30 on request). ``register``,
``login``, ``me``, ``refresh``, and ``logout`` are **implemented** (contracts confirmed
2026-06-30 — see ``docs/auth.md``); ``forgot-password`` / ``reset-password`` remain placeholders
that return **501 NOT_IMPLEMENTED** until their contracts are designed.

Routers live under ``app/api/`` (decision 2026-06-30); the ``auth`` feature module
(``app/modules/auth/``) holds the non-routing layers. Build order per
``docs/architecture.md``: ``schemas.py`` (separate request/response) -> ``repository.py``
-> ``service.py`` -> wire it here (router stays logic-free: DI + schema<->ORM mapping only).

# TODO: confirm before implementing — for the two REMAINING stubs (forgot/reset-password) the
# following are undecided:
#   - request payload (fields, validation/password rules) and response shape
#   - success status code and the standard ``{"data": ...}`` envelope contents
#   - reset-token storage (table vs. signed token) and email delivery
"""

from app.api.deps import CurrentUser, DBSession
from app.core.exceptions import APIException
from app.core.responses import SuccessResponse
from app.modules.auth import service as auth_service
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
from fastapi import APIRouter, status

router = APIRouter()


def _not_implemented(action: str) -> None:
    """Raise the placeholder 501 for an unbuilt auth endpoint.

    # TODO: remove once these endpoints are implemented. 501 is not part of the
    # standard status table in conventions.md — it is a temporary stub signal only.
    """
    raise APIException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        code="NOT_IMPLEMENTED",
        message=f"Auth endpoint '{action}' is not implemented yet.",
    )


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    response_model=SuccessResponse[RegisterResponse],
)
async def register(
    payload: RegisterRequest,
    session: DBSession,
) -> SuccessResponse[RegisterResponse]:
    """Create a new user account and auto-login.

    Returns ``201`` with the created user plus an access + refresh token pair. Email is
    normalized (trim + lowercase) and password rules (8–128 chars) are enforced by the
    request schema; a duplicate email yields ``409 EMAIL_TAKEN``. See ``docs/auth.md``.
    """
    result = await auth_service.register(session, payload)
    return SuccessResponse(data=result)


@router.post("/login", response_model=SuccessResponse[LoginResponse])
async def login(
    payload: LoginRequest,
    session: DBSession,
) -> SuccessResponse[LoginResponse]:
    """Authenticate credentials and issue access + refresh tokens.

    Returns ``200`` with the same body as register (user + access + refresh token pair).
    Email is normalized (trim + lowercase) by the request schema; an unknown email or a wrong
    password both yield ``401 INVALID_CREDENTIALS`` (no account enumeration). Verifies the
    bcrypt hash and opens a DB-backed refresh session. See ``docs/auth.md``.
    """
    result = await auth_service.login(session, payload)
    return SuccessResponse(data=result)


@router.get("/me", response_model=SuccessResponse[UserResponse])
async def me(current_user: CurrentUser) -> SuccessResponse[UserResponse]:
    """Return the currently authenticated user's profile.

    Requires a valid ``Authorization: Bearer <access-token>``; the user fields sit directly under
    ``data`` (no wrapper). A missing/invalid token → ``401 AUTH_TOKEN_INVALID``; an expired access
    token → ``401 AUTH_TOKEN_EXPIRED`` (the client refreshes on the latter). The ``current_user``
    is resolved by the shared ``get_current_user`` dependency. See ``docs/auth.md``.
    """
    return SuccessResponse(data=UserResponse.model_validate(current_user))


@router.post("/refresh", response_model=SuccessResponse[RefreshResponse])
async def refresh(
    payload: RefreshRequest,
    session: DBSession,
) -> SuccessResponse[RefreshResponse]:
    """Exchange a valid refresh token for a new access token, rotating the refresh token.

    The supplied ``refreshToken`` (``"<id>.<secret>"``) is verified against its DB-backed session,
    revoked, and replaced; returns ``200`` with the **rotated pair only** (``accessToken`` +
    ``refreshToken``). A malformed/unknown/revoked token → ``401 REFRESH_TOKEN_INVALID``; a
    past-expiry session → ``401 REFRESH_TOKEN_EXPIRED`` (client re-logs-in on either). See
    ``docs/auth.md``.
    """
    result = await auth_service.refresh(session, payload)
    return SuccessResponse(data=result)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    payload: LogoutRequest,
    session: DBSession,
) -> None:
    """Revoke the presented refresh session (true server-side logout).

    Takes ``refreshToken`` in the body and sets ``revoked_at`` on that one session; returns
    ``204`` with no body. The same error paths as ``refresh`` apply (``REFRESH_TOKEN_INVALID`` /
    ``REFRESH_TOKEN_EXPIRED``). See ``docs/auth.md``.
    """
    await auth_service.logout(session, payload)


@router.post("/forgot-password")
async def forgot_password() -> None:
    """Begin password reset: issue a reset token and email it to the user.

    # TODO: confirm before implementing — reset-token storage (dedicated table vs. signed
    # stateless token), email delivery (provider + template), and the response (should not
    # reveal whether the email exists).
    """
    _not_implemented("forgot-password")


@router.post("/reset-password")
async def reset_password() -> None:
    """Complete password reset: validate the reset token and set a new password.

    # TODO: confirm before implementing — request payload (reset token + new password +
    # password rules), token validation/expiry, hashing the new password, and whether
    # active refresh sessions are revoked on reset.
    """
    _not_implemented("reset-password")
