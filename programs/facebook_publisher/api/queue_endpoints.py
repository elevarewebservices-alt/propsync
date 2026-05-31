from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from facebook_publisher.db.session import get_db
from facebook_publisher.db.models import (
    PublicationQueue,
    QueueStatus,
    WasiProperty,
    ContentVariant,
)
from facebook_publisher.api.schemas import (
    QueueListResponse,
    QueueItemResponse,
    PropertySnapshot,
    ContentPreview,
    ApproveRequest,
    ApproveResponse,
    RejectRequest,
)
from facebook_publisher.monitoring.logger import get_logger

router = APIRouter()
log = get_logger(__name__)


@router.get("", response_model=QueueListResponse)
async def list_queue(
    status: str = Query(default="pending_approval"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    try:
        queue_status = QueueStatus(status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

    offset = (page - 1) * limit

    total = await db.scalar(
        select(func.count()).select_from(PublicationQueue).where(
            PublicationQueue.status == queue_status
        )
    )

    result = await db.execute(
        select(PublicationQueue)
        .where(PublicationQueue.status == queue_status)
        .order_by(PublicationQueue.created_at.asc())
        .offset(offset)
        .limit(limit)
    )
    items_db = result.scalars().all()

    items = []
    for item in items_db:
        prop_snap = await _load_property_snapshot(db, item.wasi_id)
        content_preview = await _load_content_preview(db, item.content_variant_id)
        items.append(
            QueueItemResponse(
                id=item.id,
                wasi_id=item.wasi_id,
                status=item.status.value,
                fb_account_id=item.fb_account_id,
                property=prop_snap,
                content=content_preview,
                approved_title=item.approved_title,
                approved_description=item.approved_description,
                approved_price=float(item.approved_price) if item.approved_price else None,
                scheduled_for=item.scheduled_for,
                approved_at=item.approved_at,
                approved_by=item.approved_by,
                retry_count=item.retry_count,
                last_error=item.last_error,
                created_at=item.created_at,
                updated_at=item.updated_at,
            )
        )

    return QueueListResponse(total=total or 0, page=page, limit=limit, items=items)


@router.get("/{queue_id}", response_model=QueueItemResponse)
async def get_queue_item(queue_id: int, db: AsyncSession = Depends(get_db)):
    item = await _get_item_or_404(db, queue_id)
    prop_snap = await _load_property_snapshot(db, item.wasi_id)
    content_preview = await _load_content_preview(db, item.content_variant_id)
    return QueueItemResponse(
        id=item.id,
        wasi_id=item.wasi_id,
        status=item.status.value,
        fb_account_id=item.fb_account_id,
        property=prop_snap,
        content=content_preview,
        approved_title=item.approved_title,
        approved_description=item.approved_description,
        approved_price=float(item.approved_price) if item.approved_price else None,
        scheduled_for=item.scheduled_for,
        approved_at=item.approved_at,
        approved_by=item.approved_by,
        retry_count=item.retry_count,
        last_error=item.last_error,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.post("/{queue_id}/approve", response_model=ApproveResponse)
async def approve_queue_item(
    queue_id: int,
    body: ApproveRequest,
    db: AsyncSession = Depends(get_db),
):
    item = await _get_item_or_404(db, queue_id)

    if item.status != QueueStatus.pending_approval:
        raise HTTPException(
            status_code=409,
            detail=f"Item is not pending approval (current status: {item.status.value})",
        )

    item.status = QueueStatus.approved
    item.approved_title = body.approved_title
    item.approved_description = body.approved_description
    item.approved_price = body.approved_price
    item.approved_by = body.approved_by
    item.approved_at = datetime.utcnow()
    item.scheduled_for = body.scheduled_for
    item.updated_at = datetime.utcnow()

    if body.fb_account_id:
        item.fb_account_id = body.fb_account_id

    await db.commit()

    # Dispatch Playwright publish task (Phase 3 — stub dispatches safely if task doesn't exist)
    celery_task_id = _dispatch_publish_task(queue_id, body.scheduled_for)
    if celery_task_id:
        item.celery_task_id = celery_task_id
        await db.commit()

    log.info("queue_item_approved", queue_id=queue_id, approved_by=body.approved_by)

    return ApproveResponse(
        queue_id=queue_id,
        status="approved",
        celery_task_id=celery_task_id,
        scheduled_for=body.scheduled_for,
    )


@router.post("/{queue_id}/reject")
async def reject_queue_item(
    queue_id: int,
    body: RejectRequest,
    db: AsyncSession = Depends(get_db),
):
    item = await _get_item_or_404(db, queue_id)

    if item.status not in (QueueStatus.pending_approval, QueueStatus.approved):
        raise HTTPException(
            status_code=409,
            detail=f"Cannot reject item with status: {item.status.value}",
        )

    item.status = QueueStatus.rejected
    item.rejection_reason = body.reason
    item.updated_at = datetime.utcnow()
    await db.commit()

    log.info("queue_item_rejected", queue_id=queue_id, reason=body.reason)
    return {"queue_id": queue_id, "status": "rejected"}


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_item_or_404(db: AsyncSession, queue_id: int) -> PublicationQueue:
    result = await db.execute(
        select(PublicationQueue).where(PublicationQueue.id == queue_id)
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail="Queue item not found")
    return item


async def _load_property_snapshot(
    db: AsyncSession, wasi_id: str
) -> Optional[PropertySnapshot]:
    result = await db.execute(
        select(WasiProperty).where(WasiProperty.wasi_id == wasi_id)
    )
    prop = result.scalar_one_or_none()
    if prop is None:
        return None
    return PropertySnapshot(
        wasi_id=prop.wasi_id,
        name=prop.name,
        operation_type=prop.operation_type,
        sale_price=float(prop.sale_price) if prop.sale_price else None,
        rent_price=float(prop.rent_price) if prop.rent_price else None,
        zone=prop.zone,
        city=prop.city,
        main_image_url=prop.main_image_url,
        id_availability=prop.id_availability,
        id_status_on_page=prop.id_status_on_page,
    )


async def _load_content_preview(
    db: AsyncSession, variant_id: Optional[int]
) -> Optional[ContentPreview]:
    if variant_id is None:
        return None
    result = await db.execute(
        select(ContentVariant).where(ContentVariant.id == variant_id)
    )
    v = result.scalar_one_or_none()
    if v is None:
        return None
    return ContentPreview(
        title_v1=v.title_v1,
        title_v2=v.title_v2,
        title_v3=v.title_v3,
        description_v1=v.description_v1,
        marketplace_copy=v.marketplace_copy,
        hashtags=v.hashtags,
        cta=v.cta,
    )


def _dispatch_publish_task(queue_id: int, scheduled_for=None) -> Optional[str]:
    try:
        from facebook_publisher.queue.tasks.publish_task import publish_marketplace
        kwargs = {"args": [queue_id]}
        if scheduled_for:
            kwargs["eta"] = scheduled_for
        task = publish_marketplace.apply_async(**kwargs)
        return task.id
    except Exception as exc:
        log.warning(
            "publish_task_not_available",
            queue_id=queue_id,
            error=str(exc),
        )
        return None
