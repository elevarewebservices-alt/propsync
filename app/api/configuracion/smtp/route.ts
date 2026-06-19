import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { resolveCompanyId, getSessionAgent } from '@/lib/auth'
import { encrypt } from '@/lib/crypto'

export const dynamic = 'force-dynamic'

export async function GET() {
  const companyId = await resolveCompanyId()
  const db        = createAdminClient()

  const { data } = await (db.from('companies') as any)
    .select('smtp_host, smtp_port, smtp_secure, smtp_user, smtp_from_email, smtp_from_name, smtp_password_enc, smtp_verified_at')
    .eq('id', companyId)
    .single()

  const c = data as any
  return NextResponse.json({
    host:        c?.smtp_host       ?? '',
    port:        c?.smtp_port       ?? 587,
    secure:      c?.smtp_secure     ?? false,
    user:        c?.smtp_user       ?? '',
    fromEmail:   c?.smtp_from_email ?? '',
    fromName:    c?.smtp_from_name  ?? '',
    hasPassword: Boolean(c?.smtp_password_enc),
    verifiedAt:  c?.smtp_verified_at ?? null,
  })
}

export async function PATCH(request: NextRequest) {
  const companyId = await resolveCompanyId()
  const me        = await getSessionAgent()

  if (!['owner', 'admin'].includes((me as any)?.rol ?? '')) {
    return NextResponse.json({ error: 'Sin permisos.' }, { status: 403 })
  }

  const body = await request.json() as {
    host?:      string
    port?:      number
    secure?:    boolean
    user?:      string
    password?:  string  // empty string = leave unchanged; explicit null = clear
    fromEmail?: string
    fromName?:  string
  }

  const patch: Record<string, unknown> = {}
  if (body.host       !== undefined) patch.smtp_host       = body.host       || null
  if (body.port       !== undefined) patch.smtp_port       = body.port       || null
  if (body.secure     !== undefined) patch.smtp_secure     = body.secure
  if (body.user       !== undefined) patch.smtp_user       = body.user       || null
  if (body.fromEmail  !== undefined) patch.smtp_from_email = body.fromEmail  || null
  if (body.fromName   !== undefined) patch.smtp_from_name  = body.fromName   || null

  if (body.password !== undefined && body.password !== '') {
    patch.smtp_password_enc = encrypt(body.password)
  }

  // Any update invalidates the verified flag — they'll need to retest
  patch.smtp_verified_at = null

  const db = createAdminClient()
  const { error } = await (db.from('companies') as any)
    .update(patch)
    .eq('id', companyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const companyId = await resolveCompanyId()
  const me        = await getSessionAgent()

  if (!['owner', 'admin'].includes((me as any)?.rol ?? '')) {
    return NextResponse.json({ error: 'Sin permisos.' }, { status: 403 })
  }

  const db = createAdminClient()
  const { error } = await (db.from('companies') as any)
    .update({
      smtp_host: null, smtp_port: null, smtp_secure: false,
      smtp_user: null, smtp_password_enc: null,
      smtp_from_email: null, smtp_from_name: null,
      smtp_verified_at: null,
    })
    .eq('id', companyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
