import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Demo — PropSync, CRM inmobiliario en Panamá',
  description:
    'Recorre PropSync sin registrarte: tablero, inventario de propiedades, CRM Kanban, asistente IA y tour virtual. Entra a una cuenta demo con datos de ejemplo.',
  alternates: { canonical: '/demo' },
}

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children
}
