# PropSync — Roadmap de implementación SEO

## Fase 1 — Fundación técnica (semanas 1-4) · trabajo de código en este repo

- [x] Meta completos en el landing: description, OG image, `metadataBase`, canonical, robots meta — **hecho 2026-07-09** (`app/layout.tsx`)
- [x] JSON-LD en home: `Organization` (Elevare/PropSync) + `SoftwareApplication` con `Offer` $30/$60 USD — **hecho 2026-07-09** (`app/page.tsx`)
- [x] `app/sitemap.ts` y `app/robots.ts` — **hecho 2026-07-09**
- [x] `/precios`, `/plataforma`, `/marketing`, `/ia`, `/contacto` ya existían como páginas reales; se les agregó metadata única (title + description) vía layouts — **hecho 2026-07-09**
- [x] Copy del landing corregido para vender solo lo real (sin widget/SDK/webhooks ficticios; Pro = propiedades ilimitadas; snippets de código verídicos) — **hecho 2026-07-09**
- [x] Badge "Próximamente en App Store y Google Play" en la banda CTA — **hecho 2026-07-09**
- [ ] Blog mínimo: `/recursos/blog` + `[slug]` (MDX o contenido en archivos — sin CMS por ahora)
- [ ] **(Manual — Claudio)** Google Search Console verificado + sitemap enviado; GA4 o analítica equivalente
- [ ] **(Manual — Claudio)** Google Business Profile "PropSync", categoría Software company, Ciudad de Panamá
- [ ] **(Manual — Claudio)** Perfiles en Capterra y ComparaSoftware (rankean por nuestras keywords — estar donde comparan)

**Gate de salida:** home + /precios indexadas, GSC recibiendo datos, blog desplegado.

## Fase 2 — Contenido inicial (semanas 5-12)

- [ ] Publicar semanas 1-8 del [CONTENT-CALENDAR.md](CONTENT-CALENDAR.md) (plantilla, 3 guías fantasma, 1ª comparativa, 1ª página de función)
- [ ] Lead magnet operativo: plantilla Excel con email gate → secuencia de 3 emails (usa `lib/email.ts` existente): entrega → consejo prescriptivo → invitación al trial
- [ ] Interlinking según reglas de [SITE-STRUCTURE.md](SITE-STRUCTURE.md)
- [ ] Pedir a los primeros clientes reseña en Google Business Profile y Capterra

**Gate de salida:** 12-15 URLs indexadas, primeras impresiones GSC en keywords no-marca.

## Fase 3 — Escala y conversión (semanas 13-24)

- [ ] Completar comparativas (Tokko, EasyBroker) + página "alternativa a Wasi"
- [ ] Resto de /funciones/* e /integraciones/*
- [ ] Primer caso de éxito con números reales de una agencia panameña
- [ ] Versión `/en` de las páginas top + `hreflang` es-PA/en (el toggle useState actual es invisible para Google)
- [ ] Link building local: ACOBIR, prensa de negocios panameña (La Prensa/Martes Financiero), blogs inmobiliarios LatAm, directorio de Elevare
- [ ] GEO: verificar que las tablas de precios/comparación sean extraíbles; monitorear citas en AI Overviews/Perplexity

**Gate de salida:** 3+ keywords BOFU en top-10, trials orgánicos medibles cada semana.

## Fase 4 — Autoridad y expansión (meses 7-12)

- [ ] Contenido de liderazgo: reporte anual "Estado del mercado inmobiliario digital en Panamá" (activo enlazable #1)
- [ ] Webinars/charlas con ACOBIR o asociaciones locales
- [ ] Evaluar expansión de keywords a Costa Rica y Colombia (mismo contenido, nueva capa local)
- [ ] Revisión trimestral: podar/actualizar contenido que no rankea, refrescar precios en comparativas

## Dependencias y riesgos

| Dependencia | Impacto si falta |
|---|---|
| SMTP configurado (código ya existe en `lib/email.ts`) | Sin secuencia de lead magnet — solo se pierde el nurture, no la descarga |
| 1-2 clientes dispuestos a dar testimonio | Fase 3 sin caso de éxito — sustituir con datos propios del producto |
| Fotos/capturas del producto reales | Contenido sin el "dato propio" que exige el calendario |
| Stripe pendiente | El CTA sigue siendo trial + contacto (ya funciona hoy vía ACH/WhatsApp) |
