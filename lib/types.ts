export type PropertyType = 'venta' | 'arriendo'

export type EstadoPublicacion = 'activo' | 'destacado' | 'inactivo'

export type Disponibilidad = 'disponible' | 'vendido' | 'alquilado'

export type PropertySource = 'wasi' | 'manual'

export type WhatsAppStatus =
  | 'no_contactado'
  | 'contactado'
  | 'disponible'
  | 'vendida'
  | 'no_disponible'

export type WhatsAppResponse =
  | 'disponible'
  | 'vendida'
  | 'no_disponible'
  | 'sin_respuesta'

export type PlanId = 'starter' | 'pro' | 'agency'

export type EtapaCRM = string // dynamic — values come from crm_stages table

export type ContactTipo = 'cliente' | 'propietario' | 'broker'
export type ContactFuente = 'manual' | 'meta_leads' | 'web_form' | 'referido' | 'wasi'
export type TipoOperacion = 'compra' | 'alquiler' | 'ambas'
export type ContactInteres = 'interesado' | 'propietario' | 'visitó' | 'ofertó' | 'descartado'

export interface CrmStage {
  id: string
  company_id: string
  nombre: string
  slug: string
  color: string
  position: number
  is_terminal: boolean
  requires_approval: boolean
  required_fields: string[]
  pipeline_id?: string | null
  created_at?: string
}

export interface Contact {
  id: string
  company_id: string
  nombre: string
  email: string | null
  telefono: string | null
  whatsapp: string | null
  notas: string | null
  tipo: ContactTipo
  pais: string | null
  ciudad: string | null
  zona_interes: string | null
  tipo_operacion: TipoOperacion
  presupuesto_min: number | null
  presupuesto_max: number | null
  etapa_crm: string
  agente_asignado_id: string | null
  agente_nombre: string | null
  fecha_seguimiento: string | null
  fuente: ContactFuente
  meta_campaign: string | null
  meta_form: string | null
  meta_ad_set: string | null
  tags: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ContactPropertyLink {
  id: string
  contact_id: string
  property_id: string
  company_id: string
  interes: ContactInteres
  created_at: string
}

export interface FollowUpNotification {
  id: string
  nombre: string
  fecha_seguimiento: string
  etapa_crm: string
}

export interface WasiImage {
  id_gallery?: string
  id_image?: string
  url: string
  url_big?: string
  url_original?: string
  description?: string
  position?: string
}

export interface WasiFeature {
  id: string
  nombre: string
  name?: string
}

export interface WasiFeatures {
  internal: WasiFeature[]
  external: WasiFeature[]
}

export interface Property {
  // ── Identity ───────────────────────────────────────────
  id: string
  wasi_id?: string | null

  // ── Listing basics ─────────────────────────────────────
  titulo: string
  descripcion: string
  address?: string | null
  reference?: string | null
  comment?: string | null
  label?: string | null
  owner?: string | null

  // ── Operation flags ────────────────────────────────────
  tipo: PropertyType
  for_sale?: boolean | null
  for_rent?: boolean | null
  for_transfer?: boolean | null

  // ── Property classification ────────────────────────────
  id_property_type?: number | null
  property_type_label?: string | null
  id_property_condition?: string | null
  property_condition_label?: string | null

  // ── Location ───────────────────────────────────────────
  country_label?: string | null
  region_label?: string | null
  ciudad?: string | null
  zona?: string | null
  latitude?: string | null
  longitude?: string | null
  zip_code?: string | null
  floor?: string | null

  // ── Pricing ────────────────────────────────────────────
  precio: number
  iso_currency?: string | null
  name_currency?: string | null
  sale_price?: number | null
  sale_price_label?: string | null
  rent_price?: number | null
  rent_price_label?: string | null
  maintenance_fee?: number | null
  id_rents_type?: string | null
  rents_type_label?: string | null

  // ── Commissions ────────────────────────────────────────
  commission_type?: 'percentage' | 'fixed' | null
  commission_value?: number | null
  commission_notes?: string | null
  ext_commission_type?: 'percentage' | 'fixed' | null
  ext_commission_value?: number | null
  ext_commission_notes?: string | null

  // ── Physical characteristics ───────────────────────────
  area?: string | null
  unit_area_label?: string | null
  built_area?: string | null
  private_area?: string | null
  bedrooms?: number | null
  bathrooms?: number | null
  half_bathrooms?: number | null
  garages?: number | null
  tv_share?: number | null
  furnished?: boolean | null
  building_date?: string | null

  // ── Publication status ─────────────────────────────────
  estado_publicacion: EstadoPublicacion
  disponibilidad: Disponibilidad
  id_status_on_page?: string | null
  status_on_page_label?: string | null
  id_availability?: string | null
  availability_label?: string | null
  id_publish_on_map?: string | null
  network_share?: boolean | null
  visits?: number | null

