import { NextResponse } from 'next/server'
import { resolveCompanyId, getSessionPermissions } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const companyId = await resolveCompanyId()
    if (!(await getSessionPermissions()).accessSettings) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }
    const db = createAdminClient()

    const { data } = await (db.from('companies') as any)
      .select('description_prompt_template')
      .eq('id', companyId)
      .single()

    return NextResponse.json({ template: data?.description_prompt_template ?? null })
  } catch {
    return NextResponse.json({ error: 'Error al obtener la plantilla.' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const companyId = await resolveCompanyId()
    if (!(await getSessionPermissions()).accessSettings) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }
    const db = createAdminClient()
    const { template } = await req.json() as { template: string }

    await (db.from('companies') as any)
      .update({ description_prompt_template: template?.trim() || null })
      .eq('id', companyId)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error al guardar la plantilla.' }, { status: 500 })
  }
}
