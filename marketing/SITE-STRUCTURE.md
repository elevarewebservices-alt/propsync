# PropSync — Arquitectura de sitio propuesta (SEO)

Rutas públicas indexables. Se implementan como un route group `app/(marketing)/` separado del shell autenticado `(app)/` — mismo patrón que el landing actual.

```
propsyncia.com/
├── /                                  # Landing actual (mejorar meta + schema, no rehacer)
├── /precios                           # Página de precios dedicada (hoy es solo un anchor #planes)
│   └── — incluye sección "¿Presupuesto ajustado?" (orden de valor estilo Hormozi)
├── /funciones/
│   ├── /crm-inmobiliario
│   ├── /base-de-datos-propiedades
│   ├── /tours-virtuales-360
│   ├── /whatsapp-inmobiliario         # + addon Marketing
│   ├── /asistente-ia
│   └── /api-inmobiliaria              # API REST v1 + widget embed (Pro)
├── /integraciones/
│   ├── /encuentra24
│   ├── /compre-o-alquile
│   └── /wasi                          # importación/migración desde Wasi
├── /comparar/
│   ├── /propsync-vs-wasi
│   ├── /propsync-vs-tokko-broker
│   ├── /propsync-vs-easybroker
│   └── /alternativa-wasi              # targeting búsqueda de marca del competidor
├── /recursos/
│   ├── /blog                          # listado + /blog/[slug]
│   ├── /plantillas/
│   │   └── /inventario-propiedades-excel   # lead magnet (email gate suave)
│   └── /guias/
│       ├── /publicar-en-encuentra24        # pilar producto-fantasma
│       ├── /tour-360-con-tu-telefono       # pilar producto-fantasma
│       └── /primera-semana-con-propsync    # cierre prescriptivo (onboarding)
├── /clientes                          # casos de éxito (cuando existan 2-3)
├── /en                                # versión EN indexable + hreflang (fase 3)
├── sitemap.xml                        # app/sitemap.ts
└── robots.txt                         # app/robots.ts
```

## Reglas

- **Interlinking:** cada guía producto-fantasma enlaza a exactamente UNA página de función (la transición natural "cuando esto se te quede corto"). Cada página de función enlaza a /precios y a 1-2 guías. Las comparativas enlazan a /precios y a la migración correspondiente en /integraciones.
- **Quality gate:** no publicar una URL con <600 palabras de contenido original o sin un elemento propio (captura del producto, plantilla, dato). Mejor 20 páginas fuertes que 60 delgadas — evita index bloat en un dominio nuevo.
- **Schema por tipo:** home y /funciones/* → `SoftwareApplication` + `Offer`; /precios → `Offer` con los dos planes; blog/guías → `Article` con autor real; /comparar/* → tabla HTML limpia (extraíble por AI Overviews) + `FAQPage` markup para señales de entidad.
- **URLs en español**, sin acentos, con guiones. La versión /en traduce slugs (`/en/pricing`, `/en/compare/propsync-vs-wasi`).
- **CTAs:** guías TOFU → descarga de plantilla (lead). Funciones y comparativas BOFU → "Probar 15 días gratis". Nunca al revés.
