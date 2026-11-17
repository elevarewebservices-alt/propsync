import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from './platform-admin'

// Shared helpers for /api/admin/* (Elevare back office). Every handler starts
// with `const admin = await adminOr403(); if (admin instanceof NextResponse) return admin`.

export async function adminOr403(): Promise<string | NextResponse> {
  const email = await requirePlatformAdmin()
  if (!email) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  return email
}

export const PLAN_IDS = ['starter', 'pro'] as const
export const SUBSCRIPTION_STATUSES = ['trialing', 'active', 'past_due', 'canceled'] as const
export const PAYMENT_METHODS = ['ach', 'cash', 'paypal', 'other'] as const

export function isIsoDate(v: unknown): v is string {
  return typeof v === 'string' && !Number.isNaN(Date.parse(v))
}

/** Adds calendar months (Jan 31 + 1 → Feb 28/29, not Mar 3). */
export function addMonths(from: Date, months: number): Date {
  const d = new Date(from)
  const day = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(day, lastDay))
  return d
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
