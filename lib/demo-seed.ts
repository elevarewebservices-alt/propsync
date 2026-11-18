import { randomUUID } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { createAdminClient } from './supabase'
import { seedDefaultCrm } from './provision'
import { MOCK_PROPERTIES } from './mock-data'
import { demoEmail } from './demo'

// (Re)builds the public demo company from scratch. Idempotent: safe to run on
// every cron tick. Bootstraps the demo auth user + company + owner agent on
// first run, so only DEMO_LOGIN_EMAIL / DEMO_LOGIN_PASSWORD need configuring.
//
// Also resets the demo user's password every run: a visitor could otherwise
// change it from the browser (Supabase auth calls bypass our middleware) and
// lock everyone else out until the next reset.

const DEMO_COMPANY_NAME = 'Inmobiliaria Demo Panamá'
const DEMO_AGENT_NAME = 'Ana Demo'

const TOUR_ROOMS = [
  { url: '/tour-demo/sala.webp', label: 'Sala' },
  { url: '/tour-demo/cocina.webp', label: 'Cocina' },
  { url: '/tour-demo/habitacion.webp', label: 'Habitación principal' },
  { url: '/tour-demo/balcon.webp', label: 'Balcón' },
]

interface DemoContact {
  nombre: string
  telefono: string
  email: string
  tipo: 'cliente' | 'propietario'
  etapa: string
  operacion: 'compra' | 'alquiler'
  zona: string
  min: number | null
  max: number | null
  fuente: 'manual' | 'meta_leads' | 'web_form' | 'referido'
  seguimientoDias: number | null
  tags: string[]
  nota: string
}

