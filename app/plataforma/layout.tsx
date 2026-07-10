import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Plataforma — Base de datos, CRM y publicación en portales',
  description:
    'Conoce la plataforma PropSync: base de datos central de propiedades, CRM nativo con pipeline, tours virtuales 360° y publicación en Encuentra24 y Compre o Alquile.',
}

export default function PlataformaLayout({ children }: { children: React.ReactNode }) {
  return children
}
