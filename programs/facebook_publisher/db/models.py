import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from facebook_publisher.db.base import Base


# ── Enums ─────────────────────────────────────────────────────────────────────

class SyncEventType(enum.Enum):
    new = "new"
    updated = "updated"
    price_changed = "price_changed"
    status_changed = "status_changed"
    deleted = "deleted"
    restored = "restored"


class FbAccountStatus(enum.Enum):
    active = "active"
    cooldown = "cooldown"
    blocked = "blocked"
    disabled = "disabled"


class QueueStatus(enum.Enum):
    pending_approval = "pending_approval"
    approved = "approved"
    rejected = "rejected"
    publishing = "publishing"
    published = "published"
    failed = "failed"
    skipped = "skipped"


class PublishOutcome(enum.Enum):
    success = "success"
    failure = "failure"
    captcha = "captcha"
    blocked = "blocked"


# ── Tables ────────────────────────────────────────────────────────────────────

class WasiProperty(Base):
    __tablename__ = "wasi_properties"

    wasi_id: Mapped[str] = mapped_column(Text, primary_key=True)
    name: Mapped[Optional[str]] = mapped_column(Text)
    operation_type: Mapped[Optional[str]] = mapped_column(Text)  # "Venta" | "Alquiler"
    sale_price: Mapped[Optional[float]] = mapped_column(Numeric(15, 2))
    rent_price: Mapped[Optional[float]] = mapped_column(Numeric(15, 2))
    zone: Mapped[Optional[str]] = mapped_column(Text)
    city: Mapped[Optional[str]] = mapped_column(Text)
    bedrooms: Mapped[Optional[int]] = mapped_column(SmallInteger)
    bathrooms: Mapped[Optional[int]] = mapped_column(SmallInteger)
    area: Mapped[Optional[float]] = mapped_column(Numeric(10, 2))
    id_status_on_page: Mapped[Optional[int]] = mapped_column(SmallInteger)
    id_availability: Mapped[Optional[int]] = mapped_column(SmallInteger)
    property_type: Mapped[Optional[str]] = mapped_column(Text)
    description: Mapped[Optional[str]] = mapped_column(Text)
    main_image_url: Mapped[Optional[str]] = mapped_column(Text)
    gallery_urls: Mapped[Optional[dict]] = mapped_column(JSONB, default=list)
    raw_data: Mapped[Optional[dict]] = mapped_column(JSONB)
    content_hash: Mapped[str] = mapped_column(Text, nullable=False)
    first_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    last_synced_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    last_changed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    sync_events: Mapped[list["SyncEvent"]] = relationship(
        back_populates="property", cascade="all, delete-orphan"
    )
    content_variants: Mapped[list["ContentVariant"]] = relationship(
        back_populates="property", cascade="all, delete-orphan"
    )
    queue_items: Mapped[list["PublicationQueue"]] = relationship(
        back_populates="property", cascade="all, delete-orphan"
    )
    published_entries: Mapped[list["PublishedProperty"]] = relationship(
        back_populates="property", cascade="all, delete-orphan"
    )


class SyncEvent(Base):
    __tablename__ = "sync_events"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    wasi_id: Mapped[str] = mapped_column(
        Text, ForeignKey("wasi_properties.wasi_id", ondelete="CASCADE"), nullable=False
    )
    event_type: Mapped[SyncEventType] = mapped_column(
        Enum(SyncEventType, name="sync_event_type"), nullable=False
    )
    old_values: Mapped[Optional[dict]] = mapped_column(JSONB)
    new_values: Mapped[Optional[dict]] = mapped_column(JSONB)
    triggered_task: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )

    property: Mapped["WasiProperty"] = relationship(back_populates="sync_events")


class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[Optional[str]] = mapped_column(Text, unique=True)
    wasi_agent_id: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )

    fb_accounts: Mapped[list["FbAccount"]] = relationship(back_populates="agent")


class FbAccount(Base):
    __tablename__ = "fb_accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    agent_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("agents.id", ondelete="SET NULL")
    )
    fb_email: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    fb_name: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[FbAccountStatus] = mapped_column(
        Enum(FbAccountStatus, name="fb_account_status"), default=FbAccountStatus.active
    )
    daily_post_count: Mapped[int] = mapped_column(SmallInteger, default=0)
    daily_limit: Mapped[int] = mapped_column(SmallInteger, default=10)
    cooldown_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    last_post_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    session_file: Mapped[Optional[str]] = mapped_column(Text)
    active_hours_start: Mapped[int] = mapped_column(SmallInteger, default=8)
    active_hours_end: Mapped[int] = mapped_column(SmallInteger, default=21)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    agent: Mapped[Optional["Agent"]] = relationship(back_populates="fb_accounts")
    queue_items: Mapped[list["PublicationQueue"]] = relationship(
        back_populates="fb_account"
    )


