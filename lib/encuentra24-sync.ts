// Encuentra24 leads → PropSync CRM, per company.
//
// Called every few minutes by /api/cron/encuentra24-leads (pinged from the
// Elevare droplet) and on demand from Configuración → Fuentes. Safe to run
// concurrently/repeatedly: contacts carry the Encuentra24 lead id in
// external_ref, unique per company (migration 032), so a re-run never
// duplicates a contact.

import { createAdminClient } from './supabase'
import { getCompanyAccess } from './subscription'
import { fetchEncuentra24Leads } from './encuentra24'
import { normalizeEncuentra24Lead, matchPropertyByTitle, phoneKey, type PortalLead } from './portal-leads'
import { sendPushToCompany } from './push'
import { sendNewLeadNotification } from './email'

export interface Encuentra24SyncResult {
  companyId: string
  status: 'ok' | 'skipped' | 'error'
  reason?: string
  fetched: number
  created: number
  merged: number      // matched an existing contact → note added instead
  duplicates: number  // already imported (external_ref)
  failed: number
}

const NOTE_AUTHOR = 'Encuentra24'

type Db = ReturnType<typeof createAdminClient>

interface ExistingContact { id: string; email: string | null; telefono: string | null; whatsapp: string | null }
interface PropertyLite { id: string; titulo: string; agente_asignado_id: string | null }

async function addNote(db: Db, companyId: string, contactId: string, contenido: string) {
  await (db.from('contact_notes') as any)
    .insert({ company_id: companyId, contact_id: contactId, agent_nombre: NOTE_AUTHOR, contenido })
    .then(() => null, () => null)
}

async function linkProperty(db: Db, companyId: string, contactId: string, propertyId: string) {
  await (db.from('contact_property_links') as any)
    .upsert({ company_id: companyId, contact_id: contactId, property_id: propertyId, interes: 'interesado' },
      { onConflict: 'contact_id,property_id', ignoreDuplicates: true })
    .then(() => null, () => null)
}

function leadNote(lead: PortalLead): string {
  return [
    `Nuevo interés desde Encuentra24${lead.tituloPropiedad ? `: ${lead.tituloPropiedad}` : ''}.`,
    lead.tipoPropiedad !== 'Otro' ? `Tipo de propiedad: ${lead.tipoPropiedad}.` : '',
    lead.pais ? `País (por teléfono): ${lead.pais}.` : '',
  ].filter(Boolean).join(' ')
}

