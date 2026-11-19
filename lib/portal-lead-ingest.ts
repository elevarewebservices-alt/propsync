// Turns normalized portal leads into CRM contacts — shared by every portal
// (Encuentra24, Compre o Alquile, …) so dedupe/linking/notification rules are
// identical everywhere.
//
//  - external_ref = the portal's lead id, unique per company + fuente
//    (migration 032) → re-running a batch never duplicates a contact.
//  - Same email/phone as an existing contact → add a note, don't duplicate.
//  - Link to the listing (exact id when the portal gives it, else title match)
//    and assign the listing's agent so a restricted agente sees their leads.
//  - One push per batch + one owner email per new contact (max 10).

import { createAdminClient } from './supabase'
import { matchPropertyByTitle, phoneKey, type PortalLead } from './portal-leads'
import { sendPushToCompany } from './push'
import { sendNewLeadNotification } from './email'

export type PortalFuente = 'encuentra24' | 'comprealquile' | 'inmotech'

export const PORTAL_LABEL: Record<PortalFuente, string> = {
  encuentra24: 'Encuentra24',
  comprealquile: 'Compre o Alquile',
  inmotech: 'Inmotech',
}

export interface IngestResult {
  created: number
  merged: number
  duplicates: number
  failed: number
}

type Db = ReturnType<typeof createAdminClient>
interface ExistingContact { id: string; email: string | null; telefono: string | null; whatsapp: string | null }
interface PropertyLite { id: string; titulo: string; agente_asignado_id: string | null }

async function addNote(db: Db, companyId: string, contactId: string, author: string, contenido: string) {
  await (db.from('contact_notes') as any)
    .insert({ company_id: companyId, contact_id: contactId, agent_nombre: author, contenido })
    .then(() => null, () => null)
}

async function linkProperty(db: Db, companyId: string, contactId: string, propertyId: string) {
  await (db.from('contact_property_links') as any)
    .upsert({ company_id: companyId, contact_id: contactId, property_id: propertyId, interes: 'interesado' },
      { onConflict: 'contact_id,property_id', ignoreDuplicates: true })
    .then(() => null, () => null)
}

function leadNote(label: string, lead: PortalLead, propertyTitle: string | null): string {
  const titulo = propertyTitle || lead.tituloPropiedad
  return [
    `Nuevo interés desde ${label}${titulo ? `: ${titulo}` : ''}.`,
    lead.mensaje ? `Mensaje: "${lead.mensaje.trim().slice(0, 1000)}"` : '',
    lead.tipoPropiedad && lead.tipoPropiedad !== 'Otro' ? `Tipo de propiedad: ${lead.tipoPropiedad}.` : '',
    lead.pais ? `País (por teléfono): ${lead.pais}.` : '',
  ].filter(Boolean).join(' ')
}

export async function ingestPortalLeads(companyId: string, fuente: PortalFuente, leads: PortalLead[]): Promise<IngestResult> {
  const result: IngestResult = { created: 0, merged: 0, duplicates: 0, failed: 0 }
  if (leads.length === 0) return result
  const db = createAdminClient()
  const label = PORTAL_LABEL[fuente]

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

  const created: PortalLead[] = []
  for (const lead of leads) {
    try {
      const property =
        (lead.propertyId ? properties.find((p) => p.id === lead.propertyId) : null) ??
        (lead.tituloPropiedad ? matchPropertyByTitle(lead.tituloPropiedad, properties) : null)
      const note = leadNote(label, lead, property?.titulo ?? null)
      const existing = findExisting(lead)

      if (existing) {
        // Skip if this exact portal lead was already merged before (re-run).
        const { data: dup } = await (db.from('contact_notes') as any)
          .select('id').eq('contact_id', existing.id).eq('contenido', note).limit(1)
        if (dup && dup.length > 0) { result.duplicates++; continue }
        await addNote(db, companyId, existing.id, label, note)
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
          fuente,
          external_ref: lead.externalId,
          etapa_crm: 'nuevo_lead',
          tags: [fuente],
          ...(lead.pais ? { pais: lead.pais } : {}),
          ...(agentId ? { agente_asignado_id: agentId, agente_nombre: agentName.get(agentId) ?? null } : {}),
        })
        .select('id')
        .single()

      if (error) {
        if (error.code === '23505') { result.duplicates++; continue }
        throw new Error(error.message)
      }

      await addNote(db, companyId, inserted.id, label, note)
      if (property) await linkProperty(db, companyId, inserted.id, property.id)
      contacts.push({ id: inserted.id, email: lead.email, telefono: lead.telefono, whatsapp: lead.telefono })
      created.push(lead)
      result.created++
    } catch (err) {
      result.failed++
      console.error(`[portal-leads:${fuente}] lead failed`, companyId, lead.externalId, err instanceof Error ? err.message : err)
    }
  }

  if (created.length > 0) {
    await sendPushToCompany(companyId, {
      title: created.length === 1 ? `Nuevo lead de ${label}` : `${created.length} leads nuevos de ${label}`,
      body: created.slice(0, 3).map((l) => l.nombre).join(', '),
      url: '/crm',
      tag: 'nuevo-lead',
    }).catch(() => {})

    const owner = agents.find((a) => a.rol === 'owner' && a.is_active)
    if (owner?.email) {
      for (const l of created.slice(0, 10)) {
        await sendNewLeadNotification(owner.email, owner.nombre, {
          nombre: l.nombre, fuente, tipo: 'cliente',
          telefono: l.telefono, email: l.email, ciudad: null, zona_interes: l.tituloPropiedad || null,
        }, companyId).catch(() => {})
      }
    }
  }
  return result
}
