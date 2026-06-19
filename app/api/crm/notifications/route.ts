import { createAdminClient } from '@/lib/supabase'
import { resolveCompanyId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const companyId = await resolveCompanyId()
  const db = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: stages } = await (db.from('crm_stages') as any)
    .select('slug')
    .eq('company_id', companyId)
    .eq('is_terminal', true)

  const terminalSlugs: string[] = (stages as any[] ?? []).map((s: any) => s.slug)

  let query = db
    .from('contacts')
    .select('id, nombre, fecha_seguimiento, etapa_crm')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .lte('fecha_seguimiento', today)
    .not('fecha_seguimiento', 'is', null)
    .order('fecha_seguimiento', { ascending: true })
    .limit(50)

  if (terminalSlugs.length > 0) {
    query = query.not('etapa_crm', 'in', `(${terminalSlugs.map((s) => `"${s}"`).join(',')})`)
  }

  const { data, error } = await (query as any)

  if (error) return Response.json({ count: 0, contacts: [] })
  return Response.json({ count: data?.length ?? 0, contacts: data ?? [] })
}