export async function syncCompanyEncuentra24(companyId: string): Promise<Encuentra24SyncResult> {
  const result: Encuentra24SyncResult = { companyId, status: 'ok', fetched: 0, created: 0, merged: 0, duplicates: 0, failed: 0 }
  const db = createAdminClient()

  const { data: company } = await (db.from('companies') as any)
    .select('id, encuentra24_api_key, encuentra24_slug, encuentra24_last_lead_at, encuentra24_leads_imported')
    .eq('id', companyId)
    .maybeSingle()
  if (!company?.encuentra24_api_key || !company?.encuentra24_slug) {
    return { ...result, status: 'skipped', reason: 'Sin credenciales de Encuentra24' }
  }
  if ((await getCompanyAccess(companyId)).blocked) {
    return { ...result, status: 'skipped', reason: 'Suscripción inactiva' }
  }

  const watermark = Number(company.encuentra24_last_lead_at) || 0
  let leads: PortalLead[]
  try {
    const raw = await fetchEncuentra24Leads({ apiKey: company.encuentra24_api_key, slug: company.encuentra24_slug })
    leads = raw.map(normalizeEncuentra24Lead)
      .filter((l) => l.externalId && l.createdAt > watermark)
      .sort((a, b) => a.createdAt - b.createdAt)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await (db.from('companies') as any)
      .update({ encuentra24_last_sync_at: new Date().toISOString(), encuentra24_last_error: msg.slice(0, 500) })
      .eq('id', companyId)
    return { ...result, status: 'error', reason: msg }
  }
  result.fetched = leads.length

  if (leads.length === 0) {
    await (db.from('companies') as any)
      .update({ encuentra24_last_sync_at: new Date().toISOString(), encuentra24_last_error: null })
      .eq('id', companyId)
    return result
  }

  // Context loaded once per batch: active contacts (for email/phone dedupe),
  // listings (to link the lead to the property it asked about), agents.
  const [{ data: contactRows }, { data: propRows }, { data: agentRows }] = await Promise.all([
    (db.from('contacts') as any).select('id, email, telefono, whatsapp').eq('company_id', companyId).eq('is_active', true),
    (db.from('properties') as any).select('id, titulo, agente_asignado_id').eq('company_id', companyId).neq('estado_publicacion', 'basurero'),
    (db.from('agents') as any).select('id, nombre, email, rol, is_active').eq('company_id', companyId),
  ])
  const contacts = (contactRows ?? []) as ExistingContact[]
  const properties = (propRows ?? []) as PropertyLite[]
  const agents = (agentRows ?? []) as { id: string; nombre: string; email: string; rol: string; is_active: boolean }[]
  const agentName = new Map(agents.map((a) => [a.id, a.nombre]))

  const findExisting = (lead: PortalLead) => {
    const pk = phoneKey(lead.telefono)
    return contacts.find((c) =>
      (lead.email && c.email && c.email.toLowerCase() === lead.email) ||
      (pk && (phoneKey(c.telefono) === pk || phoneKey(c.whatsapp) === pk)),
    ) ?? null
  }

  let maxAttempted = watermark
  const newContacts: PortalLead[] = []

  for (const lead of leads) {
    maxAttempted = Math.max(maxAttempted, lead.createdAt)
    try {
      const property = lead.tituloPropiedad ? matchPropertyByTitle(lead.tituloPropiedad, properties) : null
      const existing = findExisting(lead)

      if (existing) {
        await addNote(db, companyId, existing.id, leadNote(lead))
        if (property) await linkProperty(db, companyId, existing.id, property.id)
        await (db.from('contacts') as any).update({ updated_at: new Date().toISOString() }).eq('id', existing.id)
        result.merged++
        continue
      }

      const agentId = property?.agente_asignado_id ?? null
      const { data: inserted, error } = await (db.from('contacts') as any)
        .insert({
          company_id: companyId,
          nombre: lead.nombre,
          email: lead.email,
          telefono: lead.telefono,
          whatsapp: lead.telefono,
          tipo: 'cliente',
          fuente: 'encuentra24',
          external_ref: lead.externalId,
          etapa_crm: 'nuevo_lead',
          tags: ['encuentra24'],
          ...(lead.pais ? { pais: lead.pais } : {}),
          ...(agentId ? { agente_asignado_id: agentId, agente_nombre: agentName.get(agentId) ?? null } : {}),
        })
        .select('id')
        .single()

      if (error) {
        if (error.code === '23505') { result.duplicates++; continue } // already imported
        throw new Error(error.message)
      }

      await addNote(db, companyId, inserted.id, leadNote(lead))
      if (property) await linkProperty(db, companyId, inserted.id, property.id)
      // Later leads in this batch from the same person merge into this contact.
      contacts.push({ id: inserted.id, email: lead.email, telefono: lead.telefono, whatsapp: lead.telefono })
      newContacts.push(lead)
      result.created++
    } catch (err) {
      result.failed++
      console.error('[encuentra24-sync] lead failed', companyId, lead.externalId, err instanceof Error ? err.message : err)
    }
  }

  // Every lead failing points to something systemic (schema, permissions):
  // keep the watermark so the whole batch is retried on the next run.
  const allFailed = result.failed === leads.length
  await (db.from('companies') as any)
    .update({
      encuentra24_last_sync_at: new Date().toISOString(),
      encuentra24_last_error: allFailed ? 'No se pudo importar ningún lead; se reintentará.' : null,
      ...(allFailed ? {} : { encuentra24_last_lead_at: maxAttempted }),
      encuentra24_leads_imported: (Number(company.encuentra24_leads_imported) || 0) + result.created,
    })
    .eq('id', companyId)
  if (allFailed) result.status = 'error'

  if (newContacts.length > 0) {
    await sendPushToCompany(companyId, {
      title: newContacts.length === 1 ? 'Nuevo lead de Encuentra24' : `${newContacts.length} leads nuevos de Encuentra24`,
      body: newContacts.slice(0, 3).map((l) => l.nombre).join(', '),
      url: '/crm',
      tag: 'nuevo-lead',
    }).catch(() => {})

    const owner = agents.find((a) => a.rol === 'owner' && a.is_active)
    if (owner?.email) {
      for (const l of newContacts.slice(0, 10)) {
        await sendNewLeadNotification(owner.email, owner.nombre, {
          nombre: l.nombre, fuente: 'encuentra24', tipo: 'cliente',
          telefono: l.telefono, email: l.email, ciudad: null, zona_interes: l.tituloPropiedad || null,
        }, companyId).catch(() => {})
      }
    }
  }

  return result
}

/** Every company with Encuentra24 credentials, sequentially. */
export async function syncAllEncuentra24(): Promise<Encuentra24SyncResult[]> {
  const db = createAdminClient()
  const { data } = await (db.from('companies') as any)
    .select('id')
    .not('encuentra24_api_key', 'is', null)
    .not('encuentra24_slug', 'is', null)
  const results: Encuentra24SyncResult[] = []
  for (const c of (data ?? []) as { id: string }[]) {
    try {
      results.push(await syncCompanyEncuentra24(c.id))
    } catch (err) {
      results.push({ companyId: c.id, status: 'error', reason: err instanceof Error ? err.message : String(err), fetched: 0, created: 0, merged: 0, duplicates: 0, failed: 0 })
    }
  }
  return results
}