  // ── Media ──────────────────────────────────────────────
  imagenes: string[]
  main_image?: WasiImage | null
  galleries?: WasiImage[]
  video?: string | null

  // ── Features ───────────────────────────────────────────
  features?: WasiFeatures | null

  // ── Meta ───────────────────────────────────────────────
  fuente: PropertySource
  fechaCreacion: string
  updated_at?: string | null
  telefono_propietario: string
  owner_contact_id?: string | null
  canalesPublicados: string[]
  whatsappEstado: WhatsAppStatus

  // ── Virtual tour ──────────────────────────────────────
  tour_rooms?: TourRoom[] | null

  // ── CRM ────────────────────────────────────────────────
  etapa_crm: EtapaCRM
  cliente_nombre: string | null
  cliente_email: string | null
  agente_asignado: string | null
  fecha_seguimiento: string | null
  notas: string | null
  brevo_deal_id: string | null
}

export interface TourRoom {
  url: string
  label: string
  is360?: boolean
}

export interface PropertyNote {
  id: string
  agent_nombre: string
  contenido: string
  created_at: string
}

export interface PlanLimits {
  propiedades: number | 'ilimitado'
  agentes: number | 'ilimitado'
  fuentes: number | 'ilimitado'
  canales: string[]
  mantener: boolean
  soporte: 'comunidad' | 'email' | 'dedicado'
}

export interface Pipeline {
  id: string
  company_id: string
  nombre: string
  slug: string
  color: string
  icon: string | null
  position: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Plan {
  id: PlanId
  nombre: string
  precio: number
  limites: PlanLimits
  features: string[]
}

export interface MockUser {
  id: string
  nombre: string
  email: string
  planId: PlanId
  agencia: string
}

export interface WhatsAppResponseRecord {
  id: string
  propertyId: string
  propietario: string
  telefono: string
  respuesta: WhatsAppResponse
  fecha: string
  accionTomada: string | null
}

export interface PublishQueueItem {
  id: string
  propertyId: string
  propertyTitulo: string
  canal: string
  programadoPara: string
  estado: 'pendiente' | 'en_proceso' | 'completado' | 'fallido'
}

export interface PublishHistoryItem {
  id: string
  propertyId: string
  propertyTitulo: string
  canal: string
  fecha: string
  estado: 'exitoso' | 'fallido'
  error?: string
}

// ── Automations ───────────────────────────────────────────────────────────

export type AutomationTrigger = 'nuevo_lead' | 'sin_respuesta' | 'follow_up_vencido'

export interface AutomationCondition {
  field: 'fuente' | 'tipo' | 'etapa_crm' | 'ciudad'
  op: 'eq' | 'neq'
  value: string
}

export interface AutomationAction {
  type: 'enviar_email' | 'cambiar_etapa' | 'asignar_agente' | 'crear_nota'
  config: {
    asunto?: string
    cuerpo?: string
    etapa_slug?: string
    agente_id?: string
    nota?: string
  }
}

export interface Automation {
  id: string
  company_id: string
  nombre: string
  is_active: boolean
  trigger_type: AutomationTrigger
  trigger_config: { dias?: number }
  conditions: AutomationCondition[]
  actions: AutomationAction[]
  run_count: number
  last_run_at: string | null
  created_at: string
  updated_at: string
}

// ── WhatsApp ───────────────────────────────────────────────────────────────

export type WhatsAppCampaignStatus = 'inactiva' | 'activa' | 'pausada' | 'completada'
export type WhatsAppCampaignTipo = 'verificacion' | 'marketing' | 'seguimiento'
export type WhatsAppMessageDirection = 'inbound' | 'outbound'
export type WhatsAppMessageType = 'text' | 'template' | 'image' | 'audio' | 'document' | 'button' | 'interactive'
export type WhatsAppMessageStatus = 'sent' | 'delivered' | 'read' | 'failed'

export interface WhatsAppCampaign {
  id: string
  company_id: string
  nombre: string
  tipo: WhatsAppCampaignTipo
  status: WhatsAppCampaignStatus
  template_name: string | null
  total: number
  enviados: number
  respondidos: number
  pendientes: number
  fallidos: number
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface WhatsAppMessage {
  id: string
  company_id: string
  campaign_id: string | null
  contact_id: string | null
  property_id: string | null
  direction: WhatsAppMessageDirection
  wa_message_id: string | null
  phone_number: string
  message_type: WhatsAppMessageType
  body: string | null
  template_name: string | null
  status: WhatsAppMessageStatus | null
  error_message: string | null
  raw_payload: unknown
  created_at: string
}
