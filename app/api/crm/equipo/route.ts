import { createAdminClient } from '@/lib/supabase'
import { resolveCompanyId } from '@/lib/auth'

export async function GET() {
  const companyId = await resolveCompanyId()
  const db = createAdminClient()
  const today = new Date().toISOString().split('T')[0]
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [agentsRes, contactsRes, stagesRes] = await Promise.all([
    db
      .from('agents')
      .select('id, nombre, email, rol, is_active, auth_user_id, created_at')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
    (db.from('contacts') as any)
      .select('agente_asignado_id, etapa_crm, fecha_seguimiento, updated_at')
      .eq('company_id', companyId)
      .eq('is_active', true),
    (db.from('crm_stages') as any)
      .select('slug')
      .eq('company_id', companyId)
      .eq('is_terminal', true),
  ])

  const agents = (agentsRes.data ?? []) as any[]
  const contacts = (contactsRes.data ?? []) as any[]
  const terminalSlugs = new Set(((stagesRes.data ?? []) as any[]).map((s) => s.slug))

  const result = agents.map((agent) => {
    const mine = contacts.filter((c) => c.agente_asignado_id === agent.id)
    return {
      ...agent,
      leadsAsignados: mine.length,
      followUpsVencidos: mine.filter(
        (c) => c.fecha_seguimiento && c.fecha_seguimiento <= today
      ).length,
      cierresMes: mine.filter(
        (c) => terminalSlugs.has(c.etapa_crm) && c.updated_at >= monthStart
      ).length,
    }
  })

  return Response.json(result)
}
