import hashlib
import json
from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from facebook_publisher.db.models import WasiProperty, SyncEventType
from facebook_publisher.monitoring.logger import get_logger

log = get_logger(__name__)


def compute_hash(prop: dict) -> str:
    """MD5 of the fields we care about for change detection."""
    key = {
        "name": prop.get("name"),
        "sale_price": prop.get("sale_price"),
        "rent_price": prop.get("rent_price"),
        "id_status_on_page": str(prop.get("id_status_on_page", "")),
        "id_availability": str(prop.get("id_availability", "")),
    }
    return hashlib.md5(json.dumps(key, sort_keys=True, default=str).encode()).hexdigest()


def extract_fields(raw: dict) -> dict:
    """
    Map Wasi API response fields to our model fields.
    Wasi field names verified against /property/search response.
    sale_price / rent_price are the canonical price fields (confirmed via
    CAMPOS_EXCLUIR labels: sale_price_label, rent_price_label).
    """
    # Gallery images come as a nested dict under "galleries"
    galleries = raw.get("galleries") or {}
    gallery_urls = [
        img.get("url") for img in galleries.values()
        if isinstance(img, dict) and img.get("url")
    ] if isinstance(galleries, dict) else []

    return {
        "wasi_id": str(raw.get("id_property", "")),
        "name": raw.get("name"),
        "operation_type": raw.get("operation_type"),
        "sale_price": _to_float(raw.get("sale_price")),
        "rent_price": _to_float(raw.get("rent_price")),
        "zone": raw.get("zone_label") or raw.get("zone"),
        "city": raw.get("city_label") or raw.get("city"),
        "bedrooms": _to_int(raw.get("bedrooms")),
        "bathrooms": _to_int(raw.get("bathrooms")),
        "area": _to_float(raw.get("area")),
        "id_status_on_page": _to_int(raw.get("id_status_on_page")),
        "id_availability": _to_int(raw.get("id_availability")),
        "property_type": raw.get("type_label") or raw.get("property_type"),
        "description": raw.get("observation") or raw.get("description"),
        "main_image_url": raw.get("main_image"),
        "gallery_urls": gallery_urls,
        "raw_data": raw,
    }


async def upsert_property(
    session: AsyncSession, raw: dict
) -> tuple[WasiProperty, SyncEventType]:
    """
    Upsert a property from the Wasi API response.
    Returns (model_instance, event_type) so the caller can emit the right event.
    """
    fields = extract_fields(raw)
    wasi_id = fields["wasi_id"]
    new_hash = compute_hash(fields)

    result = await session.execute(
        select(WasiProperty).where(WasiProperty.wasi_id == wasi_id)
    )
    existing: Optional[WasiProperty] = result.scalar_one_or_none()

    if existing is None:
        prop = WasiProperty(**fields, content_hash=new_hash)
        session.add(prop)
        await session.flush()
        log.debug("property_new", wasi_id=wasi_id)
        return prop, SyncEventType.new

    # Already exists — determine what changed
    event_type = _detect_change(existing, fields, new_hash)

    for k, v in fields.items():
        setattr(existing, k, v)
    existing.content_hash = new_hash
    existing.last_synced_at = datetime.utcnow()
    if event_type != SyncEventType.updated or existing.last_changed_at is None:
        existing.last_changed_at = datetime.utcnow()
    existing.deleted_at = None  # restore if it was soft-deleted

    await session.flush()
    return existing, event_type


def _detect_change(existing: WasiProperty, new_fields: dict, new_hash: str) -> SyncEventType:
    if existing.content_hash == new_hash:
        return SyncEventType.updated  # hash unchanged, just touch last_synced_at

    old_price = (existing.sale_price, existing.rent_price)
    new_price = (new_fields.get("sale_price"), new_fields.get("rent_price"))
    if old_price != new_price:
        return SyncEventType.price_changed

    old_status = (existing.id_status_on_page, existing.id_availability)
    new_status = (new_fields.get("id_status_on_page"), new_fields.get("id_availability"))
    if old_status != new_status:
        return SyncEventType.status_changed

    return SyncEventType.updated


async def mark_deleted(session: AsyncSession, wasi_id: str) -> None:
    result = await session.execute(
        select(WasiProperty).where(WasiProperty.wasi_id == wasi_id)
    )
    prop: Optional[WasiProperty] = result.scalar_one_or_none()
    if prop and prop.deleted_at is None:
        prop.deleted_at = datetime.utcnow()
        await session.flush()
        log.info("property_soft_deleted", wasi_id=wasi_id)


def _to_float(val) -> Optional[float]:
    if val is None or val == "":
        return None
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


def _to_int(val) -> Optional[int]:
    if val is None or val == "":
        return None
    try:
        return int(val)
    except (TypeError, ValueError):
        return None
