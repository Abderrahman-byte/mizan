"""Declarative base and the shared id/timestamp mixin.

Per DB hygiene conventions: every entity has a BigInteger PK `id`, plus `created_at`
and `updated_at`. Models inherit `Base` and `IdTimestampMixin`:

    class User(Base, IdTimestampMixin):
        __tablename__ = "users"
        ...

No models exist yet (schema is undecided), so `Base.metadata` is currently empty.
When models are added they must be imported before autogenerate runs (see
`app/alembic/env.py`).
"""

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


class IdTimestampMixin:
    """Standard surrogate PK + audit timestamps shared by every entity."""

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
