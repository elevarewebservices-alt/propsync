import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = {}
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (!m) continue
  let v = m[2]; const c = v.indexOf('#'); if (c !== -1) v = v.slice(0, c)
  env[m[1]] = v.trim()
}

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Grab a real property id first
const { data: list } = await db.from('properties').select('id, titulo, estado_publicacion').limit(3)
console.log('properties:', list)

if (!list?.length) { console.log('NO PROPERTIES'); process.exit(0) }

const id = list[0].id
console.log('\nTesting public query for id:', id)

// Exact query the public page runs
const { data, error } = await db
  .from('properties')
  .select(`
    id, codigo, titulo, descripcion, tipo, for_sale, for_rent,
    property_type_label, property_condition_label,
    country_label, region_label, ciudad, zona, address, floor,
    precio, iso_currency, sale_price, rent_price, maintenance_fee,
    area, built_area, bedrooms, bathrooms, garages, furnished, building_date,
    estado_publicacion, disponibilidad,
    main_image_url, gallery_urls, video,
    features_internal, features_external,
    companies(nombre, email)
  `)
  .eq('id', id)
  .maybeSingle()

if (error) console.log('❌ QUERY ERROR:', error.message, '| code:', error.code)
else console.log('✅ QUERY OK. titulo:', data?.titulo, '| company:', JSON.stringify(data?.companies))
