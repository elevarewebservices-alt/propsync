// Fuente única del FAQ de /precios. La página (client component) lo renderiza
// y el layout (server component) lo emite como FAQPage JSON-LD. Tenerlo en un
// solo sitio evita que el schema y lo que ve el usuario se desincronicen —
// Google penaliza el structured data que no coincide con el contenido visible.
export interface FaqItem { q: string; a: string }

export const FAQ: FaqItem[] = [
  {
    q: '¿Qué incluye la prueba de 15 días?',
    a: 'Acceso completo al plan Pro: CRM, IA, marketing automation, widget web y API. Sin tarjeta de crédito requerida. Al finalizar coordinamos contigo el plan que mejor se adapte.',
  },
  {
    q: '¿Puedo cambiar de plan más adelante?',
    a: 'Sí, puedes subir o bajar de plan en cualquier momento. Coordinamos el cambio contigo y se aplica en el siguiente ciclo.',
  },
  {
    q: '¿Cómo funciona el límite de propiedades?',
    a: 'El límite es de propiedades activas en tu inventario. Las propiedades vendidas o archivadas no cuentan. Si superas el límite, se te avisa con anticipación.',
  },
  {
    q: '¿Qué incluye cada plan?',
    a: 'Todo lo que ves listado en la tarjeta del plan, sin cargos ocultos. Los add-ons (WhatsApp Business, publicación en Facebook) son opcionales y se definen junto con tu cotización.',
  },
  {
    q: '¿Aceptan facturación a empresa?',
    a: 'Sí, emitimos factura fiscal según los requisitos de Panamá. Contáctanos para coordinar el alta como empresa.',
  },
  {
    q: '¿Qué pasa con mis datos si cancelo?',
    a: 'Tus datos quedan disponibles 30 días después de cancelar. Puedes exportar todo a CSV/Excel en cualquier momento desde la configuración.',
  },
]
