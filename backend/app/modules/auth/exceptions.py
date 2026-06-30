"""Auth module exceptions.

Subclass ``APIException`` with class-level defaults so raise sites stay clean and error codes
stay stable (see ``docs/conventions.md`` §3). Auth error codes are catalogued in
``docs/auth.md`` / ``docs/decisions.md`` as endpoints are built.
"""

from app.core.exceptions import APIException


class EmailTakenException(APIException):
    """Raised when registering with an email that already has an account (409)."""

    status_code = 409
    code = "EMAIL_TAKEN"
    message = "An account with this email already exists."


class InvalidCredentialsException(APIException):
    """Raised on login when the email is unknown or the password is wrong (401).

    The message is deliberately generic for both cases so the response never reveals
    whether an account with that email exists.
    """

    status_code = 401
    code = "INVALID_CREDENTIALS"
    message = "Invalid email or password."


class AuthTokenInvalidException(APIException):
    """Raised by the auth dependency when the Bearer access token is missing, malformed,
    badly signed, has the wrong type, or references a user that no longer exists (401)."""

    status_code = 401
    code = "AUTH_TOKEN_INVALID"
    message = "Authentication token is missing or invalid."


class AuthTokenExpiredException(APIException):
    """Raised by the auth dependency when the Bearer access token is expired (401).

    Distinct from ``AUTH_TOKEN_INVALID`` so the client can refresh on expiry rather than
    forcing a re-login.
    """

    status_code = 401
    code = "AUTH_TOKEN_EXPIRED"
    message = "Authentication token has expired."


class RefreshTokenInvalidException(APIException):
    """Raised by ``/refresh`` and ``/logout`` when the refresh token is malformed, unknown,
    already revoked, or doesn't match the stored hash (401). The client must re-login."""

    status_code = 401
    code = "REFRESH_TOKEN_INVALID"
    message = "Refresh token is invalid."


class RefreshTokenExpiredException(APIException):
    """Raised by ``/refresh`` and ``/logout`` when the session row is past ``expires_at`` (401).

    Distinct from ``REFRESH_TOKEN_INVALID`` (mirroring the access-token split); the client
    re-logs-in either way."""

    status_code = 401
    code = "REFRESH_TOKEN_EXPIRED"
    message = "Refresh token has expired."
