import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Precios — CRM inmobiliario desde $30/mes',
  description:
    'Planes de PropSync: Individual $30/mes (50 propiedades) y Pro $60/mes (propiedades ilimitadas, IA completa y API). 15 días de prueba gratis, sin tarjeta de crédito.',
}

export default function PreciosLayout({ children }: { children: React.ReactNode }) {
  return children
}
