# PropSync — CLAUDE.md

## Product Overview

PropSync is a full-stack real estate SaaS platform — **plataforma integral de marketing, ventas y comunicación para inmobiliarias**. It centralizes property inventory (database), client management (native CRM), and AI-powered tools in a single place.

**Positioning:** Base de datos · CRM · IA — todo en uno  
**Tagline:** "Tu inventario, siempre activo, siempre publicado"  
**Branding:** Built by **Elevare** — [elevarewebservices.com](https://elevarewebservices.com)

**Target users:** Real estate agencies in Latin America (primarily Panama)

---

## Tech Stack

| Tool | Version | Purpose |
|---|---|---|
| Next.js | 14.2.35 | App Router framework |
| React | 18 | UI library |
| TypeScript | 5 | Strict mode |
| Tailwind CSS | 3.4 | Styling |
| shadcn/ui | latest | Component library |
| lucide-react | latest | Icons |
| next-themes | latest | Dark/light mode |
| Supabase | latest | Database + Auth (PostgreSQL) |
| tw-animate-css | latest | Animation utilities (imported in globals.css) |
| **Outfit** | Google Font | Landing page font (`--font-outfit`) |
| **Inter** | Google Font | App font (`--font-inter`) |

---

## Commands

```bash
npm run dev      # Start dev server (localhost:3000 or next available port)
npm run build    # Production build
npm run lint     # ESLint check
npx tsc --noEmit # TypeScript type check — run after every significant change
```

---

## Project Structure

```
app/
├── layout.tsx              # Root layout — minimal (font vars + Providers only, NO sidebar)
├── page.tsx                # Public landing page (ES/EN, Elevare credit, Outfit font)
├── providers.tsx           # "use client" ThemeProvider wrapper
├── globals.css             # Tailwind + shadcn CSS vars + tw-animate-css import
│
├── (app)/                  # Route group — authenticated app shell
│   ├── layout.tsx          # App shell: Sidebar + Header + BottomNav + ChatWidget
│   ├── dashboard/page.tsx
│   ├── propiedades/page.tsx
│   ├── mantener/
│   │   ├── page.tsx
│   │   ├── campana-whatsapp/page.tsx
│   │   ├── respuestas/page.tsx
│   │   └── limpieza/page.tsx
│   ├── configuracion/
│   │   ├── general/page.tsx
│   │   ├── fuentes/page.tsx
│   │   └── planes/page.tsx
│   └── asistente/page.tsx
│
└── api/
    ├── properties/
    │   ├── route.ts              # GET /api/properties
    │   └── [id]/notes/route.ts   # GET + POST /api/properties/[id]/notes
    ├── upload/route.ts           # POST /api/upload (R2 image upload)
    ├── brevo/route.ts            # POST /api/brevo (CRM sync)
    ├── assistant/route.ts        # POST /api/assistant (AI chat)
    └── wasi/sync/route.ts        # POST /api/wasi/sync

components/
├── layout/
│   ├── Sidebar.tsx
│   ├── BottomNav.tsx
│   ├── Header.tsx
│   └── ThemeToggle.tsx
├── propiedades/
│   ├── PropertyCard.tsx          # Shows TWO badges: estado_publicacion + disponibilidad
│   ├── PropertyFilters.tsx       # Filters by disponibilidad dropdown
│   └── PropertyDetailSheet.tsx   # Slide-over: CRM fields + immutable notes feed
├── assistant/
│   └── ChatWidget.tsx
├── shared/
│   ├── UpgradeBanner.tsx
│   ├── PlanBadge.tsx
│   └── EmptyState.tsx
└── ui/                           # shadcn/ui — DO NOT edit manually

lib/
├── types.ts          # All TypeScript interfaces — source of truth
├── database.types.ts # Supabase row/insert/update types + Database schema interface
├── supabase.ts       # createBrowserClient() + createAdminClient()
├── properties.ts     # DB query functions (createProperty, updateProperty, upsertFromWasi…)
├── plans.ts          # Plan definitions + canAccess() / canAccessChannel()
├── mock-data.ts      # Mock data (used as fallback while Supabase is being set up)
└── utils.ts          # shadcn cn() helper

supabase/
├── schema.sql        # Full PostgreSQL schema — run once in Supabase SQL Editor
├── seed.sql          # Minimal seed: 1 company + 1 admin agent (no credentials needed)
└── migrations/
    ├── 001_property_status.sql   # Drops old `estado`, adds estado_publicacion + disponibilidad
    └── 002_property_notes.sql    # Creates property_notes (immutable — no UPDATE/DELETE RLS)
```

---

## Database (Supabase)

### Key tables
- `companies` — one per agency, holds Wasi credentials and plan
- `agents` — users belonging to a company, linked to `auth.users`
- `properties` — full property inventory with CRM fields
- `property_notes` — **append-only** log (SELECT + INSERT policies only — no DELETE at DB level)
- `contacts` — CRM contacts/leads

### Property status — TWO separate fields
```typescript
estado_publicacion: 'activo' | 'destacado' | 'inactivo'   // visibility on portals
disponibilidad:     'disponible' | 'vendido' | 'alquilado' // transaction state
```
Never use a single `estado` field. The two-field model mirrors Wasi's `id_status_on_page` + `id_availability`.

### Supabase client pattern
```typescript
// Server-side (API routes, server components):
import { createAdminClient } from '@/lib/supabase'
const db = createAdminClient()

// Client-side (browser components):
import { createBrowserClient } from '@/lib/supabase'
```

### TypeScript write operations — use `as any`
Supabase v2 + TypeScript 5 deep generic inference fails on `.insert()/.update()/.upsert()`.
Always cast to bypass:
```typescript
const { data, error } = await (db.from('properties') as any)
  .insert(payload).select().single()
```
Read operations (`.select()`) do NOT need the cast — types resolve correctly.

### Running the schema
1. Supabase → SQL Editor → run `supabase/schema.sql`
2. Run `supabase/seed.sql` (creates one company + one admin agent)
3. For existing DBs run migrations in order: `001_...` then `002_...`

---

## Landing Page (`app/page.tsx`)

Public marketing page, **monoline** style (zero-chroma oklch grayscale, border-only structure, diagonal line pattern in the hero — the old iridescent orb/amber palette is gone). Does NOT use the app shell. Other public pages (`/demo`, `/precios`, `/plataforma`, …) share the nav/footer via `components/landing/LandingShell.tsx`.

### Sections (in order)
Hero (single H1 with the cycling word inside it, definitional "PropSync es el CRM inmobiliario con IA para Panamá…" sub, factual stats — no invented metrics) → Plataforma integral → Feature carousel (Marketing, IA, Tours, Web+API, Add-ons) → **Portales** (`#portales`, XML feed publishing) → **Cómo funciona** (`#como-funciona`) → Planes (no prices — "Cotización a medida", White Label) → **FAQ** (`#faq`, native `<details>`) → CTA → Contacto → Footer.

### SEO / AI-search rules
- **Everything must be in the server HTML.** The carousel renders all 5 panels and hides inactive ones with `hidden` — never go back to `{tab === n && …}` conditional rendering (crawlers/AI bots don't run JS, so those panels were invisible).
- JSON-LD (`Organization`, `WebSite`, `SoftwareApplication` with `areaServed: PA`) lives inline in the page; keep `featureList` truthful. `public/llms.txt`, `app/robots.ts` (AI crawlers explicitly allowed), `app/sitemap.ts`.
- Only claim shipped features. No public prices anywhere.
- `.nav-pill` CSS must not set `display` — Tailwind `hidden md:flex` controls it (setting it showed the pill over the logo on phones).

### Language toggle
Full ES/EN via a `T` translations object (both objects must have the same keys). `useState<'es'|'en'>('es')`. No i18n library.

---

## Property Notes (immutable)

Notes are permanently append-only — enforced at database level via RLS (SELECT + INSERT only, no UPDATE/DELETE policies on `property_notes`).

API: `GET /api/properties/[id]/notes?companyId=X` and `POST` same route.  
UI: Notes feed in `PropertyDetailSheet.tsx` — shows `agent_nombre` + relative time + content.  
Keyboard shortcut: `Ctrl+Enter` to submit a note.

---

## Plan System

```typescript
canAccess(userPlanId, feature)        // boolean
canAccessChannel(userPlanId, canal)   // boolean
requiresPlan(userPlanId, required)    // boolean
```

| Plan (`id`) | Nombre | Precio | Properties | Key features |
|---|---|---|---|---|
| `starter` | Individual | $30/mes | 50 | DB + CRM básico, conexión a portales, 1 usuario, sin API |
| `pro` | Pro | $60/mes (+$7.99/usuario adicional sobre 2 incluidos) | ilimitado | CRM completo, conexión a portales, WhatsApp, marketing automation, API |

**Final pricing as of 2026-06-23** — `agency` tier was removed entirely; large teams scale by adding extra users to Pro instead of a separate tier. See [[pricing-restructure-2tier]] in memory for the full rationale.

### Lugares de publicación (canales)

`lib/canales.ts` exports `CANALES_PUBLICACION` — the single source of truth for channel ids/labels, shared between `lib/plans.ts`'s `limites.canales` and the property form UI. Both plans currently include all three:

- `comprealquile` — Compre o Alquile
- `encuentra24` — Encuentra24
- `pagina_web` — Página web (the property's own public PropSync page, not the Pro-exclusive developer API/embed widget — that's a separate `limites.api` gate)

### Outbound portal XML feeds (how listings reach Encuentra24 / Compre o Alquile)

Pull model, no worker/server: each company has a secret `companies.feed_token` (migration `031_portal_feeds.sql`) and portals fetch `GET /feeds/<feed_token>/<portal>.xml` (`app/feeds/[token]/[file]/route.ts`) on their own schedule (~24h). Portals: `encuentra24`, `comprealquile`, plus `todos` (every publishable listing). `pagina_web` has no feed.

- Included = `estado_publicacion` activo/destacado AND `disponibilidad='disponible'` AND (except `todos`) `canales_publicados` contains the portal. Unmarking a portal or setting inactivo/vendido drops the listing on the portal's next read.
- Serializer is pure: `lib/portal-feed.ts` (`buildPortalFeed`, portal-neutral Spanish schema — `<propsync_feed><propiedades><propiedad>`, all photos, coords, features, tour + public page URL, agent contact). Never selects CRM/commission/owner fields. Tests: `node --test scripts/test-portal-feed.mjs`. If a portal sends its own strict spec, add a dedicated serializer and route that `<portal>.xml` to it.
- Lapsed subscription → `402` (not an empty feed): portals keep the last good import on a failed fetch, whereas an empty feed would delete every listing.
- Each fetch stamps `companies.feed_last_access[portal]`, shown as "Leído por el portal" in Configuración → Fuentes (URLs + per-portal listing counts + regenerate) and in the `/panel-elevare` company drawer (Elevare can generate/copy URLs for manually-managed clients).

### Encuentra24 leads → CRM (inbound)

Pull model ported from the user's standalone `encuentra-wasi/` script (an Encuentra24→Zoho sync for another client; git-ignored, reference only). Encuentra24 CRM API: `GET https://www.encuentra24.com/api.php/v1/crm/index?slug=<cuenta>&limit=50`, header `x-api-key` → `{ data: [{ id, title, status, created_at (unix s), contact: { name, email, phone } }] }`.

- Per-company credentials on `companies.encuentra24_slug` / `encuentra24_api_key` (migration `032_encuentra24_leads.sql`; not in the PostgREST column GRANT). Set in Configuración → Fuentes (`app/api/configuracion/encuentra24`) or by Elevare in the `/panel-elevare` drawer.
- `lib/encuentra24-sync.ts` `syncCompanyEncuentra24()`: leads newer than `encuentra24_last_lead_at` → contact `fuente='encuentra24'`, `external_ref=<lead id>` (unique per company+fuente → re-runs never duplicate). Same email/phone as an existing contact → adds a note instead of a duplicate. Lead title matched to a listing (`matchPropertyByTitle`) → `contact_property_links` + the listing's agent is assigned. Watermark only advances if at least one lead succeeded. Push + owner email per batch.
- Pure helpers in `lib/portal-leads.ts` (phone `00507…`→`+507…`, country, property type, title match); tests `node --test scripts/test-portal-leads.mjs`.
- Contact creation is shared with Compre o Alquile: `lib/portal-lead-ingest.ts` `ingestPortalLeads()`.
- Schedule: `/api/cron/portales` (Bearer `CRON_SECRET`, runs Encuentra24 + Compre o Alquile) is pinged every 5 min from the Elevare DigitalOcean droplet (`deploy/portales-cron.example`) because Vercel Hobby only allows daily crons; `vercel.json` runs it daily as a fallback.

### Compre o Alquile — OpenNavent API (listings out + contacts in)

Compre o Alquile is Navent/QuintoAndar; integrators use the **OpenNavent RELA API** (`https://api-rela-open.navent.com`, OpenAPI at `/v2/api-docs?group=opennavent-realestate`). PropSync/Elevare is the integrator: platform credentials in env `NAVENT_CLIENT_ID` / `NAVENT_CLIENT_SECRET` (requested from Navent, integracion@navent.com), optional `NAVENT_API_URL`. Each agency = a `codigoInmobiliaria` chosen by us (`companies.comprealquile_codigo`, default `propsync-<id>`), which the agency's Compre o Alquile executive links to the PropSync integration (`GET /v1/inmobiliarias` lists linked agencies → "vinculada").

- Auth: `POST /v1/application/login?grant_type=client_credentials&client_id&client_secret` → token passed as `access_token` query param (`lib/navent.ts`, cached; catalogs cached 6h).
- Listings: `PUT /v1/inmobiliarias/{codigo}/avisos/{propertyId}` for every property that is activo/destacado + disponible + canal `comprealquile`; `DELETE` same path when it stops qualifying. Mapping is pure in `lib/navent-mapping.ts` (type via `/v1/tipopropiedades` + synonyms, characteristics via `/v1/tipopropiedades/{id}/caracteristicas` aliases, location via `/v1/ubicaciones/latitud/../longitud/../countrycode/PA`). State per listing in `portal_listings` (status, portal errors, payload hash so unchanged listings aren't re-sent; max 20 PUTs per run). Tests: `node --test scripts/test-navent-mapping.mjs`.
- Contacts: `GET /v2/inmobiliarias/{codigo}/mensajes?fromDate=yyyyMMdd` → `ingestPortalLeads(…, 'comprealquile')`; `codigoAviso` is our property id, so the link is exact.
- Migration `033_comprealquile_navent.sql`. UI: Fuentes card (activate, code to give the portal, counts, sync) + `/panel-elevare` drawer (enable, custom code, optional `comprealquile_plan`, sync). Deactivating takes every listing offline.
- **Untested against the live API** until Navent issues credentials — field mapping follows the OpenAPI spec; first real sync errors are stored per listing in `portal_listings.messages`.
- Inmotech: generic XML feed only; no lead API known.

UI: a "Lugares de publicación" section (pill toggles) at the end of both `propiedades/nueva` and `propiedades/[id]/editar`, writing to `properties.canales_publicados` (`TEXT[]`). `canAccessChannel()` exists but isn't called anywhere yet — channel selection isn't currently plan-gated, only marketing copy reflects what's "included."

---

## Visual Identity — App

- Light: white bg, `#1a73e8` blue
- Dark: `#0f0f1a` bg, `#1a1a2e` card surface
- Always use Tailwind semantic tokens (`bg-background`, `text-foreground`, etc.) — never hardcode hex in app components
- Theme managed by `next-themes` with `attribute="class"`

---

## Responsive Layout — App

- **Desktop (md+):** Sidebar fixed left (w-64), content `md:ml-64`
- **Mobile:** Sidebar hidden, BottomNav fixed bottom
- Property grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Tables: `overflow-x-auto`

---

## TypeScript Rules

- Strict mode — no `any` in app components or lib files
- Exception: Supabase write operations use `(db.from('table') as any)` — documented pattern, not a smell
- `useState` always typed: `useState<Property[]>([])`
- All domain types live in `lib/types.ts` — never re-declare elsewhere
- All DB types live in `lib/database.types.ts`

---

## shadcn/ui Components Installed

`badge`, `button`, `card`, `dialog`, `dropdown-menu`, `input`, `label`, `progress`, `select`, `separator`, `sheet`, `skeleton`, `switch`, `table`, `tabs`, `tooltip`

Never edit files in `components/ui/` — re-run `npx shadcn@latest add <component>` to update.

---

## Wasi Integration

`POST /api/wasi/sync` fetches properties from Wasi API and upserts into Supabase.

Status mapping from Wasi → PropSync:
```typescript
mapStatusOnPage(id): 'activo' | 'destacado' | 'inactivo'
// '3' → 'destacado', '2'|'4' → 'inactivo', else → 'activo'

mapAvailability(id): 'disponible' | 'vendido' | 'alquilado'
// '2' → 'vendido', '3' → 'alquilado', else → 'disponible'
```

---

## Add-ons (paid, stacked on top of a plan)

`company_addons` (`supabase/migrations/023_company_addons.sql` — run manually, not yet applied) tracks add-ons separately from `companies.plan_id` so new add-ons don't need a new migration: `{ company_id, addon_id, activo }`, unique on `(company_id, addon_id)`.

`lib/addons.ts` — `ADDONS` catalog + `hasAddon(companyId, addonId)` + `requireAddon(addonId)` (the single server-side gate; fails closed: 401 unauth → 403 no `accessSettings` → 403 wrong plan / missing add-on row). Both template routes call `requireAddon('marketing')` so enforcement can't drift.

**Security — add-on activation is server-only.** `company_addons` RLS exposes a SELECT-only policy; there is intentionally **no** INSERT/UPDATE/DELETE policy, so the anon/authenticated PostgREST roles cannot self-grant or flip an add-on (despite migration 019's blanket GRANT). Only the service_role admin client (server side) can write a row. There is no self-serve activation endpoint yet — activation is a manual DB insert.

- **`marketing`** — +$40/mes on top of Pro. WhatsApp message costs are NOT included (billed directly to the client by Meta/their BSP) — this only covers platform features: WhatsApp template management, automated lead-qualification flow, shared WhatsApp inbox, bulk email marketing. Requires `plan_id='pro'` AND an active `company_addons` row. No self-serve purchase flow yet (Stripe is still pending) — activation is currently a manual DB row.

### WhatsApp template management (first addon feature shipped)

Wraps Meta's Message Templates Management API (`lib/whatsapp-templates.ts` — `listTemplates`/`createTemplate`/`deleteTemplate` against `/{businessAccountId}/message_templates`, separate from `lib/whatsapp.ts`'s send functions which use `phoneNumberId`). Reuses the `businessAccountId`/`accessToken` already stored on `companies` for WhatsApp messaging.

- `app/api/configuracion/whatsapp/templates/route.ts` (GET list, POST create) + `[name]/route.ts` (DELETE) — gated by `accessSettings` permission + `plan_id='pro'` + `hasAddon(companyId, 'marketing')`, returns 403 with an upsell message otherwise.
- `app/(app)/configuracion/whatsapp/plantillas/page.tsx` — list with status badges (APPROVED/PENDING/REJECTED/...), create-template dialog (name, category, language, header/body/footer with `{{n}}` variables), delete. Shows an addon-upsell screen when the API returns 403. Linked from `configuracion/whatsapp/page.tsx`. Includes an in-app `UsageGuide` rendered only in the unlocked state (so the guide is exclusive to users who have the add-on).

`components/shared/UsageGuide.tsx` — reusable collapsible usage-guide card (title, intro, numbered steps, tips). Render it inside an already-gated page so it's only visible to users with access to that feature.

### Not yet built (later phases of the Woztell-like Marketing addon)
- Configurable lead-qualification flow/state machine
- Shared WhatsApp inbox UI
- Hardcoded MVP instant-qualification flow (original scoped MVP, deprioritized in favor of template management first)
- Bulk/marketing email campaigns (distinct from existing transactional emails in `lib/email.ts`)

---

## Implementation Status

### Completed
- [x] Next.js 14 scaffold + all dependencies
- [x] shadcn/ui + all components
- [x] `lib/types.ts` — full Property interface (50+ Wasi fields + 7 CRM fields)
- [x] `lib/database.types.ts` — Supabase typed schema
- [x] `lib/supabase.ts` — browser + admin clients
- [x] `lib/properties.ts` — all DB query functions
- [x] `supabase/schema.sql` — full schema (run in Supabase ✓)
- [x] `supabase/seed.sql` — minimal seed (1 company + 1 agent)
- [x] `supabase/migrations/` — status redesign + property_notes
- [x] Two-field status model (`estado_publicacion` + `disponibilidad`)
- [x] Property notes — immutable append-only feed
- [x] `app/api/properties/[id]/notes/route.ts`
- [x] `app/api/wasi/sync/route.ts` — Wasi import with status mapping
- [x] `app/api/upload/route.ts` — R2 image upload
- [x] `app/api/brevo/route.ts` — CRM deal sync
- [x] Route group `(app)/` — authenticated app shell
- [x] `components/propiedades/PropertyDetailSheet.tsx` — CRM + notes slide-over
- [x] `components/propiedades/PropertyCard.tsx` — dual status badges
- [x] `app/page.tsx` — full landing page (ES/EN, Outfit font, 10 sections, Elevare credit)
- [x] All 13 app pages (dashboard → configuracion/planes)

- [x] Supabase Auth — `(auth)/login`, `(auth)/registro`, `middleware.ts`, `auth/callback`
- [x] User invite flow — `POST /api/agents/invite`, `configuracion/usuarios` page, Sidebar link
- [x] CRM module — Kanban board, contacts, stages, tags, follow-up notifications, import/export
- [x] CRM API routes — `/api/crm/contacts`, `/api/crm/stages`, `/api/crm/notifications`
- [x] Meta Lead Ads webhook — `POST /api/webhooks/meta-leads`
- [x] Plan enforcement — server-side property limits, channel checks, `getSessionPlan()`, real plan badge
- [x] "Nueva propiedad" form — `app/(app)/propiedades/nueva/page.tsx` with image upload
- [x] Security hardening — all API routes use `resolveCompanyId()`, removed MOCK_USER from plan gates
- [x] ROI/source reports — `/crm/reportes`
- [x] Virtual tours — mixed regular + 360° photo tours, public shareable page, iframe embed (see section below)
- [x] Password reset flow — `/reset` → `/auth/callback?type=recovery` → `/update-password`, fully wired
- [x] Real dashboard — `lib/dashboard.ts`'s `getDashboardData()` queries live Supabase data via `resolveCompanyId()`, no mock data
- [x] Vercel deploy + custom domain — live at `propsyncia.com`
- [x] `supabase/migrations/003_crm_stages.sql` — confirmed applied (`crm_stages` table has rows)
- [x] Wasi auto-sync — `vercel.json` runs `/api/cron/wasi-sync` daily at 6am, real implementation (not a stub)
- [x] Transactional emails — `lib/email.ts` (`sendWelcomeEmail`, `sendAgentWelcomeEmail`, `sendFollowUpReminderEmail`, `sendStageMilestoneEmail`, `sendNewLeadNotification`) over generic SMTP (`lib/email-config.ts`, per-company override or platform `SMTP_*` env vars — not Brevo-specific despite earlier docs calling it that). Welcome email fires from `/api/auth/setup`; follow-up reminders run via `/api/cron/follow-up-reminders` (daily 8am weekdays). What's actually outstanding here, if anything, is SMTP provider credentials/config, not code.

- [x] XML property import — `/propiedades/importar`, generic feed parser + field mapping (see below)
- [x] Brevo as the platform-level ("cuenta madre") email transport (see below)

### Pending
- [x] Outbound portal XML feeds — `/feeds/<token>/<portal>.xml` (see "Outbound portal XML feeds")
- [x] Inbound Encuentra24 leads → CRM (see "Encuentra24 leads → CRM")
- [x] Compre o Alquile via OpenNavent API — listings + contacts (pending Navent integrator credentials)
- [ ] Inmotech leads (no lead API known)
- [ ] Stripe payments — plan upgrade/downgrade, webhook updates `companies.plan_id`

---

## Email transport — three tiers

`sendTransactionalEmail()` in `lib/email.ts` picks, in order:

1. **The company's own SMTP** (`getCompanySmtpConfig`) — always wins, so an agency's mail keeps leaving its own domain.
2. **Brevo, the Elevare "cuenta madre"** (`lib/brevo.ts`) — used for every tenant without their own SMTP, when `BREVO_API_KEY` is set. Uses Brevo's HTTP API (`/v3/smtp/email`), not the SMTP relay, because the API reports per-message delivery errors synchronously.
3. **Platform SMTP** (`SMTP_*` env vars) — the pre-existing fallback, also used if a Brevo send fails.

**Deliberately server-only.** There is no per-company Brevo UI and no way for a tenant to enter a Brevo key: one client pasting a bad key would silently break every email the platform sends on their behalf. Env vars only (`BREVO_API_KEY`, `BREVO_FROM_EMAIL`, `BREVO_FROM_NAME` — documented commented-out in `.env.local`). `GET /api/configuracion/smtp` returns a `platformProvider` field (`'brevo' | 'smtp' | 'none'`) purely so `/configuracion/general` can *tell* the agency where its mail is going out from.

---

## XML property import

`/propiedades/importar` → `components/propiedades/XmlImportWizard.tsx` → `POST /api/properties/import`.

Generic, not portal-specific: works with any listings feed.

- **Parsing runs in the browser** via the platform's own `DOMParser` — no XML dependency on either side. The server only ever receives plain mapped rows.
- `lib/property-import.ts` holds all the pure logic (so it's testable outside React): `parseXmlFeed`, `detectRecordNodes`, `flattenRecord`, `guessMapping`, `parsePrice`, `parseOperacion`, `firstValue`.
- **Record detection** picks the repeating tag with the most same-parent siblings *that carries sub-fields* — that last condition stops a repeated `<caracteristica>` leaf from beating the `<inmueble>` containing it. Feeds needing ≥2 distinct fields to count as listings.
- **Field mapping** is auto-guessed from tag names then confirmed by the user. Matches are claimed strongest-first across all fields, not in field declaration order, so a weak substring hit can't steal a tag another field matches exactly.
- `parsePrice` handles both separator conventions and Panamanian balboas: `"B/. 249,900"`, `"185.000"`, `"1.250.000,50"`, `"US$ 185,000.00"`. The last separator is a decimal point only when the other separator is also present, or when it isn't followed by exactly three digits.
- Repeated sibling tags flatten to `"a | b"`; `firstValue()` takes the head for single-value columns (image URL, lat/lng, reference) and inside `parsePrice`/`parseIntOrNull`.
- **Imports land `estado_publicacion: 'inactivo'`** on purpose — an agent reviews and activates rather than a feed silently going live on portals. Dedupes on `reference`, enforces the plan's property limit against the whole batch, and a restricted `agente` owns everything they import.

---

## Virtual Tours

**Goal:** Let agents upload property photos (regular and/or 360°) and produce a navigable virtual tour clients can view in-browser or embed on an external site. **Implemented** — not the pannellum/AI-walkthrough plan originally sketched below; superseded by a more complete build.

### What's built
- `properties.tour_rooms` (JSONB, `supabase/migrations/004_tour_rooms.sql`) — array of `{ url, label, is360? }`, one per room/photo. `TourRoom` type in `lib/types.ts`.
- `components/propiedades/TourUploader.tsx` — drag/drop or click upload (reuses `/api/upload` → R2), per-room label dropdown, up/down reorder, toggle any photo as 360°, generates the public share URL and an `<iframe>` embed snippet with copy-to-clipboard.
- `components/propiedades/PanoramaViewer.tsx` — wraps `@photo-sphere-viewer/core` (dynamic import, no SSR) for 360° rooms.
- `components/propiedades/TourViewer.tsx` — the actual viewer: Ken Burns slideshow for regular photos, swaps to the 360° panorama viewer for rooms flagged `is360`, swipe/keyboard/arrow navigation, auto-advance (paused on 360° rooms), thumbnail strip, `embed` mode (hides chrome for iframe use).
- `app/tour/[id]/page.tsx` — public route (no auth) rendering the tour for a property; supports `?embed=true`; generates OG metadata for link previews.
- "Tour virtual" tab in `PropertyDetailSheet.tsx` (icon: `Clapperboard`, badge shows room count) hosts `TourUploader`; saves via `PATCH /api/properties/[id]` with `tour_rooms` in the allowed-fields list.

### Not built (future, if ever requested)
- AI-generated 3D scenes from regular photos (Replicate/Stability) — current approach is manual upload + curation, not AI stitching
- Matterport embed support
