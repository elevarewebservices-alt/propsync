import { createAdminClient } from '@/lib/supabase'
import { sendPushToCompany } from '@/lib/push'
import { sendNewLeadNotification } from '@/lib/email'

// Meta sends a GET request first to verify the webhook
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const challenge = searchParams.get('hub.challenge')
  const verify = searchParams.get('hub.verify_token')
  const token = searchParams.get('token')

  if (!token) return new Response('Unauthorized', { status: 401 })

  const db = createAdminClient()
  const { data: company } = await (db.from('companies') as any)
    .select('id')
    .eq('meta_webhook_token', token)
    .single()

  if (!company) return new Response('Unauthorized', { status: 401 })

  if (mode === 'subscribe' && verify === token) {
    return new Response(challenge ?? '', { status: 200 })
  }

  return new Response('OK', { status: 200 })
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data: company } = await (db.from('companies') as any)
    .select('id')
    .eq('meta_webhook_token', token)
    .single()

  if (!company) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ success: true }) // Meta sometimes sends non-JSON pings
  }

  // Parse Meta Lead Ads payload
  const entry = (body.entry as any[])?.[0]
  const change = entry?.changes?.[0]
  const leadgenId: string = change?.value?.leadgen_id ?? ''
  const formId: string = change?.value?.form_id ?? ''
  const adId: string = change?.value?.ad_id ?? ''
  const campaignId: string = change?.value?.campaign_id ?? ''
  const fieldData: { name: string; values: string[] }[] = change?.value?.field_data ?? []

  const fields: Record<string, string> = {}
  for (const f of fieldData) {
    fields[f.name] = f.values?.[0] ?? ''
  }

  const nombre =
    fields['full_name'] ?? fields['first_name']
      ? `${fields['first_name'] ?? ''} ${fields['last_name'] ?? ''}`.trim()
      : fields['nombre'] ?? 'Lead Meta'

  const email = fields['email'] ?? null
  const telefono = fields['phone_number'] ?? fields['telefono'] ?? null

  await (db.from('contacts') as any).insert({
    company_id: (company as any).id,
    nombre,
    email,
    telefono,
    whatsapp: telefono,
    fuente: 'meta_leads',
    meta_campaign: campaignId || null,
    meta_form: formId || null,
    meta_ad_set: adId || null,
    etapa_crm: 'nuevo_lead',
    tags: ['meta'],
  })

  // Push notification to all subscribed agents
  sendPushToCompany((company as any).id, {
    title: 'Nuevo lead de Meta Ads',
    body: nombre,
    url: '/crm',
    tag: 'nuevo-lead',
  }).catch(() => {})

  // Email notification to owner agent
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
          fuente: 'meta_leads',
          tipo: 'cliente',
          telefono: telefono ?? null,
          email: email ?? null,
          ciudad: null,
          zona_interes: null,
        }, (company as any).id).catch(() => {})
      }
    })

  return Response.json({ success: true })
}
