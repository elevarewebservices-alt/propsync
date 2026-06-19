import { createAdminClient } from '@/lib/supabase'
import { resolveCompanyId } from '@/lib/auth'
import { matchPropertiesForContact, PropertyForMatch } from '@/lib/matching'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const companyId = await resolveCompanyId()
  const db = createAdminClient()

  const [contactRes, propertiesRes] = await Promise.all([
    (db.from('contacts') as any)
      .select('*')
      .eq('id', params.id)
      .eq('company_id', companyId)
      .single(),
    db
      .from('properties')
      .select('id, titulo, precio, tipo, ciudad, zona, bedrooms, bathrooms, estado_publicacion, disponibilidad, main_image_url')
      .eq('company_id', companyId)
      .in('estado_publicacion', ['activo', 'destacado'])
      .eq('disponibilidad', 'disponible'),
  ])

  if (contactRes.error || !contactRes.data) {
    return Response.json({ error: 'Contact not found' }, { status: 404 })
  }

  const matches = matchPropertiesForContact(
    (propertiesRes.data ?? []) as PropertyForMatch[],
    contactRes.data,
  )

  return Response.json(matches)
}
