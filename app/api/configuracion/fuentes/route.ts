import { NextResponse } from 'next/server'
import { resolveCompanyId, getSessionPermissions } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const companyId = await resolveCompanyId()
    if (!(await getSessionPermissions()).accessSettings) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }
    const db = createAdminClient()

    const { data } = await db
      .from('companies')
      .select('wasi_token, wasi_company_id, last_wasi_sync_at, meta_webhook_token, tiktok_webhook_token')
      .eq('id', companyId)
      .single()

    const row = data as any

    return NextResponse.json({
      wasi_company_id: row?.wasi_company_id ?? '',
      wasi_token_set: Boolean(row?.wasi_token),
      last_wasi_sync_at: row?.last_wasi_sync_at ?? null,
      meta_webhook_token: row?.meta_webhook_token ?? null,
      tiktok_webhook_token: row?.tiktok_webhook_token ?? null,
    })
  } catch {
    return NextResponse.json({ error: 'No se pudieron cargar las credenciales' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const companyId = await resolveCompanyId()
    if (!(await getSessionPermissions()).accessSettings) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }
    const db = createAdminClient()
    const body = await req.json() as {
      wasi_company_id?: string
      wasi_token?: string
      generate_meta_token?: boolean
      generate_tiktok_token?: boolean
    }

    const updates: Record<string, string | null> = {}
    if (typeof body.wasi_company_id === 'string') {
      updates.wasi_company_id = body.wasi_company_id.trim() || null
    }
    if (typeof body.wasi_token === 'string' && body.wasi_token.trim()) {
      updates.wasi_token = body.wasi_token.trim()
    }
    if (body.generate_meta_token) {
      updates.meta_webhook_token = randomUUID()
    }
    if (body.generate_tiktok_token) {
      updates.tiktok_webhook_token = randomUUID()
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true })
    }

    const { data, error } = await (db.from('companies') as any)
      .update(updates)
      .eq('id', companyId)
      .select('meta_webhook_token, tiktok_webhook_token')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, meta_webhook_token: data?.meta_webhook_token, tiktok_webhook_token: data?.tiktok_webhook_token })
  } catch {
    return NextResponse.json({ error: 'No se pudieron guardar las credenciales' }, { status: 500 })
  }
}
