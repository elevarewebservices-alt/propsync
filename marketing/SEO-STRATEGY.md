# PropSync — Estrategia SEO / Marketing (Panamá)

**Fecha:** 2026-07-09 · **Dominio:** propsyncia.com · **Mercado:** Panamá (ES primero, EN secundario)

---

## 1. Diagnóstico actual

propsyncia.com hoy es **una sola landing page** en español con toggle EN (estado en cliente — Google solo ve ES), sin blog, sin schema markup, sin señales locales de Panamá, sin páginas indexables más allá del home. Título actual: "PropSync — Base de datos, CRM e IA para inmobiliarias".

**Consecuencia:** el sitio solo puede rankear por su marca. Todo el tráfico de intención comercial ("crm inmobiliario panamá", "wasi alternativa", "cómo publicar en encuentra24") hoy se lo llevan competidores y agregadores (Capterra, comparasoftware.com).

## 2. La oportunidad

Ningún competidor (Wasi, Tokko Broker, EasyBroker, InmoCMS, Zoho) tiene contenido **localizado para Panamá**. Los resultados para "CRM inmobiliario Panamá" los ocupan directorios genéricos, no productos. PropSync puede ser *el* software inmobiliario panameño:

- Integración nativa con los portales que Panamá realmente usa (Encuentra24, Compre o Alquile)
- Precios en USD sin conversión (Panamá es dolarizado — Tokko cotiza en moneda local)
- WhatsApp-first (canal dominante en ventas inmobiliarias panameñas)
- Contenido sobre el ecosistema local: ACOBIR, licencia de corredor, ley de bienes raíces

## 3. Posicionamiento estratégico: "Consejero, no vendedor" (táctica Hormozi)

El pilar diferenciador del contenido: **recomendar honestamente la alternativa gratis o más barata cuando es lo correcto** (producto fantasma / concesión). Esto construye la confianza que convierte al lector en cliente del producto core.

Aplicaciones concretas:

| Producto fantasma (lo que regalamos/cedemos) | Producto core (lo que vendemos) |
|---|---|
| "Con menos de 20 propiedades, usa una hoja de cálculo — descarga nuestra plantilla gratis" | Cuando creces, la plantilla se rompe → PropSync Individual $30 |
| "Cómo publicar gratis en Encuentra24, paso a paso (sin pagarnos nada)" | Publicar en 3 portales a la vez, sin re-tipear → sincronización PropSync |
| "No pagues Matterport: haz tu tour 360° con tu teléfono" | Tours 360° ilimitados incluidos en PropSync |
| "WhatsApp Business gratis te alcanza si eres 1 agente" | Inbox compartido + plantillas + flujos → addon Marketing |
| Comparativas honestas que admiten dónde gana el competidor | La credibilidad hace creíble el resto de la comparativa |

Reglas de ejecución (del video):
1. **Cierre prescriptivo:** cada pieza termina con instrucciones exactas de uso ("día 1 haz X, día 2 haz Y"), no con un pitch. El trial de 15 días se vende como una receta, no como una demo.
2. **Manejo de presupuesto:** en la página de precios, ordenar el valor por importancia y preguntar "¿qué quitarías primero?" — en vez de descontar, re-enfatizar el problema que cada pieza resuelve.
3. **Hombro con hombro:** el tono de todo el contenido es el de un colega corredor que ya resolvió el problema, nunca el de un vendedor al otro lado de la mesa.

## 4. Pilares de contenido

1. **Panamá local** (nadie compite aquí): guías del ecosistema inmobiliario panameño — portales, ACOBIR, licencias, mejores zonas para invertir. Atrae al público objetivo aunque aún no busque software.
2. **Confianza / producto fantasma** (pilar Hormozi): plantillas gratis, guías "no nos necesitas todavía", alternativas honestas.
3. **Comparativas y alternativas** (BOFU, convierte 4-7% vs 0.5-1.8% de un blog normal): PropSync vs Wasi, vs Tokko Broker, vs EasyBroker; "alternativa a X en Panamá".
4. **Producto / casos de uso**: features indexables (CRM, tours 360°, WhatsApp, API), casos de éxito de agencias panameñas.

## 5. Fundación técnica (en el propio repo — trabajo de código)

- [ ] `metadataBase` + meta description + OG completos en `app/layout.tsx` / `app/page.tsx`
- [ ] Schema JSON-LD: `Organization` + `SoftwareApplication` con `Offer` ($30/$60) en el home
- [ ] `app/sitemap.ts` + `app/robots.ts` (Next.js nativos)
- [ ] Blog como rutas reales: `app/(marketing)/blog/[slug]` — **no** el shell autenticado
- [ ] Versión EN como ruta indexable (`/en`) con `hreflang` es-PA / en — el toggle actual con `useState` es invisible para buscadores
- [ ] Google Search Console + GA4 (o similar) conectados
- [ ] Google Business Profile "PropSync" categoría *Software company*, Ciudad de Panamá

## 6. KPIs

| Métrica | Base | 3 meses | 6 meses | 12 meses |
|---|---|---|---|---|
| Tráfico orgánico/mes | ~0 | 300 | 1,500 | 5,000 |
| Keywords top-10 (ES) | 0 | 10 | 40 | 120 |
| Páginas indexadas | 1 | 15 | 40 | 90 |
| Trials desde orgánico/mes | 0 | 3 | 12 | 40 |
| Descargas plantilla (leads) | 0 | 30 | 150 | 500 |

Métricas de guardia: conversión blog→precios, ranking de las páginas "vs", CTR de marca en GSC.

## 7. Riesgos

- **Dominio nuevo, autoridad 0** → los primeros 3 meses el tráfico viene de long-tail local y de la marca; no esperar rankear "crm inmobiliario" genérico antes del mes 9.
- **Mercado pequeño** → los volúmenes de búsqueda de Panamá son bajos; compensar con intención altísima (BOFU) y con expansión regional (Costa Rica, Colombia) en fase 4.
- **Wasi es socio e integración además de competidor** → las comparativas con Wasi deben ser impecablemente justas (además la táctica de confianza lo exige).

**Documentos hermanos:** [COMPETITOR-ANALYSIS.md](COMPETITOR-ANALYSIS.md) · [SITE-STRUCTURE.md](SITE-STRUCTURE.md) · [CONTENT-CALENDAR.md](CONTENT-CALENDAR.md) · [IMPLEMENTATION-ROADMAP.md](IMPLEMENTATION-ROADMAP.md)
