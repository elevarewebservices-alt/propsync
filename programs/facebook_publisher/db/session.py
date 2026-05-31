from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from facebook_publisher.db.base import engine

_factory: async_sessionmaker | None = None


def get_factory() -> async_sessionmaker:
    global _factory
    if _factory is None:
        _factory = async_sessionmaker(
            bind=engine(),
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with get_factory()() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
