# Plan GEO — aparecer en respuestas de IA para "CRM inmobiliario Panamá"

**Fecha:** 2026-08-09 · Complementa `SEO-STRATEGY.md` y `COMPETITOR-ANALYSIS.md`.

## El diagnóstico, en una frase

Cuando alguien pregunta "CRM inmobiliario Panamá", el motor no inventa la
lista: la **copia de páginas que ya enumeran opciones**. Hoy esas páginas son
Capterra, ComparaSoftware, wasi.co y alterestate.com. PropSync no aparece en
ninguna, así que no puede ser citado — por muy bueno que sea el producto.

Aparecer no se resuelve optimizando el landing. Se resuelve estando **en las
fuentes que el motor lee**, y dándole al motor material propio que valga la
pena citar.

---

## Ya está hecho (en código, desplegable ya)

| Qué | Dónde | Para qué sirve |
|---|---|---|
| `FAQPage` JSON-LD | `app/precios/layout.tsx` | Los motores de IA citan pares pregunta/respuesta. Ahora se los damos ya parseados en vez de obligarlos a extraerlos del HTML. |
| `llms.txt` | `public/llms.txt` | Resumen en prosa de qué es PropSync, qué resuelve y en qué se diferencia. Es el archivo que los crawlers de IA leen primero. |
| `areaServed`, `audience`, `featureList` | `app/page.tsx` (JSON-LD) | Antes "CRM inmobiliario" y "Panamá" sólo se relacionaban en prosa. Ahora es dato estructurado: la entidad **es** un CRM inmobiliario **cuyo área servida es Panamá**. |
| Reglas explícitas para bots de IA | `app/robots.ts` | GPTBot, ClaudeBot, PerplexityBot, Google-Extended, etc. con acceso al sitio público y bloqueados del área privada. |
| Fuente única del FAQ | `app/precios/faq-data.ts` | El schema y lo que ve el usuario salen del mismo sitio. Si divergen, Google lo penaliza. |

**Importante:** esto es condición necesaria, no suficiente. No esperes que
mueva el ranking por sí solo. Lo que sigue sí lo mueve.

---

## Lo que falta, en orden de impacto

### 1. Estar en los agregadores que la IA cita — *lo que más pesa*

Los motores citaron **Capterra** y **ComparaSoftware** literalmente. Mientras
PropSync no tenga ficha ahí, es invisible en esa clase de respuesta.

- Crear ficha en **Capterra** (`vendors.capterra.com`) — categoría "Real Estate CRM", mercado Panamá.
- Crear ficha en **ComparaSoftware** (`comparasoftware.com`) — es el que rankea en español para LatAm.
- Añadir **G2** y **GetApp** (comparten backend con Capterra: una ficha alimenta varias).
- **SoftwareAdvice** si Capterra lo permite desde el mismo panel.

Cada ficha es además un backlink de dominio alto. Es la acción con mejor
relación esfuerzo/resultado de toda la lista.

### 2. Google Business Profile

Sin GBP no hay señal local. Para "CRM inmobiliario **Panamá**", la señal
geográfica pesa. Crear el perfil como empresa de software con dirección en
Panamá, categoría "Desarrollador de software", y enlazar a `propsyncia.com`.

### 3. Contenido comparativo — el formato que la IA cita

Los motores prefieren páginas que **conceden**: las que dicen cuándo *no*
usar tu producto se perciben como equilibradas y se citan más. Ya tienes el
ángulo trabajado en `COMPETITOR-ANALYSIS.md` (pilar "producto-fantasma").

Páginas a crear, por prioridad:

1. `/comparativas/wasi-alternativa` — "wasi alternativa" no lo domina nadie.
2. `/comparativas/mejores-crm-inmobiliarios-panama` — compite de frente por la keyword exacta que buscaste.
3. `/guias/como-publicar-en-encuentra24` — captura al cliente un paso antes de necesitarte.
4. `/guias/licencia-corredor-bienes-raices-panama` — TOFU local, nadie lo cubre bien.

**Advertencia que sale de tu propio documento:** `COMPETITOR-ANALYSIS.md`
dice *"Precios verificados 2026-07-09 — re-verificar antes de publicar
cualquier comparativa"*. Publicar precios de Wasi o EasyBroker sin
re-verificar te expone. Dos salidas: publicar la comparativa **sin cifras de
competencia** (comparar capacidades, no precios), o re-verificar antes.

### 4. Menciones en sitios de terceros

La IA pondera la **coincidencia entre fuentes**. Una marca mencionada en tres
sitios independientes se cita antes que una mencionada sólo en su propia web.

- Nota en un medio panameño de negocios o inmobiliario.
- Perfil en el directorio de **ACOBIR** si aplica.
- Un caso de éxito con una agencia panameña real, publicado con nombre.

---

## Lo que necesito de ti

No puedo hacer estas cuatro cosas desde el código — requieren tus cuentas,
tus datos o tu criterio comercial:

1. **Crear las fichas de agregador** (Capterra, ComparaSoftware, G2). Necesitan
   correo corporativo, logo, capturas y descripción. Si me pasas el acceso o
   prefieres hacerlo tú, te preparo los textos y las capturas ya listas.
2. **Google Business Profile**: requiere verificación por correo postal o
   teléfono a nombre de la empresa. Sólo lo puedes hacer tú.
3. **Decidir sobre la comparativa**: ¿la publico sin cifras de competencia, o
   re-verificas precios y las incluyo? Sin tu respuesta no avanzo, porque
   publicar datos sin verificar es un riesgo tuyo, no mío.
4. **Un caso real**: nombre de una agencia panameña dispuesta a aparecer y
   dos o tres números verdaderos (propiedades gestionadas, tiempo ahorrado,
   leads cerrados). Es la señal E-E-A-T que ningún competidor tiene.

## Cómo medir si funciona

- **Google Search Console**: sigue impresiones de "crm inmobiliario panamá".
- **Prueba manual mensual**: pregunta a ChatGPT, Perplexity y Google AI
  Overviews "¿qué CRM inmobiliario hay en Panamá?" y anota si PropSync sale.
- Es lento: los agregadores tardan semanas en indexarse y los modelos más aún
  en reflejarlo. Espera **2-3 meses**, no días.
