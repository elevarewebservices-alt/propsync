import asyncio
from datetime import datetime

from sqlalchemy import select, func

from facebook_publisher.queue.celery_app import celery_app
from facebook_publisher.monitoring.logger import get_logger

log = get_logger(__name__)


@celery_app.task(
    name="facebook_publisher.queue.tasks.sync_task.sync_wasi",
    bind=True,
    max_retries=3,
    default_retry_delay=300,
    queue="sync",
)
def sync_wasi(self):
    """
    Fetch all active Wasi properties, upsert into PostgreSQL, emit sync events.
    Runs every FB_SYNC_INTERVAL_HOURS hours via Celery beat.
    """
    try:
        asyncio.run(_do_sync())
    except Exception as exc:
        log.error("sync_task_failed", error=str(exc))
        raise self.retry(exc=exc)


async def _do_sync() -> None:
    from facebook_publisher.db.base import engine
    from facebook_publisher.db.session import get_factory
    from facebook_publisher.db.models import WasiProperty
    from facebook_publisher.sync.wasi_fetcher import fetch_all_properties
    from facebook_publisher.sync.change_detector import upsert_property, mark_deleted
    from facebook_publisher.sync.event_emitter import emit

    log.info("sync_started")
    start = datetime.utcnow()

    factory = get_factory()
    seen_ids: set[str] = set()
    counts = {"new": 0, "price_changed": 0, "status_changed": 0, "updated": 0}

    async with factory() as session:
        async for raw in fetch_all_properties():
            wasi_id = str(raw.get("id_property", ""))
            if not wasi_id:
                continue
            seen_ids.add(wasi_id)

            try:
                prop, event_type = await upsert_property(session, raw)
                # Only emit events for meaningful changes (not plain "updated" no-ops)
                if event_type.value in counts:
                    counts[event_type.value] = counts.get(event_type.value, 0) + 1
                if event_type.value != "updated" or prop.content_hash != prop.content_hash:
                    await emit(session, wasi_id, event_type)
            except Exception as exc:
                log.error("property_upsert_failed", wasi_id=wasi_id, error=str(exc))
                await session.rollback()
                continue

        # Detect deletions: properties in DB not seen in this sync run
        result = await session.execute(
            select(WasiProperty.wasi_id).where(WasiProperty.deleted_at.is_(None))
        )
        all_db_ids = {row[0] for row in result.all()}
        deleted_ids = all_db_ids - seen_ids

        for wasi_id in deleted_ids:
            await mark_deleted(session, wasi_id)
            from facebook_publisher.db.models import SyncEventType
            await emit(session, wasi_id, SyncEventType.deleted)

        await session.commit()

    elapsed = (datetime.utcnow() - start).total_seconds()
    log.info(
        "sync_complete",
        seen=len(seen_ids),
        deleted=len(deleted_ids),
        elapsed_s=round(elapsed, 1),
        **counts,
    )
