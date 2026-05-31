from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from facebook_publisher.db.models import (
    SyncEvent,
    SyncEventType,
    PublicationQueue,
    QueueStatus,
    WasiProperty,
)
from facebook_publisher.monitoring.logger import get_logger

log = get_logger(__name__)


async def emit(
    session: AsyncSession,
    wasi_id: str,
    event_type: SyncEventType,
    old_values: Optional[dict] = None,
    new_values: Optional[dict] = None,
) -> SyncEvent:
    """
    Write a sync_event row and trigger downstream Celery tasks when appropriate.
    Safe to call even if Celery is not yet running — task dispatch failures are
    logged and swallowed so the sync itself never fails because of them.
    """
    event = SyncEvent(
        wasi_id=wasi_id,
        event_type=event_type,
        old_values=old_values,
        new_values=new_values,
    )
    session.add(event)
    await session.flush()

    if event_type in (SyncEventType.new, SyncEventType.price_changed):
        task_id = _dispatch_content_task(wasi_id)
        if task_id:
            event.triggered_task = task_id
            await session.flush()

    elif event_type in (SyncEventType.deleted, SyncEventType.status_changed):
        await _cancel_pending_queue_items(session, wasi_id, reason=event_type.value)

    log.debug(
        "sync_event_emitted",
        wasi_id=wasi_id,
        event_type=event_type.value,
        triggered_task=event.triggered_task,
    )
    return event


def _dispatch_content_task(wasi_id: str) -> Optional[str]:
    try:
        from facebook_publisher.queue.tasks.content_task import generate_content
        task = generate_content.delay(wasi_id)
        return task.id
    except Exception as exc:
        log.warning("content_task_dispatch_failed", wasi_id=wasi_id, error=str(exc))
        return None


async def _cancel_pending_queue_items(
    session: AsyncSession, wasi_id: str, reason: str
) -> None:
    cancellable = {QueueStatus.pending_approval, QueueStatus.approved}
    result = await session.execute(
        select(PublicationQueue).where(
            PublicationQueue.wasi_id == wasi_id,
            PublicationQueue.status.in_(cancellable),
        )
    )
    items = result.scalars().all()
    for item in items:
        item.status = QueueStatus.skipped
        item.rejection_reason = f"Auto-cancelled: property {reason}"
        item.updated_at = datetime.utcnow()
    if items:
        log.info(
            "queue_items_cancelled",
            wasi_id=wasi_id,
            count=len(items),
            reason=reason,
        )
    await session.flush()
