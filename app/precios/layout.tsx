import type { Metadata } from 'next'
import { FAQ } from './faq-data'

// Se vende como White Label, así que el metadata no publica cifras: el título
// y la descripción se quedan en la intención de búsqueda ("planes", "CRM
// inmobiliario Panamá") sin comprometer un precio público.
export const metadata: Metadata = {
  title: 'Planes — CRM inmobiliario en Panamá',
  description:
    'Planes de PropSync para inmobiliarias en Panamá: Individual (agente independiente) y Pro (propiedades ilimitadas, IA completa y API). Cotización a medida y 15 días de prueba gratis, sin tarjeta de crédito.',
  alternates: { canonical: '/precios' },
}

export default function PreciosLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* FAQPage schema. Dos motivos: habilita el rich result de FAQ en Google,
          y le da a los motores de IA (ChatGPT, Perplexity, AI Overviews) pares
          pregunta/respuesta ya parseados — que es literalmente el formato que
          citan. El contenido sale del mismo módulo que renderiza la página. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQ.map((item) => ({
              '@type': 'Question',
              name: item.q,
              acceptedAnswer: { '@type': 'Answer', text: item.a },
            })),
          }),
        }}
      />
      {children}
    </>
  )
}
