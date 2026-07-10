import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contacto — Habla con nuestro equipo',
  description:
    'Escríbenos para configurar PropSync en tu inmobiliaria. Soporte en español, en Panamá. WhatsApp, email o formulario de contacto.',
}

export default function ContactoLayout({ children }: { children: React.ReactNode }) {
  return children
}