const CONTACTS: DemoContact[] = [
  { nombre: 'María Fernanda Ríos', telefono: '+50760010001', email: 'maria.rios@example.com', tipo: 'cliente', etapa: 'nuevo_lead', operacion: 'compra', zona: 'Costa del Este', min: 450000, max: 650000, fuente: 'meta_leads', seguimientoDias: 0, tags: ['caliente'], nota: 'Llegó por anuncio de Facebook. Busca 3 recámaras cerca de colegios.' },
  { nombre: 'José Antonio Castillo', telefono: '+50760010002', email: 'jcastillo@example.com', tipo: 'cliente', etapa: 'nuevo_lead', operacion: 'alquiler', zona: 'San Francisco', min: 1200, max: 1800, fuente: 'web_form', seguimientoDias: 1, tags: [], nota: 'Trabaja en Torre de las Américas. Quiere amoblado.' },
  { nombre: 'Lucía Herrera', telefono: '+50760010003', email: 'lucia.h@example.com', tipo: 'cliente', etapa: 'nuevo_lead', operacion: 'compra', zona: 'Bella Vista', min: 200000, max: 300000, fuente: 'meta_leads', seguimientoDias: 2, tags: ['primera vivienda'], nota: 'Precalificada con banco local. Interés en intereses preferenciales.' },
  { nombre: 'Ricardo Pinzón', telefono: '+50760010004', email: 'rpinzon@example.com', tipo: 'cliente', etapa: 'contactado', operacion: 'compra', zona: 'Punta Pacífica', min: 700000, max: 950000, fuente: 'referido', seguimientoDias: 1, tags: ['inversionista'], nota: 'Inversionista venezolano. Prefiere unidades con vista al mar para renta corta.' },
  { nombre: 'Ana Sofía Méndez', telefono: '+50760010005', email: 'asmendez@example.com', tipo: 'cliente', etapa: 'contactado', operacion: 'alquiler', zona: 'Casco Viejo', min: 2000, max: 3000, fuente: 'web_form', seguimientoDias: 3, tags: [], nota: 'Diplomática, llega en 2 meses. Necesita contrato a 1 año.' },
  { nombre: 'Carlos Eduardo Vega', telefono: '+50760010006', email: 'cvega@example.com', tipo: 'cliente', etapa: 'contactado', operacion: 'compra', zona: 'Miraflores', min: 300000, max: 420000, fuente: 'manual', seguimientoDias: -1, tags: ['familia'], nota: 'Familia con 3 hijos. Necesita jardín.' },
  { nombre: 'Daniela Ortega', telefono: '+50760010007', email: 'dortega@example.com', tipo: 'cliente', etapa: 'visita', operacion: 'compra', zona: 'Costa del Este', min: 550000, max: 700000, fuente: 'meta_leads', seguimientoDias: 2, tags: ['caliente'], nota: 'Visita agendada al apartamento de Costa del Este el sábado 10am.' },
  { nombre: 'Fernando Morales', telefono: '+50760010008', email: 'fmorales@example.com', tipo: 'cliente', etapa: 'visita', operacion: 'alquiler', zona: 'San Francisco', min: 1300, max: 1600, fuente: 'referido', seguimientoDias: 1, tags: [], nota: 'Visitó el estudio, le gustó. Pide rebaja de $100.' },
  { nombre: 'Gabriela Samudio', telefono: '+50760010009', email: 'gsamudio@example.com', tipo: 'cliente', etapa: 'oferta_negociando', operacion: 'compra', zona: 'Bella Vista', min: 250000, max: 280000, fuente: 'web_form', seguimientoDias: 0, tags: ['caliente'], nota: 'Ofertó $262,000. Propietario evaluando contraoferta.' },
  { nombre: 'Héctor Batista', telefono: '+50760010010', email: 'hbatista@example.com', tipo: 'cliente', etapa: 'oferta_negociando', operacion: 'compra', zona: 'Punta Pacífica', min: 800000, max: 900000, fuente: 'referido', seguimientoDias: 2, tags: ['inversionista'], nota: 'Negociando forma de pago: 30% inicial + financiamiento.' },
  { nombre: 'Isabel Quintero', telefono: '+50760010011', email: 'iquintero@example.com', tipo: 'cliente', etapa: 'cerrado', operacion: 'compra', zona: 'Santa María', min: 700000, max: 800000, fuente: 'referido', seguimientoDias: null, tags: ['cerrado'], nota: 'Firmó promesa de compraventa de la villa en Santa María.' },
  { nombre: 'Jorge Luis Arosemena', telefono: '+50760010012', email: 'jarosemena@example.com', tipo: 'cliente', etapa: 'cerrado', operacion: 'alquiler', zona: 'Clayton', min: 800, max: 1000, fuente: 'web_form', seguimientoDias: null, tags: ['cerrado'], nota: 'Contrato de arrendamiento firmado por 12 meses.' },
  { nombre: 'Karla Domínguez', telefono: '+50760010013', email: 'kdominguez@example.com', tipo: 'cliente', etapa: 'descartado', operacion: 'compra', zona: 'Costa del Este', min: 150000, max: 200000, fuente: 'meta_leads', seguimientoDias: null, tags: [], nota: 'Presupuesto fuera de rango para la zona. Se le ofrecieron otras opciones.' },
  { nombre: 'Luis Alberto Chen', telefono: '+50760010014', email: 'lchen@example.com', tipo: 'propietario', etapa: 'contactado', operacion: 'compra', zona: 'Punta Pacífica', min: null, max: null, fuente: 'referido', seguimientoDias: 5, tags: ['propietario'], nota: 'Propietario del penthouse en Punta Pacífica. Exclusiva por 6 meses.' },
  { nombre: 'Marta Elena Guardia', telefono: '+50760010015', email: 'mguardia@example.com', tipo: 'propietario', etapa: 'contactado', operacion: 'compra', zona: 'Miraflores', min: null, max: null, fuente: 'manual', seguimientoDias: 7, tags: ['propietario'], nota: 'Dueña de la casa en Miraflores. Acepta negociar hasta 5%.' },
  { nombre: 'Nicolás Barrios', telefono: '+50760010016', email: 'nbarrios@example.com', tipo: 'cliente', etapa: 'nuevo_lead', operacion: 'compra', zona: 'Casco Viejo', min: 350000, max: 500000, fuente: 'meta_leads', seguimientoDias: 0, tags: [], nota: 'Interesado en propiedades con potencial de Airbnb.' },
  { nombre: 'Olga Patricia Saldaña', telefono: '+50760010017', email: 'osaldana@example.com', tipo: 'cliente', etapa: 'visita', operacion: 'compra', zona: 'Miraflores', min: 120000, max: 170000, fuente: 'web_form', seguimientoDias: 3, tags: ['primera vivienda'], nota: 'Visita al apartamento económico de Miraflores agendada.' },
  { nombre: 'Pedro Pablo Ureña', telefono: '+50760010018', email: 'purena@example.com', tipo: 'cliente', etapa: 'contactado', operacion: 'alquiler', zona: 'Bella Vista', min: 900, max: 1300, fuente: 'meta_leads', seguimientoDias: 4, tags: [], nota: 'Busca 2 recámaras pet friendly.' },
]

