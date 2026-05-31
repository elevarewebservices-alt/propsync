import asyncio
from datetime import datetime

from facebook_publisher.queue.celery_app import celery_app
from facebook_publisher.monitoring.logger import get_logger

log = get_logger(__name__)


@celery_app.task(
    name="facebook_publisher.queue.tasks.account_task.reset_daily_counts",
    queue="default",
)
def reset_daily_counts():
    """Reset daily_post_count to 0 for all accounts. Runs at 00:01 via beat."""
    asyncio.run(_do_reset())


async def _do_reset() -> None:
    from facebook_publisher.db.session import get_factory
    from facebook_publisher.db.models import FbAccount, FbAccountStatus
    from sqlalchemy import select, update

    factory = get_factory()
    async with factory() as session:
        # Reset counts
        await session.execute(
            update(FbAccount).values(daily_post_count=0)
        )

        # Re-activate accounts whose cooldown has expired
        now = datetime.utcnow()
        result = await session.execute(
            select(FbAccount).where(
                FbAccount.status == FbAccountStatus.cooldown,
                FbAccount.cooldown_until <= now,
            )
        )
        recovered = result.scalars().all()
        for account in recovered:
            account.status = FbAccountStatus.active
            account.cooldown_until = None

        await session.commit()
        log.info(
            "daily_counts_reset",
            recovered_accounts=len(recovered),
            timestamp=now.isoformat(),
        )


@celery_app.task(
    name="facebook_publisher.queue.tasks.account_task.get_next_available_account",
    queue="default",
)
def get_next_available_account() -> int | None:
    """
    Return the id of the next FB account available for posting.
    Round-robin by last_post_at ASC. Returns None if all accounts are at limit.
    """
    return asyncio.run(_do_get_next())


async def _do_get_next() -> int | None:
    from facebook_publisher.db.session import get_factory
    from facebook_publisher.db.models import FbAccount, FbAccountStatus
    from sqlalchemy import select, or_
    from datetime import datetime

    factory = get_factory()
    async with factory() as session:
        now = datetime.utcnow()
        result = await session.execute(
            select(FbAccount)
            .where(
                FbAccount.status == FbAccountStatus.active,
                FbAccount.daily_post_count < FbAccount.daily_limit,
            )
            .order_by(FbAccount.last_post_at.asc().nullsfirst())
        )
        account = result.scalars().first()
        return account.id if account else None
