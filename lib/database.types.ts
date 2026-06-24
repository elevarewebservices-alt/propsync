export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

// ── Row types ───────────────────────────────────────────────────────────────

export interface CompanyRow {
  id: string
  nombre: string
  email: string | null
  plan_id: string
  wasi_token: string | null
  wasi_company_id: string | null
  last_wasi_sync_at: string | null
  smtp_host: string | null
  smtp_port: number | null
  smtp_secure: boolean
  smtp_user: string | null
  smtp_password_enc: string | null
  smtp_from_email: string | null
  smtp_from_name: string | null
  smtp_verified_at: string | null
  whatsapp_webhook_token: string | null
  whatsapp_phone_number_id: string | null
  whatsapp_business_account_id: string | null
  whatsapp_access_token_enc: string | null
  api_key_hash: string | null
  api_key_enc: string | null
  api_key_created_at: string | null
  created_at: string
  updated_at: string
}

export interface WhatsAppCampaignRow {
  id: string
  company_id: string
  nombre: string
  tipo: string
  status: string
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

export interface WhatsAppCampaignInsert {
  id?: string
  company_id: string
  nombre?: string
  tipo?: string
  status?: string
  template_name?: string | null
  total?: number
  enviados?: number
  respondidos?: number
  pendientes?: number
  fallidos?: number
  started_at?: string | null
  completed_at?: string | null
}

export interface WhatsAppMessageRow {
  id: string
  company_id: string
  campaign_id: string | null
  contact_id: string | null
  property_id: string | null
  direction: string
  wa_message_id: string | null
  phone_number: string
  message_type: string
  body: string | null
  template_name: string | null
  status: string | null
  error_message: string | null
  raw_payload: Json
  created_at: string
}

export interface WhatsAppMessageInsert {
  id?: string
  company_id: string
  campaign_id?: string | null
  contact_id?: string | null
  property_id?: string | null
  direction: string
  wa_message_id?: string | null
  phone_number: string
  message_type?: string
  body?: string | null
  template_name?: string | null
  status?: string | null
  error_message?: string | null
  raw_payload?: Json
}

export interface PipelineRow {
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

export interface PipelineInsert {
  id?: string
  company_id: string
  nombre: string
  slug: string
  color?: string
  icon?: string | null
  position?: number
  is_active?: boolean
}

export interface AgentRow {
  id: string
  company_id: string
  auth_user_id: string | null
  nombre: string
  email: string
  telefono: string | null
  rol: string
  is_active: boolean
  created_at: string
  permissions: Record<string, boolean> | null
}

export interface ContactRow {
  id: string
  company_id: string
  nombre: string
  email: string | null
  telefono: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface PropertyRow {
  id: string
  company_id: string
  wasi_id: string | null
  titulo: string
  descripcion: string | null
  address: string | null
  reference: string | null
  tipo: 'venta' | 'arriendo'
  for_sale: boolean | null
  for_rent: boolean | null
  for_transfer: boolean | null
  property_type_label: string | null
  property_condition_label: string | null
  country_label: string | null
  region_label: string | null
  ciudad: string | null
  zona: string | null
  latitude: string | null
  longitude: string | null
  zip_code: string | null
  floor: string | null
  precio: number
  iso_currency: string | null
  sale_price: number | null
  rent_price: number | null
  maintenance_fee: number | null
  rents_type_label: string | null
  commission_type: string | null
  commission_value: number | null
  commission_notes: string | null
  ext_commission_type: string | null
  ext_commission_value: number | null
  ext_commission_notes: string | null
  area: string | null
  built_area: string | null
  private_area: string | null
  bedrooms: number | null
  bathrooms: number | null
  half_bathrooms: number | null
  garages: number | null
  furnished: boolean | null
  building_date: string | null
  estado_publicacion: 'activo' | 'destacado' | 'inactivo'
  disponibilidad: 'disponible' | 'vendido' | 'alquilado'
  id_status_on_page: string | null
  id_availability: string | null
  availability_label: string | null
  visits: number | null
  network_share: boolean | null
  main_image_url: string | null
  gallery_urls: Json
  video: string | null
  features_internal: Json
  features_external: Json
  etapa_crm: 'prospecto' | 'contactado' | 'visita' | 'oferta' | 'negociando' | 'cerrado'
  cliente_nombre: string | null
  cliente_email: string | null
  agente_asignado_id: string | null
  fecha_seguimiento: string | null
  notas: string | null
  brevo_deal_id: string | null
  canales_publicados: string[]
  whatsapp_estado: string | null
  telefono_propietario: string | null
  owner_contact_id: string | null
  fuente: string
  tour_rooms: Json
  created_at: string
  updated_at: string
}

// ── Insert types (all nullable fields are optional) ─────────────────────────

export interface PropertyInsert {
  id?: string
  company_id: string
  wasi_id?: string | null
  titulo: string
  descripcion?: string | null
  address?: string | null
  reference?: string | null
  tipo: 'venta' | 'arriendo'
  for_sale?: boolean | null
  for_rent?: boolean | null
  for_transfer?: boolean | null
  property_type_label?: string | null
  property_condition_label?: string | null
  country_label?: string | null
  region_label?: string | null
  ciudad?: string | null
  zona?: string | null
  latitude?: string | null
  longitude?: string | null
  zip_code?: string | null
  floor?: string | null
  precio: number
  iso_currency?: string | null
  sale_price?: number | null
  rent_price?: number | null
  maintenance_fee?: number | null
  rents_type_label?: string | null
  commission_type?: string | null
  commission_value?: number | null
  commission_notes?: string | null
  ext_commission_type?: string | null
  ext_commission_value?: number | null
  ext_commission_notes?: string | null
  area?: string | null
  built_area?: string | null
  private_area?: string | null
  bedrooms?: number | null
  bathrooms?: number | null
  half_bathrooms?: number | null
  garages?: number | null
  furnished?: boolean | null
  building_date?: string | null
  estado_publicacion?: 'activo' | 'destacado' | 'inactivo'
  disponibilidad?: 'disponible' | 'vendido' | 'alquilado'
  id_status_on_page?: string | null
  id_availability?: string | null
  availability_label?: string | null
  visits?: number | null
  network_share?: boolean | null
  main_image_url?: string | null
  gallery_urls?: Json
  video?: string | null
  features_internal?: Json
  features_external?: Json
  etapa_crm?: 'prospecto' | 'contactado' | 'visita' | 'oferta' | 'negociando' | 'cerrado'
  cliente_nombre?: string | null
  cliente_email?: string | null
  agente_asignado_id?: string | null
  fecha_seguimiento?: string | null
  notas?: string | null
  brevo_deal_id?: string | null
  canales_publicados?: string[]
  whatsapp_estado?: string | null
  telefono_propietario?: string | null
  owner_contact_id?: string | null
  fuente?: string
  tour_rooms?: Json
}

export type PropertyUpdate = Partial<PropertyInsert>

// ── Property notes ──────────────────────────────────────────────────────────

export interface PropertyNoteRow {
  id: string
  property_id: string
  company_id: string
  agent_nombre: string
  contenido: string
  created_at: string
}

export interface PropertyNoteInsert {
  id?: string
  property_id: string
  company_id: string
  agent_nombre: string
  contenido: string
}

// ── Database schema for Supabase typed client ───────────────────────────────

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: CompanyRow
        Insert: Omit<CompanyRow, 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Omit<CompanyRow, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      agents: {
        Row: AgentRow
        Insert: Omit<AgentRow, 'id' | 'created_at'> & { id?: string }
        Update: Partial<Omit<AgentRow, 'id' | 'created_at'>>
        Relationships: []
      }
      contacts: {
        Row: ContactRow
        Insert: Omit<ContactRow, 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Omit<ContactRow, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      properties: {
        Row: PropertyRow
        Insert: PropertyInsert
        Update: PropertyUpdate
        Relationships: []
      }
      property_notes: {
        Row: PropertyNoteRow
        Insert: PropertyNoteInsert
        Update: never
        Relationships: []
      }
      whatsapp_campaigns: {
        Row: WhatsAppCampaignRow
        Insert: WhatsAppCampaignInsert
        Update: Partial<WhatsAppCampaignInsert>
        Relationships: []
      }
      whatsapp_messages: {
        Row: WhatsAppMessageRow
        Insert: WhatsAppMessageInsert
        Update: Partial<WhatsAppMessageInsert>
        Relationships: []
      }
      pipelines: {
        Row: PipelineRow
        Insert: PipelineInsert
        Update: Partial<PipelineInsert>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      current_company_id: {
        Args: Record<string, never>
        Returns: string
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
