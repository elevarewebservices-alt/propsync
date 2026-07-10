import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Marketing inmobiliario — Captación y seguimiento de leads',
  description:
    'Captura leads desde Meta Lead Ads y formularios web directo a tu CRM. Seguimiento automático, recordatorios y reportes de conversión para tu inmobiliaria.',
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return children
}
