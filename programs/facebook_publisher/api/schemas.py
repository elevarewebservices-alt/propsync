from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


# ── Shared ────────────────────────────────────────────────────────────────────

class PropertySnapshot(BaseModel):
    wasi_id: str
    name: Optional[str]
    operation_type: Optional[str]
    sale_price: Optional[float]
    rent_price: Optional[float]
    zone: Optional[str]
    city: Optional[str]
    main_image_url: Optional[str]
    id_availability: Optional[int]
    id_status_on_page: Optional[int]

    model_config = ConfigDict(from_attributes=True)


# ── Metrics ───────────────────────────────────────────────────────────────────

class SyncMetrics(BaseModel):
    last_sync_at: Optional[datetime]
    total_properties: int
    new_last_24h: int
    price_changes_last_24h: int
    status_changes_last_24h: int
    deleted_total: int


class QueueMetrics(BaseModel):
    pending_approval: int
    approved_waiting: int
    published_last_7d: int
    failed_last_7d: int


class AccountHealth(BaseModel):
    id: int
    fb_name: Optional[str]
    fb_email: str
    status: str
    posts_today: int
    daily_limit: int
    cooldown_until: Optional[datetime]
    last_post_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class MetricsResponse(BaseModel):
    sync: SyncMetrics
    queue: QueueMetrics
    accounts: list[AccountHealth]
    success_rate_last_30d: Optional[float]


# ── Queue (approval workflow) ──────────────────────────────────────────────────

class ContentPreview(BaseModel):
    title_v1: Optional[str]
    title_v2: Optional[str]
    title_v3: Optional[str]
    description_v1: Optional[str]
    marketplace_copy: Optional[str]
    hashtags: Optional[list[str]]
    cta: Optional[str]

    model_config = ConfigDict(from_attributes=True)


class QueueItemResponse(BaseModel):
    id: int
    wasi_id: str
    status: str
    fb_account_id: Optional[int]
    property: Optional[PropertySnapshot]
    content: Optional[ContentPreview]
    approved_title: Optional[str]
    approved_description: Optional[str]
    approved_price: Optional[float]
    scheduled_for: Optional[datetime]
    approved_at: Optional[datetime]
    approved_by: Optional[str]
    retry_count: int
    last_error: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class QueueListResponse(BaseModel):
    total: int
    page: int
    limit: int
    items: list[QueueItemResponse]


class ApproveRequest(BaseModel):
    approved_by: str
    approved_title: Optional[str] = None
    approved_description: Optional[str] = None
    approved_price: Optional[float] = None
    scheduled_for: Optional[datetime] = None
    fb_account_id: Optional[int] = None


class ApproveResponse(BaseModel):
    queue_id: int
    status: str
    celery_task_id: Optional[str]
    scheduled_for: Optional[datetime]


class RejectRequest(BaseModel):
    reason: str


# ── History ───────────────────────────────────────────────────────────────────

class HistoryItemResponse(BaseModel):
    id: int
    queue_id: Optional[int]
    wasi_id: str
    property_name: Optional[str]
    channel: str
    outcome: str
    fb_listing_url: Optional[str]
    screenshot_path: Optional[str]
    error_detail: Optional[str]
    duration_ms: Optional[int]
    attempted_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HistoryListResponse(BaseModel):
    total: int
    page: int
    limit: int
    items: list[HistoryItemResponse]


# ── Accounts ──────────────────────────────────────────────────────────────────

class AccountResponse(BaseModel):
    id: int
    fb_email: str
    fb_name: Optional[str]
    status: str
    daily_post_count: int
    daily_limit: int
    cooldown_until: Optional[datetime]
    last_post_at: Optional[datetime]
    active_hours_start: int
    active_hours_end: int
    agent_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CreateAccountRequest(BaseModel):
    fb_email: str
    fb_name: Optional[str] = None
    daily_limit: int = 10
    agent_id: Optional[int] = None


class CreateAgentRequest(BaseModel):
    name: str
    email: Optional[str] = None
    wasi_agent_id: Optional[str] = None
