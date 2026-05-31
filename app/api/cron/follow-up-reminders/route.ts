import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { sendFollowUpReminderEmail, ReminderContact } from '@/lib/email'
import webpush from 'web-push'

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_CONTACT_EMAIL ?? 'admin@propsync.app'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db    = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  // Fetch all terminal stage slugs per company so we can exclude them
  const { data: terminalStagesData } = await (db.from('crm_stages') as any)
    .select('company_id, slug')
    .eq('is_terminal', true)

  const terminalByCompany = new Map<string, Set<string>>()
  for (const row of (terminalStagesData as any[] ?? [])) {
    if (!terminalByCompany.has(row.company_id)) {
      terminalByCompany.set(row.company_id, new Set())
    }
    terminalByCompany.get(row.company_id)!.add(row.slug)
  }

  // Fetch all contacts with follow-ups due today or overdue that are assigned to an agent
  const { data: contacts, error } = await (db.from('contacts') as any)
    .select('nombre, fecha_seguimiento, etapa_crm, agente_asignado_id, company_id')
    .eq('is_active', true)
    .lte('fecha_seguimiento', today)
    .not('fecha_seguimiento', 'is', null)
    .not('agente_asignado_id', 'is', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Group by agent, excluding contacts in terminal stages
  const agentMap = new Map<string, ReminderContact[]>()
  for (const c of (contacts as any[] ?? [])) {
    const terminals = terminalByCompany.get(c.company_id)
    if (terminals?.has(c.etapa_crm)) continue

    if (!agentMap.has(c.agente_asignado_id)) agentMap.set(c.agente_asignado_id, [])
    agentMap.get(c.agente_asignado_id)!.push({
      nombre:            c.nombre,
      fecha_seguimiento: c.fecha_seguimiento,
      etapa_crm:         c.etapa_crm,
    })
  }

  if (agentMap.size === 0) {
    return NextResponse.json({ ok: true, sent: 0, timestamp: new Date().toISOString() })
  }

  // Fetch agent email/nombre/company for the relevant agent IDs
  const agentIds = Array.from(agentMap.keys())
  const { data: agents } = await (db.from('agents') as any)
    .select('id, nombre, email, company_id')
    .in('id', agentIds)
    .eq('is_active', true)

  // Pre-load push subscriptions for all relevant agents
  const { data: pushSubs } = await (db.from('push_subscriptions') as any)
    .select('agent_id, endpoint, p256dh, auth')
    .in('agent_id', agentIds)

  const pushByAgent = new Map<string, any[]>()
  for (const sub of (pushSubs ?? []) as any[]) {
    if (!pushByAgent.has(sub.agent_id)) pushByAgent.set(sub.agent_id, [])
    pushByAgent.get(sub.agent_id)!.push(sub)
  }

  const results: { agent: string; contacts: number; error?: string }[] = []
  let sent = 0

  for (const agent of (agents as any[] ?? [])) {
    const agentContacts = agentMap.get(agent.id) ?? []
    if (agentContacts.length === 0) continue

    // Send email
    try {
      await sendFollowUpReminderEmail(agent.email, agent.nombre, agentContacts, agent.company_id)
      results.push({ agent: agent.email, contacts: agentContacts.length })
      sent++
    } catch (err) {
      results.push({ agent: agent.email, contacts: agentContacts.length, error: String(err) })
    }

    // Send push notifications if VAPID configured
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      const subs = pushByAgent.get(agent.id) ?? []
      const payload = JSON.stringify({
        title: `${agentContacts.length} seguimiento${agentContacts.length > 1 ? 's' : ''} pendiente${agentContacts.length > 1 ? 's' : ''}`,
        body: agentContacts.map((c) => c.nombre).slice(0, 3).join(', ') + (agentContacts.length > 3 ? '…' : ''),
        url: '/crm',
        tag: 'follow-up-reminder',
      })
      const expiredEndpoints: string[] = []
      await Promise.allSettled(
        subs.map(async (sub: any) => {
          try {
            await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
          } catch (e: any) {
            if (e?.statusCode === 410) expiredEndpoints.push(sub.endpoint)
          }
        })
      )
      for (const ep of expiredEndpoints) {
        await (db.from('push_subscriptions') as any).delete().eq('endpoint', ep)
      }
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    timestamp: new Date().toISOString(),
    results,
  })
}
