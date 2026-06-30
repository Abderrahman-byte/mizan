"""Auth ORM models.

The `auth` module owns both the `User` identity entity and the `refresh_tokens` session table.

- `users` — login identity + credentials. Fields confirmed with the user
  (``docs/decisions.md``, 2026-06-30): `email` (unique login id), `display_name`, `password_hash`.
- `refresh_tokens` — backs the DB-backed refresh-session strategy with rotation
  (see ``docs/auth.md``). One row = one refresh session: it stores the **bcrypt hash** of the
  opaque refresh token (never the token itself), its expiry, and a nullable ``revoked_at`` set on
  logout/rotation.

`id`/`created_at`/`updated_at` come from ``IdTimestampMixin``.
"""

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IdTimestampMixin


class User(Base, IdTimestampMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)


class RefreshToken(Base, IdTimestampMixin):
    __tablename__ = "refresh_tokens"

    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
