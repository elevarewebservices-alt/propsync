import { createAdminClient } from './supabase'
import type { PropertyRow, PropertyInsert, PropertyUpdate } from './database.types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = ReturnType<typeof createAdminClient>

function db(): AnyClient {
  return createAdminClient()
}

export async function listProperties(companyId: string): Promise<PropertyRow[]> {
  const { data, error } = await db()
    .from('properties')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as PropertyRow[]
}

export async function getProperty(companyId: string, id: string): Promise<PropertyRow | null> {
  const { data, error } = await db()
    .from('properties')
    .select('*')
    .eq('company_id', companyId)
    .eq('id', id)
    .single()

  if (error) return null
  return data as PropertyRow
}

export async function createProperty(property: PropertyInsert): Promise<PropertyRow> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db().from('properties') as any)
    .insert(property)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as PropertyRow
}

export async function updateProperty(
  companyId: string,
  id: string,
  update: PropertyUpdate
): Promise<PropertyRow> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db().from('properties') as any)
    .update(update)
    .eq('company_id', companyId)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as PropertyRow
}

export async function deleteProperty(companyId: string, id: string): Promise<void> {
  const { error } = await db()
    .from('properties')
    .delete()
    .eq('company_id', companyId)
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// Fields that Wasi owns — safe to update on every sync.
// CRM fields (estado_publicacion, disponibilidad, etapa_crm, agente_asignado_id,
// notas, brevo_deal_id, etc.) are PropSync-owned and are never overwritten.
const WASI_UPDATE_FIELDS: (keyof PropertyInsert)[] = [
  'titulo', 'descripcion', 'address', 'reference',
  'tipo', 'for_sale', 'for_rent', 'for_transfer',
  'property_type_label', 'property_condition_label',
  'country_label', 'region_label', 'ciudad', 'zona',
  'latitude', 'longitude', 'zip_code', 'floor',
  'precio', 'iso_currency', 'sale_price', 'rent_price', 'maintenance_fee', 'rents_type_label',
  'area', 'built_area',
  'bedrooms', 'bathrooms', 'half_bathrooms', 'garages',
  'furnished',
  'id_status_on_page', 'id_availability', 'availability_label',
  'visits', 'network_share',
  'main_image_url', 'gallery_urls', 'video',
  'features_internal', 'features_external',
  'telefono_propietario',
]

// Upsert from Wasi — insert new properties, update only Wasi-owned fields on existing ones.
// PropSync CRM fields (status, stage, agent, notes…) are never overwritten.
export async function upsertFromWasi(
  companyId: string,
  props: PropertyInsert[]
): Promise<{ inserted: number; updated: number }> {
  if (props.length === 0) return { inserted: 0, updated: 0 }

  const client = db()

  // Fetch existing wasi_ids for this company
  const { data: existing } = await client
    .from('properties')
    .select('wasi_id')
    .eq('company_id', companyId)
    .not('wasi_id', 'is', null)

  const existingIds = new Set(
    ((existing ?? []) as { wasi_id: string }[]).map((r) => r.wasi_id)
  )

  const toInsert = props.filter((p) => !existingIds.has(p.wasi_id!))
  const toUpdate = props.filter((p) => existingIds.has(p.wasi_id!))

  let inserted = 0
  let updated = 0

  if (toInsert.length > 0) {
    const rows = toInsert.map((p) => ({ ...p, company_id: companyId }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (client.from('properties') as any)
      .insert(rows)
      .select('id')
    if (error) throw new Error(error.message)
    inserted = (data as { id: string }[])?.length ?? 0
  }

  if (toUpdate.length > 0) {
    const BATCH = 50
    for (let i = 0; i < toUpdate.length; i += BATCH) {
      const batch = toUpdate.slice(i, i + BATCH)
      await Promise.all(
        batch.map((p) => {
          const patch: Record<string, unknown> = {}
          for (const field of WASI_UPDATE_FIELDS) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (field in p) patch[field] = (p as any)[field]
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (client.from('properties') as any)
            .update(patch)
            .eq('company_id', companyId)
            .eq('wasi_id', p.wasi_id)
        })
      )
      updated += batch.length
    }
  }

  return { inserted, updated }
}
