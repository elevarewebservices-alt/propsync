import { createAdminClient } from '@/lib/supabase'
import { resolveCompanyId } from '@/lib/auth'
import { CrmStage } from '@/lib/types'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const companyId = await resolveCompanyId()
  const { searchParams } = new URL(request.url)
  const pipelineId = searchParams.get('pipeline_id')

  const db = createAdminClient()
  let query = (db.from('crm_stages') as any)
    .select('*')
    .eq('company_id', companyId)
    .order('position', { ascending: true })

  if (pipelineId) query = query.eq('pipeline_id', pipelineId)

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data ?? [])
}

export async function POST(request: Request) {
  const companyId = await resolveCompanyId()
  const body = await request.json()
  const db = createAdminClient()

  const slug = (body.nombre as string)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')

  const { data: existing } = await (db.from('crm_stages') as any)
    .select('position')
    .eq('company_id', companyId)
    .order('position', { ascending: false })
    .limit(1)

  const nextPos = existing && existing.length > 0 ? ((existing[0] as any).position ?? 0) + 1 : 0

  const { data, error } = await (db.from('crm_stages') as any)
    .insert({
      company_id: companyId,
      nombre: body.nombre,
      slug,
      color: body.color ?? '#6b7280',
      position: nextPos,
      is_terminal: body.is_terminal ?? false,
      requires_approval: body.requires_approval ?? false,
      required_fields: body.required_fields ?? [],
      pipeline_id: body.pipeline_id ?? null,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data as CrmStage, { status: 201 })
}
