import { NextRequest, NextResponse } from 'next/server'
import { resolveCompanyId } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Returns the contacts linked to a property, with the owner first.
// The owner is property.owner_contact_id (set when the property is created).
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const companyId = await resolveCompanyId()
  const db = createAdminClient()

  // The property tells us who the owner is.
  const { data: prop } = await db
    .from('properties')
    .select('owner_contact_id')
    .eq('id', params.id)
    .eq('company_id', companyId)
    .single()

  const ownerId = (prop as any)?.owner_contact_id ?? null

  // All links for this property, joined to the contact record.
  const { data: links } = await (db.from('contact_property_links') as any)
    .select('id, interes, contact_id, contacts(id, nombre, telefono, whatsapp, email)')
    .eq('property_id', params.id)
    .eq('company_id', companyId)

  type Row = {
    id: string
    interes: string
    contact_id: string
    contacts: { id: string; nombre: string; telefono: string | null; whatsapp: string | null; email: string | null } | null
  }

  const rows = (links ?? []) as Row[]

  // If the owner isn't represented in the links, fetch it directly so it always shows.
  let ownerContact: Row['contacts'] | null = null
  if (ownerId && !rows.some((r) => r.contact_id === ownerId)) {
    const { data: oc } = await db
      .from('contacts')
      .select('id, nombre, telefono, whatsapp, email')
      .eq('id', ownerId)
      .eq('company_id', companyId)
      .single()
    ownerContact = (oc as any) ?? null
  }

  const result = rows
    .filter((r) => r.contacts)
    .map((r) => ({
      linkId: r.id,
      id: r.contacts!.id,
      nombre: r.contacts!.nombre,
      telefono: r.contacts!.telefono,
      whatsapp: r.contacts!.whatsapp,
      email: r.contacts!.email,
      interes: r.interes,
      is_owner: r.contact_id === ownerId,
    }))

  if (ownerContact) {
    result.unshift({
      linkId: null as any,
      id: ownerContact.id,
      nombre: ownerContact.nombre,
      telefono: ownerContact.telefono,
      whatsapp: ownerContact.whatsapp,
      email: ownerContact.email,
      interes: 'propietario',
      is_owner: true,
    })
  }

  // Owner always first, then the rest.
  result.sort((a, b) => (a.is_owner === b.is_owner ? 0 : a.is_owner ? -1 : 1))

  return NextResponse.json(result)
}
