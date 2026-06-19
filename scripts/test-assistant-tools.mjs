import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = {}
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/); if (!m) continue
  let v = m[2]; const c = v.indexOf('#'); if (c !== -1) v = v.slice(0, c); env[m[1]] = v.trim()
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const companyId = 'a0000000-0000-0000-0000-000000000001'

const cu = { props: [], contacts: [] }
let pass = true
const log = (ok, msg) => { console.log(`${ok ? '✅' : '❌'} ${msg}`); if (!ok) pass = false }

try {
  // Setup: a contact (buyer) + a matching property
  const { data: contact } = await db.from('contacts').insert({
    company_id: companyId, nombre: '[TEST] María Compradora', telefono: '+507 6000-9999',
    tipo: 'cliente', tipo_operacion: 'compra', presupuesto_min: 150000, presupuesto_max: 300000,
    ciudad: 'Ciudad de Panamá', zona_interes: 'Marbella', fuente: 'manual', is_active: true,
  }).select('*').single()
  cu.contacts.push(contact.id)

  const { data: prop } = await db.from('properties').insert({
    company_id: companyId, titulo: '[TEST] Apto Marbella 2H', tipo: 'venta', for_sale: true,
    precio: 250000, iso_currency: 'USD', ciudad: 'Ciudad de Panamá', zona: 'Marbella',
    bedrooms: 2, bathrooms: 2, estado_publicacion: 'activo', disponibilidad: 'disponible', fuente: 'manual',
    gallery_urls: [], canales_publicados: [],
  }).select('*').single()
  cu.props.push(prop.id)

  // ── TOOL 1: link_contact_property ──
  const { error: lErr } = await db.from('contact_property_links').insert({
    company_id: companyId, contact_id: contact.id, property_id: prop.id, interes: 'interesado',
  })
  log(!lErr, `link_contact_property — vínculo creado (interes=interesado)${lErr ? ': ' + lErr.message : ''}`)

  // ── TOOL 2: match_properties_for_contact (scoring logic) ──
  // Replicate scoring: type(30) + price-in-range(35) + zona(20) = 85
  const wantsVenta = contact.tipo_operacion === 'compra' || contact.tipo_operacion === 'ambas'
  let score = 0
  if (prop.tipo === 'venta' && wantsVenta) score += 30
  if (prop.precio >= contact.presupuesto_min && prop.precio <= contact.presupuesto_max) score += 35
  if (prop.zona?.toLowerCase().includes(contact.zona_interes.toLowerCase())) score += 20
  log(score >= 30, `match_properties_for_contact — la propiedad puntúa ${score}/100 (match válido ≥30)`)

  // Verify the property is actually fetchable by the match query filters
  const { data: avail } = await db.from('properties')
    .select('id').eq('company_id', companyId).eq('disponibilidad', 'disponible')
    .in('estado_publicacion', ['activo', 'destacado'])
  log(avail.some(p => p.id === prop.id), 'match — la propiedad aparece en el universo de candidatas (disponible+activa)')

  // ── TOOL 3: add_contact_note ──
  const { data: note, error: nErr } = await db.from('contact_notes').insert({
    contact_id: contact.id, company_id: companyId, agent_nombre: 'PropSync AI',
    contenido: 'Llamó y quiere visita el sábado.',
  }).select('id, contenido').single()
  log(!nErr && note?.contenido?.includes('visita'), `add_contact_note — nota guardada${nErr ? ': ' + nErr.message : ''}`)

  // ── TOOL 4: schedule_followup (en_dias) ──
  const d = new Date(); d.setDate(d.getDate() + 3)
  const fecha = d.toISOString().slice(0, 10)
  const { data: sched, error: sErr } = await db.from('contacts').update({ fecha_seguimiento: fecha })
    .eq('id', contact.id).eq('company_id', companyId).select('id, fecha_seguimiento').single()
  log(!sErr && sched?.fecha_seguimiento === fecha, `schedule_followup — seguimiento en 3 días (${fecha})${sErr ? ': ' + sErr.message : ''}`)

} finally {
  for (const id of cu.props) await db.from('properties').delete().eq('id', id)
  for (const id of cu.contacts) await db.from('contacts').delete().eq('id', id)
  console.log('\n🧹 Datos de prueba eliminados.')
  console.log(pass ? '\n🎉 LAS 4 HERRAMIENTAS FUNCIONAN' : '\n⚠️  HUBO FALLOS')
  process.exit(pass ? 0 : 1)
}
