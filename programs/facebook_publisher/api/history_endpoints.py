from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from facebook_publisher.db.session import get_db
from facebook_publisher.db.models import PublicationLog, WasiProperty
from facebook_publisher.api.schemas import HistoryListResponse, HistoryItemResponse

router = APIRouter()


@router.get("", response_model=HistoryListResponse)
async def list_history(
    wasi_id: Optional[str] = Query(default=None),
    outcome: Optional[str] = Query(default=None),
    from_date: Optional[datetime] = Query(default=None),
    to_date: Optional[datetime] = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * limit
    filters = []

    if wasi_id:
        filters.append(PublicationLog.wasi_id == wasi_id)
    if outcome:
        filters.append(PublicationLog.outcome.cast(str) == outcome)
    if from_date:
        filters.append(PublicationLog.attempted_at >= from_date)
    if to_date:
        filters.append(PublicationLog.attempted_at <= to_date)

    where_clause = and_(*filters) if filters else True

    total = await db.scalar(
        select(func.count()).select_from(PublicationLog).where(where_clause)
    )

    result = await db.execute(
        select(PublicationLog)
        .where(where_clause)
        .order_by(PublicationLog.attempted_at.desc())
        .offset(offset)
        .limit(limit)
    )
    logs = result.scalars().all()

    # Bulk-fetch property names
    wasi_ids = {log.wasi_id for log in logs}
    prop_names: dict[str, Optional[str]] = {}
    if wasi_ids:
        props_result = await db.execute(
            select(WasiProperty.wasi_id, WasiProperty.name).where(
                WasiProperty.wasi_id.in_(wasi_ids)
            )
        )
        prop_names = {row[0]: row[1] for row in props_result.all()}

    items = [
        HistoryItemResponse(
            id=log.id,
            queue_id=log.queue_id,
            wasi_id=log.wasi_id,
            property_name=prop_names.get(log.wasi_id),
            channel=log.channel,
            outcome=log.outcome.value,
            fb_listing_url=log.fb_listing_url,
            screenshot_path=log.screenshot_path,
            error_detail=log.error_detail,
            duration_ms=log.duration_ms,
            attempted_at=log.attempted_at,
        )
        for log in logs
    ]

    return HistoryListResponse(total=total or 0, page=page, limit=limit, items=items)
