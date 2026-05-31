const BASE = process.env.NEXT_PUBLIC_FB_API_URL || 'http://localhost:8001'

// ── Types ─────────────────────────────────────────────────────────────────────

export type QueueStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'skipped'

export type PublishOutcome = 'success' | 'failure' | 'captcha' | 'blocked'

export interface FbPropertySnapshot {
  wasi_id: string
  name: string | null
  operation_type: string | null
  sale_price: number | null
  rent_price: number | null
  zone: string | null
  city: string | null
  main_image_url: string | null
  id_availability: number | null
  id_status_on_page: number | null
}

export interface FbContentPreview {
  title_v1: string | null
  title_v2: string | null
  title_v3: string | null
  description_v1: string | null
  marketplace_copy: string | null
  hashtags: string[] | null
  cta: string | null
}

export interface FbQueueItem {
  id: number
  wasi_id: string
  status: QueueStatus
  fb_account_id: number | null
  property: FbPropertySnapshot | null
  content: FbContentPreview | null
  approved_title: string | null
  approved_description: string | null
  approved_price: number | null
  scheduled_for: string | null
  approved_at: string | null
  approved_by: string | null
  retry_count: number
  last_error: string | null
  created_at: string
  updated_at: string
}

export interface FbQueueList {
  total: number
  page: number
  limit: number
  items: FbQueueItem[]
}

export interface FbHistoryItem {
  id: number
  queue_id: number | null
  wasi_id: string
  property_name: string | null
  channel: string
  outcome: PublishOutcome
  fb_listing_url: string | null
  screenshot_path: string | null
  error_detail: string | null
  duration_ms: number | null
  attempted_at: string
}

export interface FbHistoryList {
  total: number
  page: number
  limit: number
  items: FbHistoryItem[]
}

export interface FbMetrics {
  sync: {
    last_sync_at: string | null
    total_properties: number
    new_last_24h: number
    price_changes_last_24h: number
    status_changes_last_24h: number
    deleted_total: number
  }
  queue: {
    pending_approval: number
    approved_waiting: number
    published_last_7d: number
    failed_last_7d: number
  }
  accounts: Array<{
    id: number
    fb_name: string | null
    fb_email: string
    status: string
    posts_today: number
    daily_limit: number
  }>
  success_rate_last_30d: number | null
}

// ── API calls ─────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`FB API ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

export async function getQueue(
  status: QueueStatus = 'pending_approval',
  page = 1,
  limit = 20
): Promise<FbQueueList> {
  return apiFetch(`/api/fb/queue?status=${status}&page=${page}&limit=${limit}`)
}

export async function approveQueueItem(
  id: number,
  body: {
    approved_by: string
    approved_title?: string
    approved_description?: string
    approved_price?: number
    fb_account_id?: number
  }
): Promise<{ queue_id: number; status: string; celery_task_id: string | null }> {
  return apiFetch(`/api/fb/queue/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function rejectQueueItem(
  id: number,
  reason: string
): Promise<{ queue_id: number; status: string }> {
  return apiFetch(`/api/fb/queue/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export async function getHistory(page = 1, limit = 20): Promise<FbHistoryList> {
  return apiFetch(`/api/fb/history?page=${page}&limit=${limit}`)
}

export async function getMetrics(): Promise<FbMetrics> {
  return apiFetch('/api/fb/metrics')
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function formatPrice(item: FbPropertySnapshot | null): string {
  if (!item) return ''
  const price = item.sale_price ?? item.rent_price
  if (!price) return 'Precio a consultar'
  const suffix = item.operation_type?.toLowerCase().includes('alquiler') ? '/mes' : ''
  return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}${suffix}`
}

export const QUEUE_STATUS_LABEL: Record<QueueStatus, string> = {
  pending_approval: 'Pendiente aprobación',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  publishing: 'Publicando…',
  published: 'Publicado',
  failed: 'Fallido',
  skipped: 'Omitido',
}

export const QUEUE_STATUS_CLASS: Record<QueueStatus, string> = {
  pending_approval: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  publishing: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  skipped: 'bg-gray-100 text-gray-500 dark:bg-gray-800/30 dark:text-gray-400',
}
