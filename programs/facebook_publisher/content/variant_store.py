from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from facebook_publisher.db.models import ContentVariant, WasiProperty
from facebook_publisher.content.generator import compute_generation_hash
from facebook_publisher.monitoring.logger import get_logger

log = get_logger(__name__)


async def get_or_generate(
    session: AsyncSession, wasi_id: str
) -> Optional[ContentVariant]:
    """
    Return an existing ContentVariant if the property hasn't changed since last
    generation, otherwise generate new content and persist it.
    Returns None if the property doesn't exist.
    """
    from facebook_publisher.content.generator import generate_for_property

    result = await session.execute(
        select(WasiProperty).where(WasiProperty.wasi_id == wasi_id)
    )
    prop: Optional[WasiProperty] = result.scalar_one_or_none()
    if prop is None:
        log.warning("property_not_found_for_content", wasi_id=wasi_id)
        return None

    prop_dict = _prop_to_dict(prop)
    gen_hash = compute_generation_hash(prop_dict)

    # Check if we already have up-to-date content
    existing = await session.execute(
        select(ContentVariant)
        .where(ContentVariant.wasi_id == wasi_id)
        .order_by(ContentVariant.generated_at.desc())
        .limit(1)
    )
    variant: Optional[ContentVariant] = existing.scalar_one_or_none()

    if variant and variant.generation_hash == gen_hash:
        log.debug("content_cache_hit", wasi_id=wasi_id)
        return variant

    # Generate new content
    log.info("generating_content", wasi_id=wasi_id)
    generated = await generate_for_property(prop_dict)

    variant = ContentVariant(
        wasi_id=wasi_id,
        title_v1=generated.get("title_v1"),
        title_v2=generated.get("title_v2"),
        title_v3=generated.get("title_v3"),
        description_v1=generated.get("description_v1"),
        description_v2=generated.get("description_v2"),
        marketplace_copy=generated.get("marketplace_copy"),
        hashtags=generated.get("hashtags"),
        cta=generated.get("cta"),
        tokens_used=generated.get("_tokens_used"),
        generation_hash=gen_hash,
    )
    session.add(variant)
    await session.flush()
    log.info("content_variant_saved", wasi_id=wasi_id, variant_id=variant.id)
    return variant


def _prop_to_dict(prop: WasiProperty) -> dict:
    return {
        "wasi_id": prop.wasi_id,
        "name": prop.name,
        "operation_type": prop.operation_type,
        "sale_price": float(prop.sale_price) if prop.sale_price is not None else None,
        "rent_price": float(prop.rent_price) if prop.rent_price is not None else None,
        "zone": prop.zone,
        "city": prop.city,
        "bedrooms": prop.bedrooms,
        "bathrooms": prop.bathrooms,
        "area": float(prop.area) if prop.area is not None else None,
        "property_type": prop.property_type,
        "description": prop.description,
    }
