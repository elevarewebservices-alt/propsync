import { NextRequest, NextResponse } from 'next/server'
import { resolveCompanyId, getSessionAgent } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import type { PropertyNoteRow } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const companyId = await resolveCompanyId()
  const db = createAdminClient()
  const { data, error } = await db
    .from('property_notes')
    .select('id, agent_nombre, contenido, created_at')
    .eq('property_id', params.id)
    .eq('company_id', companyId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json((data ?? []) as PropertyNoteRow[])
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const companyId = await resolveCompanyId()
  const agent = await getSessionAgent()
  const { contenido } = await request.json() as { contenido: string }

  if (!contenido?.trim()) {
    return NextResponse.json({ error: 'contenido es requerido' }, { status: 400 })
  }

  const agentNombre = (agent as any)?.nombre ?? 'Admin'

  const db = createAdminClient()
  const { data, error } = await (db.from('property_notes') as any)
    .insert({
      property_id: params.id,
      company_id: companyId,
      agent_nombre: agentNombre,
      contenido: contenido.trim(),
    })
    .select('id, agent_nombre, contenido, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data as PropertyNoteRow, { status: 201 })
}
