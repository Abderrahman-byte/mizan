"""Application settings.

All environment-configurable values are centralized here and accessed through the
module-level ``settings`` instance (per conventions: no ``@lru_cache`` + getter).
Non-env-configurable constants (formulas, intervals) do NOT belong here.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Values come from the process environment. Under Docker, Compose loads the
    # root ./.env and injects these vars — there is no backend/.env.
    model_config = SettingsConfigDict(extra="ignore")

    # Database — provided as parts; the async URL is assembled below.
    db_host: str = "db"
    db_port: int = 5432
    db_user: str = "mizan"
    db_password: str = "mizan"
    db_name: str = "mizan"

    # Logging.
    log_level: str = "INFO"

    # Auth secret — env-configurable (required in production).
    # Decisions recorded in docs/decisions.md: JWT Bearer, access+refresh.
    jwt_secret: str = "change-me"

    @property
    def database_url(self) -> str:
        """Async SQLAlchemy URL assembled from the DB_* parts."""
        return (
            f"postgresql+asyncpg://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )


settings = Settings()

# Token lifetimes — app constants, NOT env-configurable (per conventions: intervals
# and TTLs are plain module-level constants, never BaseSettings fields).
ACCESS_TOKEN_TTL_MINUTES = 15
REFRESH_TOKEN_TTL_DAYS = 30
