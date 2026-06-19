import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = {}
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/); if (!m) continue
  let v = m[2]; const c = v.indexOf('#'); if (c !== -1) v = v.slice(0, c); env[m[1]] = v.trim()
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

// Use the seed company
const companyId = 'a0000000-0000-0000-0000-000000000001'

// Simulated assistant tool input
const input = {
  titulo: '[TEST] Apartamento en Marbella', precio: 250000, tipo: 'venta',
  tipo_inmueble: 'Apartamento', ciudad: 'Ciudad de Panamá', zona: 'Marbella',
  habitaciones: 2, banos: 2, garajes: 1, area: 110,
  propietario_nombre: 'Test Owner Bot', propietario_telefono: '+507 6000-1234', propietario_email: 'testowner@example.com',
}

const cleanup = { propertyId: null, contactId: null }
let pass = true
const log = (ok, msg) => { console.log(`${ok ? '✅' : '❌'} ${msg}`); if (!ok) pass = false }

try {
  // ── 1. Create property (mirrors executor payload) ──
  const tipo = input.tipo === 'arriendo' ? 'arriendo' : 'venta'
  const precio = Number(input.precio)
  const payload = {
    company_id: companyId, titulo: input.titulo, descripcion: null, tipo,
    for_sale: tipo === 'venta', for_rent: tipo === 'arriendo', for_transfer: false,
    property_type_label: input.tipo_inmueble ?? null, property_condition_label: null,
    precio, iso_currency: 'USD', sale_price: precio, rent_price: null,
    country_label: 'Panamá', ciudad: input.ciudad ?? null, zona: input.zona ?? null, address: null,
    bedrooms: input.habitaciones, bathrooms: input.banos, garages: input.garajes,
    area: String(input.area), building_date: null,
    estado_publicacion: 'inactivo', disponibilidad: 'disponible', fuente: 'manual',
    gallery_urls: [], canales_publicados: [],
  }
  const { data: prop, error: pErr } = await db.from('properties').insert(payload)
    .select('id, codigo, titulo, tipo, precio, estado_publicacion, owner_contact_id').single()
  log(!pErr && !!prop, `Propiedad creada${pErr ? ': ' + pErr.message : ` (codigo #${prop?.codigo}, estado ${prop?.estado_publicacion})`}`)
  if (pErr) throw new Error(pErr.message)
  cleanup.propertyId = prop.id

  log(prop.estado_publicacion === 'inactivo', 'Nace INACTIVA (no se publica sin revisión)')

  // ── 2. Owner: dedupe by phone, else create ──
  const normPhone = input.propietario_telefono.replace(/\D/g, '')
  let ownerId = null
  const { data: matches } = await db.from('contacts').select('id, nombre, telefono, whatsapp')
    .eq('company_id', companyId).or(`telefono.ilike.%${normPhone}%,whatsapp.ilike.%${normPhone}%`).limit(10)
  const hit = (matches ?? []).find(c => (c.telefono ?? '').replace(/\D/g, '') === normPhone || (c.whatsapp ?? '').replace(/\D/g, '') === normPhone)
  if (hit) { ownerId = hit.id; console.log(`   (reutilizó contacto existente ${hit.nombre})`) }
  if (!ownerId) {
    const { data: nc, error: cErr } = await db.from('contacts').insert({
      company_id: companyId, nombre: input.propietario_nombre, telefono: input.propietario_telefono,
      email: input.propietario_email, tipo: 'propietario', fuente: 'manual', is_active: true,
    }).select('id, nombre, tipo').single()
    log(!cErr && nc?.tipo === 'propietario', `Propietario creado como contacto tipo "propietario"${cErr ? ': ' + cErr.message : ''}`)
    if (cErr) throw new Error(cErr.message)
    ownerId = nc.id; cleanup.contactId = nc.id
  }

  // ── 3. Set owner + link ──
  await db.from('properties').update({ owner_contact_id: ownerId }).eq('id', prop.id)
  const { error: lErr } = await db.from('contact_property_links').insert({
    company_id: companyId, contact_id: ownerId, property_id: prop.id, interes: 'propietario',
  })
  log(!lErr, `Vínculo contacto↔propiedad creado (interes=propietario)${lErr ? ': ' + lErr.message : ''}`)

  // ── 4. Verify via the public contacts endpoint logic ──
  const { data: check } = await db.from('properties').select('owner_contact_id').eq('id', prop.id).single()
  log(check?.owner_contact_id === ownerId, 'owner_contact_id quedó guardado en la propiedad')

  const { data: links } = await db.from('contact_property_links')
    .select('interes, contact_id').eq('property_id', prop.id)
  log(links?.some(l => l.interes === 'propietario' && l.contact_id === ownerId), 'El propietario aparece en clientes enlazados')

} finally {
  // ── Cleanup ──
  if (cleanup.propertyId) await db.from('properties').delete().eq('id', cleanup.propertyId)
  if (cleanup.contactId) await db.from('contacts').delete().eq('id', cleanup.contactId)
  console.log('\n🧹 Datos de prueba eliminados.')
  console.log(pass ? '\n🎉 TODO FUNCIONA' : '\n⚠️  HUBO FALLOS')
  process.exit(pass ? 0 : 1)
}
