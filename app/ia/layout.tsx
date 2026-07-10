import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Asistente IA para inmobiliarias',
  description:
    'El asistente de PropSync redacta descripciones de propiedades, responde preguntas sobre tu cartera y te ayuda a mantener tu inventario activo 24/7.',
}

export default function IaLayout({ children }: { children: React.ReactNode }) {
  return children
}
