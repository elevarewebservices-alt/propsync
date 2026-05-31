import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { sendTransactionalEmail } from '@/lib/email'
import type { AutomationCondition, AutomationAction } from '@/lib/types'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  // Load all active automations + terminal stage slugs + agents per company
  const [autoRes, stagesRes] = await Promise.all([
    (db.from('automations') as any).select('*').eq('is_active', true),
    (db.from('crm_stages') as any).select('company_id, slug').eq('is_terminal', true),
  ])

  const automations: any[] = autoRes.data ?? []
  if (automations.length === 0) return NextResponse.json({ ok: true, processed: 0 })

  const terminalByCompany = new Map<string, Set<string>>()
  for (const s of (stagesRes.data ?? []) as any[]) {
    if (!terminalByCompany.has(s.company_id)) terminalByCompany.set(s.company_id, new Set())
    terminalByCompany.get(s.company_id)!.add(s.slug)
  }

  let totalRuns = 0

  for (const auto of automations) {
    const companyId: string = auto.company_id
    const triggerType: string = auto.trigger_type
    const config: { dias?: number } = auto.trigger_config ?? {}
    const conditions: AutomationCondition[] = auto.conditions ?? []
    const actions: AutomationAction[] = auto.actions ?? []
    const dias = config.dias ?? 3

    const terminals = terminalByCompany.get(companyId) ?? new Set()

    // Build base query for contacts
    const now = new Date()
    let contactQuery = (db.from('contacts') as any)
      .select('id, nombre, email, etapa_crm, fuente, tipo, ciudad, agente_asignado_id, fecha_seguimiento, updated_at, company_id')
      .eq('company_id', companyId)
      .eq('is_active', true)

    if (triggerType === 'nuevo_lead') {
      const since = new Date(now.getTime() - dias * 24 * 60 * 60 * 1000).toISOString()
      contactQuery = contactQuery.gte('created_at', since)
    } else if (triggerType === 'sin_respuesta') {
      const cutoff = new Date(now.getTime() - dias * 24 * 60 * 60 * 1000).toISOString()
      contactQuery = contactQuery.lte('updated_at', cutoff)
    } else if (triggerType === 'follow_up_vencido') {
      contactQuery = contactQuery.lte('fecha_seguimiento', today).not('fecha_seguimiento', 'is', null)
    }

    const { data: contacts } = await contactQuery
    if (!contacts?.length) continue

    // Find contacts already processed by this automation recently
    const dedupDays = triggerType === 'follow_up_vencido' ? 7 : dias
    const dedupCutoff = new Date(now.getTime() - dedupDays * 24 * 60 * 60 * 1000).toISOString()
    const { data: recentLogs } = await (db.from('automation_logs') as any)
      .select('contact_id')
      .eq('automation_id', auto.id)
      .eq('status', 'success')
      .gte('created_at', dedupCutoff)
    const processedIds = new Set((recentLogs ?? []).map((l: any) => l.contact_id))

    // Load agents for this company (needed for actions)
    const { data: agents } = await (db.from('agents') as any)
      .select('id, nombre, email')
      .eq('company_id', companyId)
      .eq('is_active', true)
    const agentMap = new Map((agents ?? []).map((a: any) => [a.id, a]))

    for (const contact of contacts as any[]) {
      // Skip terminal stages
      if (terminals.has(contact.etapa_crm)) continue
      // Skip already processed
      if (processedIds.has(contact.id)) continue

      // Apply conditions
      const passes = conditions.every((cond) => {
        const val = contact[cond.field]
        return cond.op === 'eq' ? val === cond.value : val !== cond.value
      })
      if (!passes) continue

      const actionsRun: string[] = []
      let status = 'success'
      let errorMessage: string | undefined

      try {
        for (const action of actions) {
          if (action.type === 'cambiar_etapa' && action.config.etapa_slug) {
            await (db.from('contacts') as any)
              .update({ etapa_crm: action.config.etapa_slug, updated_at: new Date().toISOString() })
              .eq('id', contact.id)
            actionsRun.push(`cambiar_etapa → ${action.config.etapa_slug}`)

          } else if (action.type === 'asignar_agente' && action.config.agente_id) {
            const agent = agentMap.get(action.config.agente_id) as any
            await (db.from('contacts') as any)
              .update({ agente_asignado_id: action.config.agente_id, agente_nombre: agent?.nombre ?? null, updated_at: new Date().toISOString() })
              .eq('id', contact.id)
            actionsRun.push(`asignar_agente → ${agent?.nombre ?? action.config.agente_id}`)

          } else if (action.type === 'crear_nota' && action.config.nota) {
            await (db.from('contact_notes') as any).insert({
              contact_id: contact.id,
              company_id: companyId,
              agent_nombre: 'Automation',
              contenido: action.config.nota,
            })
            actionsRun.push('crear_nota')

          } else if (action.type === 'enviar_email' && action.config.asunto && contact.email) {
            try {
              await sendTransactionalEmail({
                to: contact.email,
                toName: contact.nombre,
                subject: action.config.asunto,
                htmlContent: `<p>${(action.config.cuerpo ?? '').replace(/\n/g, '<br/>')}</p>`,
                companyId,
              })
              actionsRun.push(`enviar_email → ${contact.email}`)
            } catch {
              // Email failure shouldn't block other actions
            }
          }
        }
      } catch (e) {
        status = 'error'
        errorMessage = String(e)
      }

      await (db.from('automation_logs') as any).insert({
        automation_id: auto.id,
        company_id: companyId,
        contact_id: contact.id,
        trigger_type: triggerType,
        actions_run: actionsRun,
        status,
        error_message: errorMessage ?? null,
      })

      if (status === 'success') totalRuns++
    }

    // Update automation run stats
    await (db.from('automations') as any)
      .update({ run_count: (auto.run_count ?? 0) + totalRuns, last_run_at: now.toISOString() })
      .eq('id', auto.id)
  }

  return NextResponse.json({ ok: true, processed: totalRuns, timestamp: new Date().toISOString() })
}
