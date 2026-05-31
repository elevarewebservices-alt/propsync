import { NextResponse } from 'next/server'
import { resolveCompanyId } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { detectAvailabilityIntent } from '@/lib/whatsapp'

/**
 * GET — Lista las respuestas WhatsApp recibidas (inbound) con info de la propiedad relacionada.
 */
export async function GET() {
  let companyId: string
  try {
    companyId = await resolveCompanyId()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createAdminClient()

  const { data: messages } = await db
    .from('whatsapp_messages')
    .select('id, contact_id, property_id, phone_number, body, created_at')
    .eq('company_id', companyId)
    .eq('direction', 'inbound')
    .order('created_at', { ascending: false })
    .limit(100)

  if (!messages || messages.length === 0) {
    return NextResponse.json({ responses: [] })
  }

  // Cargar propiedades relacionadas
  const propertyIds = (messages as any[])
    .map(m => m.property_id)
    .filter(Boolean) as string[]

  const { data: properties } = propertyIds.length > 0
    ? await db.from('properties').select('id, titulo, telefono_propietario').in('id', propertyIds)
    : { data: [] }

  const propertyMap = new Map(((properties ?? []) as any[]).map(p => [p.id, p]))

  const responses = (messages as any[]).map(m => {
    const property = m.property_id ? propertyMap.get(m.property_id) : null
    const intent = m.body ? detectAvailabilityIntent(m.body) : 'sin_respuesta'

    return {
      id: m.id,
      propertyId: m.property_id,
      propertyTitulo: property?.titulo ?? 'N/A',
      propietario: property?.telefono_propietario ?? m.phone_number,
      telefono: m.phone_number,
      respuesta: intent,
      mensaje: m.body,
      fecha: m.created_at,
      accionTomada: null,
    }
  })

  return NextResponse.json({ responses })
}
