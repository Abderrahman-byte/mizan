"""Mizan API entry point.

Wires the skeleton: structured logging, request-id middleware, centralized exception
handlers, and the API router. No feature modules/endpoints yet beyond the health probe.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from loguru import logger

from app.api.router import router as api_router
from app.core.context import RequestContextMiddleware
from app.core.error_handlers import register_exception_handlers
from app.core.logging import configure_logging
from app.db.session import engine

configure_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("application startup")
    yield
    await engine.dispose()
    logger.info("application shutdown")


app = FastAPI(title="Mizan API", lifespan=lifespan)

app.add_middleware(RequestContextMiddleware)
register_exception_handlers(app)
app.include_router(api_router, prefix="/api")