class ContentVariant(Base):
    __tablename__ = "content_variants"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    wasi_id: Mapped[str] = mapped_column(
        Text, ForeignKey("wasi_properties.wasi_id", ondelete="CASCADE"), nullable=False
    )
    title_v1: Mapped[Optional[str]] = mapped_column(Text)
    title_v2: Mapped[Optional[str]] = mapped_column(Text)
    title_v3: Mapped[Optional[str]] = mapped_column(Text)
    description_v1: Mapped[Optional[str]] = mapped_column(Text)
    description_v2: Mapped[Optional[str]] = mapped_column(Text)
    marketplace_copy: Mapped[Optional[str]] = mapped_column(Text)
    hashtags: Mapped[Optional[list]] = mapped_column(ARRAY(Text))
    cta: Mapped[Optional[str]] = mapped_column(Text)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    model_used: Mapped[str] = mapped_column(Text, default="gpt-4o-mini")
    tokens_used: Mapped[Optional[int]] = mapped_column(Integer)
    generation_hash: Mapped[Optional[str]] = mapped_column(Text)

    property: Mapped["WasiProperty"] = relationship(back_populates="content_variants")
    queue_items: Mapped[list["PublicationQueue"]] = relationship(
        back_populates="content_variant"
    )


class PublicationQueue(Base):
    __tablename__ = "publication_queue"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    wasi_id: Mapped[str] = mapped_column(
        Text, ForeignKey("wasi_properties.wasi_id", ondelete="CASCADE"), nullable=False
    )
    fb_account_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("fb_accounts.id", ondelete="SET NULL")
    )
    content_variant_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("content_variants.id", ondelete="SET NULL")
    )
    status: Mapped[QueueStatus] = mapped_column(
        Enum(QueueStatus, name="queue_status"), default=QueueStatus.pending_approval
    )
    approved_title: Mapped[Optional[str]] = mapped_column(Text)
    approved_description: Mapped[Optional[str]] = mapped_column(Text)
    approved_price: Mapped[Optional[float]] = mapped_column(Numeric(15, 2))
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text)
    scheduled_for: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    approved_by: Mapped[Optional[str]] = mapped_column(Text)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    celery_task_id: Mapped[Optional[str]] = mapped_column(Text)
    retry_count: Mapped[int] = mapped_column(SmallInteger, default=0)
    max_retries: Mapped[int] = mapped_column(SmallInteger, default=3)
    last_error: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    property: Mapped["WasiProperty"] = relationship(back_populates="queue_items")
    fb_account: Mapped[Optional["FbAccount"]] = relationship(back_populates="queue_items")
    content_variant: Mapped[Optional["ContentVariant"]] = relationship(
        back_populates="queue_items"
    )
    log_entries: Mapped[list["PublicationLog"]] = relationship(
        back_populates="queue_item"
    )


class PublicationLog(Base):
    __tablename__ = "publication_log"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    queue_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("publication_queue.id", ondelete="SET NULL")
    )
    wasi_id: Mapped[str] = mapped_column(Text, nullable=False)
    fb_account_id: Mapped[Optional[int]] = mapped_column(Integer)
    channel: Mapped[str] = mapped_column(Text, default="facebook_marketplace")
    outcome: Mapped[PublishOutcome] = mapped_column(
        Enum(PublishOutcome, name="publish_outcome"), nullable=False
    )
    fb_listing_id: Mapped[Optional[str]] = mapped_column(Text)
    fb_listing_url: Mapped[Optional[str]] = mapped_column(Text)
    screenshot_path: Mapped[Optional[str]] = mapped_column(Text)
    error_detail: Mapped[Optional[str]] = mapped_column(Text)
    duration_ms: Mapped[Optional[int]] = mapped_column(Integer)
    attempted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )

    queue_item: Mapped[Optional["PublicationQueue"]] = relationship(
        back_populates="log_entries"
    )


class PublishedProperty(Base):
    __tablename__ = "published_properties"
    __table_args__ = (
        UniqueConstraint("wasi_id", "channel", "fb_account_id", name="uq_published_dedup"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    wasi_id: Mapped[str] = mapped_column(
        Text, ForeignKey("wasi_properties.wasi_id", ondelete="CASCADE"), nullable=False
    )
    channel: Mapped[str] = mapped_column(Text, default="facebook_marketplace")
    fb_account_id: Mapped[int] = mapped_column(Integer, nullable=False)
    fb_listing_id: Mapped[Optional[str]] = mapped_column(Text)
    fb_listing_url: Mapped[Optional[str]] = mapped_column(Text)
    published_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    republish_after: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    property: Mapped["WasiProperty"] = relationship(back_populates="published_entries")


class ScheduleConfig(Base):
    __tablename__ = "schedule_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    channel: Mapped[str] = mapped_column(Text, unique=True, default="facebook_marketplace")
    active_hour_start: Mapped[int] = mapped_column(SmallInteger, default=8)
    active_hour_end: Mapped[int] = mapped_column(SmallInteger, default=21)
    min_delay_between_posts_sec: Mapped[int] = mapped_column(Integer, default=300)
    max_delay_between_posts_sec: Mapped[int] = mapped_column(Integer, default=900)
    daily_limit_per_account: Mapped[int] = mapped_column(SmallInteger, default=10)
    republish_after_days: Mapped[int] = mapped_column(SmallInteger, default=30)
    sync_interval_hours: Mapped[int] = mapped_column(SmallInteger, default=2)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )
