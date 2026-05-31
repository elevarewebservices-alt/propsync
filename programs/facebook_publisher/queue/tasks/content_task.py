import asyncio

from facebook_publisher.queue.celery_app import celery_app
from facebook_publisher.monitoring.logger import get_logger

log = get_logger(__name__)


@celery_app.task(
    name="facebook_publisher.queue.tasks.content_task.generate_content",
    bind=True,
    max_retries=3,
    default_retry_delay=120,
    rate_limit="10/m",
    queue="content",
)
def generate_content(self, wasi_id: str):
    """
    Generate OpenAI content variants and create a publication_queue entry
    awaiting human approval. Skips if content is already up-to-date or if
    the property has already been published on this channel.
    """
    try:
        asyncio.run(_do_generate(wasi_id))
    except Exception as exc:
        log.error("content_task_failed", wasi_id=wasi_id, error=str(exc))
        raise self.retry(exc=exc)


async def _do_generate(wasi_id: str) -> None:
    from facebook_publisher.db.session import get_factory
    from facebook_publisher.db.models import (
        WasiProperty,
        PublicationQueue,
        QueueStatus,
        PublishedProperty,
    )
    from facebook_publisher.content.variant_store import get_or_generate
    from sqlalchemy import select

    factory = get_factory()
    async with factory() as session:
        # Property must exist and be active/available
        result = await session.execute(
            select(WasiProperty).where(WasiProperty.wasi_id == wasi_id)
        )
        prop = result.scalar_one_or_none()
        if prop is None or prop.deleted_at is not None:
            log.info("content_skip_missing_or_deleted", wasi_id=wasi_id)
            return

        # Skip inactive or sold/rented properties
        if prop.id_status_on_page not in (None, 1, 3):  # 1=active, 3=featured
            log.info("content_skip_inactive", wasi_id=wasi_id, status=prop.id_status_on_page)
            return

        if prop.id_availability not in (None, 1):  # 1=available
            log.info("content_skip_unavailable", wasi_id=wasi_id, avail=prop.id_availability)
            return

        # Deduplication check: already published and not due for republish
        dup_result = await session.execute(
            select(PublishedProperty).where(
                PublishedProperty.wasi_id == wasi_id,
                PublishedProperty.channel == "facebook_marketplace",
                PublishedProperty.is_active == True,
            )
        )
        existing_pub = dup_result.scalar_one_or_none()
        if existing_pub:
            from datetime import datetime
            if existing_pub.republish_after is None or existing_pub.republish_after > datetime.utcnow():
                log.info("content_skip_already_published", wasi_id=wasi_id)
                return

        # Check if there's already a pending/approved queue item for this property
        pending_result = await session.execute(
            select(PublicationQueue).where(
                PublicationQueue.wasi_id == wasi_id,
                PublicationQueue.status.in_([
                    QueueStatus.pending_approval,
                    QueueStatus.approved,
                    QueueStatus.publishing,
                ]),
            )
        )
        if pending_result.scalar_one_or_none():
            log.info("content_skip_already_queued", wasi_id=wasi_id)
            return

        # Generate (or retrieve cached) content
        variant = await get_or_generate(session, wasi_id)
        if variant is None:
            return

        # Add to approval queue
        queue_item = PublicationQueue(
            wasi_id=wasi_id,
            content_variant_id=variant.id,
            status=QueueStatus.pending_approval,
        )
        session.add(queue_item)
        await session.commit()
        log.info("queue_item_created", wasi_id=wasi_id, queue_id=queue_item.id)
