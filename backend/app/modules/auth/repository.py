"""Auth repository — DB queries only (async). No business logic, no HTTP.

Functions ``flush`` so the service can use generated PKs within the same transaction; the
service owns ``commit``/``rollback`` (the ``get_db`` session does not auto-commit).
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import RefreshToken, User


async def get_user_by_email(session: AsyncSession, email: str) -> User | None:
    """Return the user with this (already-normalized) email, or ``None``."""
    result = await session.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_id(session: AsyncSession, user_id: int) -> User | None:
    """Return the user with this id (primary-key lookup), or ``None``."""
    return await session.get(User, user_id)


async def create_user(
    session: AsyncSession, *, email: str, display_name: str, password_hash: str
) -> User:
    """Insert and flush a new user, returning it with its generated ``id``."""
    user = User(email=email, display_name=display_name, password_hash=password_hash)
    session.add(user)
    await session.flush()
    return user


async def create_refresh_token(
    session: AsyncSession, *, user_id: int, token_hash: str, expires_at: datetime
) -> RefreshToken:
    """Insert and flush a new refresh-session row."""
    refresh_token = RefreshToken(
        user_id=user_id, token_hash=token_hash, expires_at=expires_at
    )
    session.add(refresh_token)
    await session.flush()
    return refresh_token


async def get_refresh_token_by_id(
    session: AsyncSession, token_id: int
) -> RefreshToken | None:
    """Return the refresh-session row with this id (primary-key lookup), or ``None``."""
    return await session.get(RefreshToken, token_id)


async def revoke_refresh_token(
    session: AsyncSession, refresh_token: RefreshToken, *, revoked_at: datetime
) -> None:
    """Mark a refresh-session row revoked (set ``revoked_at``) and flush."""
    refresh_token.revoked_at = revoked_at
    await session.flush()
