import os
from typing import Optional

from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine, AsyncConnection
from sqlalchemy.orm import DeclarativeBase

from dotenv import load_dotenv
load_dotenv()


class Base(DeclarativeBase):
    pass


_engine: Optional[AsyncEngine] = None


def engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        dsn = os.getenv(
            "FB_POSTGRES_DSN",
            "postgresql+asyncpg://postgres:devpassword@localhost:5432/fb_publisher",
        )
        _engine = create_async_engine(
            dsn,
            pool_size=int(os.getenv("FB_POSTGRES_POOL_SIZE", "5")),
            max_overflow=int(os.getenv("FB_POSTGRES_MAX_OVERFLOW", "10")),
            echo=os.getenv("DEBUG", "false").lower() == "true",
        )
    return _engine


async def init_postgres() -> None:
    # Import models so SQLAlchemy registers them with Base.metadata before create_all
    from facebook_publisher.db import models  # noqa: F401

    async with engine().begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
