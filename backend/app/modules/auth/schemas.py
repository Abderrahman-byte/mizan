"""Auth request/response schemas (Pydantic v2).

JSON is camelCase on the wire, snake_case in Python (bridged by ``to_camel`` alias generator,
per ``docs/conventions.md`` §2). Request and response models are kept separate; response models
never leak internal fields (e.g. ``password_hash``).

Register contract (confirmed 2026-06-30):
- **Request:** ``email``, ``displayName``, ``password``.
- **Password rules:** 8–128 chars, no complexity requirement.
- **Email normalization:** trimmed and lowercased before validation/uniqueness/storage.
- **Response:** ``201`` with the created user plus an access + refresh token pair (auto-login).

Login contract (confirmed 2026-06-30):
- **Request:** ``email``, ``password``. Email is trimmed + lowercased to match the stored
  identity; **no** format/length validation is applied so any bad input fails closed as
  ``401 INVALID_CREDENTIALS`` rather than a ``400`` that would leak which field was wrong.
- **Response:** ``200`` with the same body as register (user + access + refresh token pair).

Refresh contract (confirmed 2026-06-30):
- **Request:** ``refreshToken`` (the ``"<id>.<secret>"`` value last issued).
- **Response:** ``200`` with the **rotated pair only** (``accessToken`` + ``refreshToken``); no
  user object.

Logout contract (confirmed 2026-06-30):
- **Request:** ``refreshToken``. Revokes that one session; responds ``204`` with no body.

``EmailStr`` is intentionally avoided so we don't pull in the ``email-validator`` dependency;
a pragmatic format check covers it instead.
"""

from __future__ import annotations

import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

# Pragmatic, dependency-free email shape check: one "@", non-empty local part, dotted domain.
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_EMAIL_MAX_LENGTH = 320  # RFC 5321; matches users.email column.

PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 128
DISPLAY_NAME_MAX_LENGTH = 100


class _CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class RegisterRequest(_CamelModel):
    email: str = Field(max_length=_EMAIL_MAX_LENGTH)
    display_name: str = Field(min_length=1, max_length=DISPLAY_NAME_MAX_LENGTH)
    password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=PASSWORD_MAX_LENGTH)

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, value: str) -> str:
        value = value.strip().lower()
        if len(value) > _EMAIL_MAX_LENGTH or not _EMAIL_RE.match(value):
            raise ValueError("Invalid email address.")
        return value

    @field_validator("display_name")
    @classmethod
    def _strip_display_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Display name must not be blank.")
        return value


class LoginRequest(_CamelModel):
    email: str = Field(max_length=_EMAIL_MAX_LENGTH)
    password: str

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, value: str) -> str:
        # Match the stored identity (register normalizes the same way). No format check:
        # a malformed email simply won't match a row and falls through to INVALID_CREDENTIALS.
        return value.strip().lower()


class UserResponse(_CamelModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )

    id: int
    email: str
    display_name: str
    created_at: datetime


class RegisterResponse(_CamelModel):
    user: UserResponse
    access_token: str
    refresh_token: str


class LoginResponse(_CamelModel):
    user: UserResponse
    access_token: str
    refresh_token: str


class RefreshRequest(_CamelModel):
    refresh_token: str = Field(min_length=1)


class RefreshResponse(_CamelModel):
    access_token: str
    refresh_token: str


class LogoutRequest(_CamelModel):
    refresh_token: str = Field(min_length=1)
