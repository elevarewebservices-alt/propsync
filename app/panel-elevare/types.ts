// Row shapes shared by the Elevare admin page (server) and AdminPanel (client).

export interface PaymentRow {
  id: string
  company_id: string
  amount: number
  method: string
  reference: string | null
  period_start: string
  period_end: string
  notes: string | null
  created_by_email: string
  created_at: string
}

export interface PromoRow {
  id: string
  code: string
  descripcion: string | null
  trial_extra_days: number
  discount_percent: number
  free_months: number
  max_uses: number | null
  uses: number
  activo: boolean
  expires_at: string | null
  created_at: string
}

export interface CompanyRow {
  id: string
  nombre: string
  email: string | null
  plan_id: string
  created_at: string
  subscription_status: string | null
  subscription_provider: string | null
  trial_ends_at: string | null
  current_period_end: string | null
  addons: string[]
  propiedades: number
  contactos: number
  agentes: number
  iaMes: number
  imagenes: number
}

export interface AddonOption {
  id: string
  nombre: string
  requiresPlan: string
}
