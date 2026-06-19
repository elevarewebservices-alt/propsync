import { NextResponse } from 'next/server'
import { resolveCompanyId, getSessionAgent } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const companyId = await resolveCompanyId()
  const db = createAdminClient()

  const { data, error } = await db
    .from('agents')
    .select('id, nombre, email, telefono, rol, is_active, created_at, auth_user_id')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
