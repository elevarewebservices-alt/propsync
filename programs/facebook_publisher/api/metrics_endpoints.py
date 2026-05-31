from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from facebook_publisher.db.session import get_db
from facebook_publisher.db.models import (
    WasiProperty,
    SyncEvent,
    SyncEventType,
    PublicationQueue,
    QueueStatus,
    PublicationLog,
    PublishOutcome,
    FbAccount,
)
from facebook_publisher.api.schemas import (
    MetricsResponse,
    SyncMetrics,
    QueueMetrics,
    AccountHealth,
)

router = APIRouter()


@router.get("", response_model=MetricsResponse)
async def get_metrics(db: AsyncSession = Depends(get_db)):
    now = datetime.utcnow()
    last_24h = now - timedelta(hours=24)
    last_7d = now - timedelta(days=7)
    last_30d = now - timedelta(days=30)

    # ── Sync metrics ──────────────────────────────────────────────────────────
    total_props = await db.scalar(select(func.count()).select_from(WasiProperty))

    last_sync = await db.scalar(
        select(func.max(WasiProperty.last_synced_at))
    )

    new_24h = await db.scalar(
        select(func.count()).select_from(SyncEvent).where(
            and_(
                SyncEvent.event_type == SyncEventType.new,
                SyncEvent.created_at >= last_24h,
            )
        )
    )

    price_24h = await db.scalar(
        select(func.count()).select_from(SyncEvent).where(
            and_(
                SyncEvent.event_type == SyncEventType.price_changed,
                SyncEvent.created_at >= last_24h,
            )
        )
    )

    status_24h = await db.scalar(
        select(func.count()).select_from(SyncEvent).where(
            and_(
                SyncEvent.event_type == SyncEventType.status_changed,
                SyncEvent.created_at >= last_24h,
            )
        )
    )

    deleted_total = await db.scalar(
        select(func.count()).select_from(WasiProperty).where(
            WasiProperty.deleted_at.isnot(None)
        )
    )

    sync = SyncMetrics(
        last_sync_at=last_sync,
        total_properties=total_props or 0,
        new_last_24h=new_24h or 0,
        price_changes_last_24h=price_24h or 0,
        status_changes_last_24h=status_24h or 0,
        deleted_total=deleted_total or 0,
    )

    # ── Queue metrics ─────────────────────────────────────────────────────────
    pending = await db.scalar(
        select(func.count()).select_from(PublicationQueue).where(
            PublicationQueue.status == QueueStatus.pending_approval
        )
    )

    approved_waiting = await db.scalar(
        select(func.count()).select_from(PublicationQueue).where(
            PublicationQueue.status == QueueStatus.approved
        )
    )

    published_7d = await db.scalar(
        select(func.count()).select_from(PublicationQueue).where(
            and_(
                PublicationQueue.status == QueueStatus.published,
                PublicationQueue.published_at >= last_7d,
            )
        )
    )

    failed_7d = await db.scalar(
        select(func.count()).select_from(PublicationQueue).where(
            and_(
                PublicationQueue.status == QueueStatus.failed,
                PublicationQueue.updated_at >= last_7d,
            )
        )
    )

    queue = QueueMetrics(
        pending_approval=pending or 0,
        approved_waiting=approved_waiting or 0,
        published_last_7d=published_7d or 0,
        failed_last_7d=failed_7d or 0,
    )

    # ── Account health ────────────────────────────────────────────────────────
    result = await db.execute(select(FbAccount))
    accounts_db = result.scalars().all()
    accounts = [
        AccountHealth(
            id=a.id,
            fb_name=a.fb_name,
            fb_email=a.fb_email,
            status=a.status.value,
            posts_today=a.daily_post_count,
            daily_limit=a.daily_limit,
            cooldown_until=a.cooldown_until,
            last_post_at=a.last_post_at,
        )
        for a in accounts_db
    ]

    # ── Success rate last 30d ─────────────────────────────────────────────────
    total_30d = await db.scalar(
        select(func.count()).select_from(PublicationLog).where(
            PublicationLog.attempted_at >= last_30d
        )
    )
    success_30d = await db.scalar(
        select(func.count()).select_from(PublicationLog).where(
            and_(
                PublicationLog.outcome == PublishOutcome.success,
                PublicationLog.attempted_at >= last_30d,
            )
        )
    )
    success_rate: Optional[float] = None
    if total_30d:
        success_rate = round((success_30d or 0) / total_30d, 4)

    return MetricsResponse(
        sync=sync,
        queue=queue,
        accounts=accounts,
        success_rate_last_30d=success_rate,
    )
