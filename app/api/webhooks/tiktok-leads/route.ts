import { createAdminClient } from '@/lib/supabase'
import { sendPushToCompany } from '@/lib/push'
import { sendNewLeadNotification } from '@/lib/email'

// TikTok Lead Generation webhook
// GET: verify ownership via challenge echo
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const challenge = searchParams.get('challenge')
  const token = searchParams.get('token')

  if (!token) return new Response('Unauthorized', { status: 401 })

  const db = createAdminClient()
  const { data: company } = await (db.from('companies') as any)
    .select('id')
    .eq('tiktok_webhook_token', token)
    .single()

  if (!company) return new Response('Unauthorized', { status: 401 })

  // Echo back the challenge to verify ownership
  if (challenge) return new Response(challenge, { status: 200 })
  return new Response('OK', { status: 200 })
}

// POST: receive lead form submission
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data: company } = await (db.from('companies') as any)
    .select('id')
    .eq('tiktok_webhook_token', token)
    .single()

  if (!company) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ success: true })
  }

  // TikTok sends either a single object or wraps in { data: [...] }
  const leads: any[] = Array.isArray((body as any).data)
    ? (body as any).data
    : [body]

  for (const lead of leads) {
    // Parse field answers array: [{ field_id, field_name, value }]
    const answers: { field_id?: string; field_name?: string; value?: string }[] =
      lead.answers ?? lead.field_data ?? []

    const fields: Record<string, string> = {}
    for (const a of answers) {
      const key = (a.field_name ?? a.field_id ?? '').toLowerCase()
      fields[key] = a.value ?? ''
    }

    const firstName = fields['first_name'] ?? fields['nombre'] ?? ''
    const lastName = fields['last_name'] ?? fields['apellido'] ?? ''
    const nombre = (fields['full_name'] ?? fields['nombre_completo'] ?? `${firstName} ${lastName}`.trim()) || 'Lead TikTok'

    const email = fields['email'] ?? fields['correo'] ?? null
    const telefono = fields['phone_number'] ?? fields['phone'] ?? fields['telefono'] ?? null

    const campaignId: string = lead.campaign_id ?? lead.context?.campaign?.id ?? null
    const adGroupId: string = lead.adgroup_id ?? lead.context?.adgroup?.id ?? null
    const adId: string = lead.ad_id ?? lead.context?.ad?.id ?? null
    const formId: string = lead.form_id ?? null

    await (db.from('contacts') as any).insert({
      company_id: (company as any).id,
      nombre,
      email,
      telefono,
      whatsapp: telefono,
      fuente: 'web_form',
      meta_campaign: campaignId || null,
      meta_form: formId || null,
      meta_ad_set: adGroupId || null,
      etapa_crm: 'nuevo_lead',
      tags: ['tiktok'],
    })

    // Push notification to subscribed agents
    sendPushToCompany((company as any).id, {
      title: 'Nuevo lead de TikTok',
      body: nombre,
      url: '/crm',
      tag: 'nuevo-lead',
    }).catch(() => {})

    // Email notification to owner agent (fire-and-forget)
    db.from('agents')
      .select('nombre, email')
      .eq('company_id', (company as any).id)
      .eq('rol', 'owner')
      .eq('is_active', true)
      .single()
      .then(({ data: agentRaw }) => {
        const agent = agentRaw as { nombre: string; email: string } | null
        if (agent?.email) {
          sendNewLeadNotification(agent.email, agent.nombre, {
            nombre,
            fuente: 'web_form',
            tipo: 'cliente',
            telefono: telefono ?? null,
            email: email ?? null,
            ciudad: null,
            zona_interes: null,
          }, (company as any).id).catch(() => {})
        }
      })
  }

  return Response.json({ success: true })
}
