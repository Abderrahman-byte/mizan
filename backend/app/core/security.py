"""Security primitives: password hashing, refresh-token hashing, and access-token (JWT) codec.

Decisions (see ``docs/auth.md`` / ``docs/decisions.md``, 2026-06-30):

- **Passwords** and **refresh tokens** are hashed with **bcrypt via ``pwdlib``**. Plaintext is
  never stored or logged.
- **Refresh tokens** handed to the client have the form ``"<row_id>.<secret>"`` where ``secret``
  is a high-entropy opaque string (``secrets.token_urlsafe``); only the bcrypt hash of ``secret``
  is persisted (``refresh_tokens.token_hash``). Because bcrypt salts every hash a stored hash is
  not look-up-able by value, so the ``row_id`` prefix makes the session directly addressable:
  ``/refresh`` and ``/logout`` ``parse_refresh_token`` the supplied value, load that one row by
  PK, then ``verify_refresh_token`` the ``secret`` against its hash.
- **Access tokens** are short-lived **HS256 JWTs** signed with ``settings.jwt_secret`` carrying
  ``sub`` (user id), ``iat``, ``exp`` (now + ``ACCESS_TOKEN_TTL_MINUTES``) and ``type="access"``.
"""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash
from pwdlib.hashers.bcrypt import BcryptHasher

from app.core.config import ACCESS_TOKEN_TTL_MINUTES, settings

# bcrypt only considers the first 72 bytes of its input and the underlying backend raises on
# longer secrets; truncate explicitly so a long (but schema-valid) password never 500s. This is
# behaviour-preserving since bcrypt would ignore the extra bytes anyway.
_BCRYPT_MAX_BYTES = 72

_JWT_ALGORITHM = "HS256"

_password_hash = PasswordHash((BcryptHasher(),))


# Access-token validation failures. Kept PyJWT-agnostic so callers (the auth dependency) never
# import ``jwt``: the codec stays fully encapsulated here.
class AccessTokenError(Exception):
    """Base for access-token validation failures."""


class AccessTokenExpired(AccessTokenError):
    """The access token is well-formed and correctly signed but past its ``exp``."""


class AccessTokenInvalid(AccessTokenError):
    """The access token is missing, malformed, badly signed, or has the wrong claims."""


class RefreshTokenMalformed(Exception):
    """A client-supplied refresh token is not the expected ``"<row_id>.<secret>"`` shape.

    Kept distinct so the auth service maps it to ``REFRESH_TOKEN_INVALID`` without this module
    importing the API exception layer.
    """


def _truncate(secret: str) -> bytes:
    return secret.encode("utf-8")[:_BCRYPT_MAX_BYTES]


# --- Passwords -------------------------------------------------------------------------------


def hash_password(password: str) -> str:
    """Return a bcrypt hash of ``password`` suitable for ``users.password_hash``."""
    return _password_hash.hash(_truncate(password))


def verify_password(password: str, password_hash: str) -> bool:
    """Return ``True`` if ``password`` matches the stored bcrypt ``password_hash``."""
    return _password_hash.verify(_truncate(password), password_hash)


# --- Refresh tokens --------------------------------------------------------------------------


def generate_refresh_token() -> str:
    """Return a new high-entropy opaque refresh ``secret`` (the hashed, stored part)."""
    return secrets.token_urlsafe(32)


def format_refresh_token(token_id: int, secret: str) -> str:
    """Compose the client-facing refresh token from its session row id and ``secret``.

    The ``id`` prefix makes the (otherwise un-look-up-able, bcrypt-salted) session directly
    addressable on ``/refresh`` and ``/logout``.
    """
    return f"{token_id}.{secret}"


def parse_refresh_token(token: str) -> tuple[int, str]:
    """Split a client refresh token into ``(row_id, secret)``.

    Raises :class:`RefreshTokenMalformed` if it lacks the ``"<int>.<secret>"`` shape (missing
    separator, non-integer id, or empty secret).
    """
    prefix, sep, secret = token.partition(".")
    if not sep or not secret:
        raise RefreshTokenMalformed()
    try:
        return int(prefix), secret
    except ValueError as exc:
        raise RefreshTokenMalformed() from exc


def hash_refresh_token(secret: str) -> str:
    """Return the bcrypt hash stored in ``refresh_tokens.token_hash`` for a refresh ``secret``."""
    return _password_hash.hash(_truncate(secret))


def verify_refresh_token(secret: str, token_hash: str) -> bool:
    """Return ``True`` if ``secret`` matches a stored refresh ``token_hash``."""
    return _password_hash.verify(_truncate(secret), token_hash)


# --- Access tokens (JWT) ---------------------------------------------------------------------


def create_access_token(user_id: int) -> str:
    """Return a signed short-lived HS256 access token for ``user_id``."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=ACCESS_TOKEN_TTL_MINUTES),
        "type": "access",
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=_JWT_ALGORITHM)


def decode_access_token(token: str) -> int:
    """Validate an HS256 access token and return its subject (``user_id``).

    Raises :class:`AccessTokenExpired` if the token is past ``exp``; :class:`AccessTokenInvalid`
    for a malformed/badly-signed token, a non-``access`` ``type``, or a missing/non-integer
    ``sub``. PyJWT exceptions are translated here so the codec never leaks past this module.
    """
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[_JWT_ALGORITHM])
    except jwt.ExpiredSignatureError as exc:
        raise AccessTokenExpired() from exc
    except jwt.InvalidTokenError as exc:
        raise AccessTokenInvalid() from exc

    if payload.get("type") != "access":
        raise AccessTokenInvalid()
    try:
        return int(payload["sub"])
    except (KeyError, TypeError, ValueError) as exc:
        raise AccessTokenInvalid() from exc