function daysFromNow(n: number): string {
  return new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10)
}

function authAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Finds (or creates) the demo auth user and forces its password back. */
async function ensureDemoUser(email: string, password: string): Promise<string> {
  const auth = authAdmin()
  // listUsers is paginated; the demo user is looked up by email across pages.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await auth.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error(`listUsers: ${error.message}`)
    const hit = data.users.find((u) => u.email?.toLowerCase() === email)
    if (hit) {
      const { error: uErr } = await auth.auth.admin.updateUserById(hit.id, { password, email_confirm: true })
      if (uErr) throw new Error(`updateUser: ${uErr.message}`)
      return hit.id
    }
    if (data.users.length < 200) break
  }
  const { data, error } = await auth.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre: DEMO_AGENT_NAME, demo: true },
  })
  if (error || !data.user) throw new Error(`createUser: ${error?.message}`)
  return data.user.id
}

export interface DemoSeedResult {
  companyId: string
  properties: number
  contacts: number
}

export async function resetDemoData(): Promise<DemoSeedResult> {
  const email = demoEmail()
  const password = process.env.DEMO_LOGIN_PASSWORD
  if (!email || !password) throw new Error('DEMO_LOGIN_EMAIL / DEMO_LOGIN_PASSWORD no configurados')

  const db = createAdminClient()
  const userId = await ensureDemoUser(email, password)

  // ── Company + owner agent ──
  const { data: agent } = await (db.from('agents') as any)
    .select('id, company_id')
    .eq('auth_user_id', userId)
    .maybeSingle()

  let companyId: string
  let agentId: string
  if (agent) {
    companyId = agent.company_id
    agentId = agent.id
  } else {
    const { data: company, error } = await (db.from('companies') as any)
      .insert({ nombre: DEMO_COMPANY_NAME, email, plan_id: 'pro', subscription_status: 'active' })
      .select('id')
      .single()
    if (error || !company) throw new Error(`company: ${error?.message}`)
    companyId = company.id
    const { data: a, error: aErr } = await (db.from('agents') as any)
      .insert({ company_id: companyId, auth_user_id: userId, nombre: DEMO_AGENT_NAME, email, rol: 'owner', is_active: true })
      .select('id')
      .single()
    if (aErr || !a) throw new Error(`agent: ${aErr?.message}`)
    agentId = a.id
  }

  // Keep the demo on Pro, never blocked, never billed.
  await (db.from('companies') as any)
    .update({ nombre: DEMO_COMPANY_NAME, plan_id: 'pro', subscription_status: 'active', subscription_provider: null, current_period_end: null })
    .eq('id', companyId)

  // Give the demo agency portal feed URLs (Configuración → Fuentes) so a live
  // Encuentra24 / Compre o Alquile XML feed can be shown in sales calls. Kept
  // stable across resets; separate update so a missing migration 031 column
  // only skips this instead of failing the whole reset.
  const { data: feedRow } = await (db.from('companies') as any)
    .select('feed_token').eq('id', companyId).maybeSingle()
    .then((r: any) => r, () => ({ data: null }))
  if (feedRow && !feedRow.feed_token) {
    await (db.from('companies') as any).update({ feed_token: randomUUID() }).eq('id', companyId)
      .then(() => null, () => null)
  }

  // Visitors might have invited/deactivated teammates via PostgREST; keep only the owner.
  await (db.from('agents') as any).delete().eq('company_id', companyId).neq('id', agentId)
  await (db.from('agents') as any).update({ is_active: true, rol: 'owner', nombre: DEMO_AGENT_NAME }).eq('id', agentId)

  // ── Wipe tenant data (children first) ──
  for (const table of ['contact_property_links', 'contact_notes', 'property_notes', 'automation_logs', 'virtual_tours']) {
    await (db.from(table as any) as any).delete().eq('company_id', companyId).then(() => null, () => null)
  }
  await (db.from('contacts') as any).delete().eq('company_id', companyId)
  await (db.from('properties') as any).delete().eq('company_id', companyId)
  await (db.from('crm_stages') as any).delete().eq('company_id', companyId)
  await (db.from('pipelines') as any).delete().eq('company_id', companyId)
  await seedDefaultCrm(companyId)

  // ── Properties ──
  const propRows = MOCK_PROPERTIES.map((p, i) => ({
    company_id: companyId,
    titulo: p.titulo,
    descripcion: p.descripcion ?? null,
    tipo: p.tipo,
    for_sale: p.tipo === 'venta',
    for_rent: p.tipo === 'arriendo',
    for_transfer: false,
    property_type_label: p.property_type_label ?? null,
    country_label: 'Panamá',
    ciudad: p.ciudad ?? 'Ciudad de Panamá',
    zona: p.zona ?? null,
    address: p.address ?? null,
    latitude: p.latitude ?? null,
    longitude: p.longitude ?? null,
    precio: p.precio,
    iso_currency: 'USD',
    sale_price: p.tipo === 'venta' ? p.precio : null,
    rent_price: p.tipo === 'arriendo' ? p.precio : null,
    area: p.area ?? null,
    bedrooms: p.bedrooms ?? null,
    bathrooms: p.bathrooms ?? null,
    garages: p.garages ?? null,
    estado_publicacion: p.estado_publicacion,
    disponibilidad: p.disponibilidad,
    fuente: 'manual',
    main_image_url: p.main_image?.url ?? p.imagenes?.[0] ?? null,
    gallery_urls: p.imagenes ?? [],
    canales_publicados: p.estado_publicacion === 'inactivo' ? [] : ['comprealquile', 'encuentra24', 'pagina_web'],
    // First two listings carry the sample virtual tour.
    tour_rooms: i < 2 ? TOUR_ROOMS : [],
  }))
  const { data: props, error: pErr } = await (db.from('properties') as any).insert(propRows).select('id, zona, tipo')
  if (pErr) throw new Error(`properties: ${pErr.message}`)
  const properties = (props ?? []) as { id: string; zona: string | null; tipo: string }[]

  // ── Contacts + notes + property links ──
  const contactRows = CONTACTS.map((c) => ({
    company_id: companyId,
    nombre: c.nombre,
    email: c.email,
    telefono: c.telefono,
    whatsapp: c.telefono,
    tipo: c.tipo,
    pais: 'Panamá',
    ciudad: 'Ciudad de Panamá',
    zona_interes: c.zona,
    tipo_operacion: c.operacion,
    presupuesto_min: c.min,
    presupuesto_max: c.max,
    etapa_crm: c.etapa,
    agente_asignado_id: agentId,
    agente_nombre: DEMO_AGENT_NAME,
    fecha_seguimiento: c.seguimientoDias === null ? null : daysFromNow(c.seguimientoDias),
    fuente: c.fuente,
    tags: c.tags,
    is_active: true,
  }))
  const { data: contacts, error: cErr } = await (db.from('contacts') as any).insert(contactRows).select('id, zona_interes, tipo')
  if (cErr) throw new Error(`contacts: ${cErr.message}`)
  const created = (contacts ?? []) as { id: string; zona_interes: string | null; tipo: string }[]

  await (db.from('contact_notes') as any).insert(
    created.map((c, i) => ({ contact_id: c.id, company_id: companyId, agent_nombre: DEMO_AGENT_NAME, contenido: CONTACTS[i].nota })),
  )

  // Link each contact to a listing in their zone of interest (best-effort).
  const links = created.flatMap((c) => {
    const match = properties.find((p) => p.zona === c.zona_interes)
    if (!match) return []
    return [{ contact_id: c.id, property_id: match.id, company_id: companyId, interes: c.tipo === 'propietario' ? 'propietario' : 'interesado' }]
  })
  if (links.length) {
    await (db.from('contact_property_links') as any).insert(links).then(() => null, () => null)
  }

  return { companyId, properties: properties.length, contacts: created.length }
}
