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

Public-facing marketing page. **Does NOT use the app shell layout.**

### Design
- Font: `Outfit` (`var(--font-outfit)`) — ultra-thin weights (200) for display text
- Background: `#06060d` (void black) with iridescent CSS sphere hero
- Color accent: amber `#fbbf24` → coral `#fb923c` → fuchsia `#e879f9` → indigo `#818cf8`
- Glassmorphism cards: `rgba(255,255,255,.042)` + `backdrop-filter: blur(24px)`

### Sections (in order)
1. **Hero** — cycling animated headline, iridescent CSS orb, 3 glassmorphism stat cards
2. **Plataforma integral** — capability pills card (12 pills)
3. **Tres pilares** — DB / CRM / IA (numbered steps)
4. **Marketing & Leads** — text + live notification feed mockup
5. **Asistente IA** — WhatsApp conversation mockup (bot → owner → auto-update)
6. **Tour virtual 3D** — 3D viewer mockup (compatible with Matterport / 360°)
7. **Web + API** — embed widget code snippet + REST API curl example
8. **Pricing** — 3 plans (prices TBD — pending business discussion)
9. **CTA band**
10. **Footer** — "Creado por [Elevare](https://elevarewebservices.com)"

### Language toggle
Full ES/EN via a `T` translations object. `useState<'es'|'en'>('es')`. No i18n library needed.

### Animations
All defined in an inline `<style>` tag: `twinkle`, `floatOrb`, `fadeUp`, `pulse`, `slideUp`.
Scroll reveals use `IntersectionObserver` via the `useReveal()` hook + `<Reveal>` wrapper component.
**No height containers around cycling text** — use opacity-only fade to avoid clipping.

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

`lib/addons.ts` — `ADDONS` catalog + `hasAddon(companyId, addonId)`.

- **`marketing`** — +$40/mes on top of Pro. WhatsApp message costs are NOT included (billed directly to the client by Meta/their BSP) — this only covers platform features: WhatsApp template management, automated lead-qualification flow, shared WhatsApp inbox, bulk email marketing. Requires `plan_id='pro'` AND an active `company_addons` row. No self-serve purchase flow yet (Stripe is still pending) — activation is currently a manual DB row.

### WhatsApp template management (first addon feature shipped)

Wraps Meta's Message Templates Management API (`lib/whatsapp-templates.ts` — `listTemplates`/`createTemplate`/`deleteTemplate` against `/{businessAccountId}/message_templates`, separate from `lib/whatsapp.ts`'s send functions which use `phoneNumberId`). Reuses the `businessAccountId`/`accessToken` already stored on `companies` for WhatsApp messaging.

- `app/api/configuracion/whatsapp/templates/route.ts` (GET list, POST create) + `[name]/route.ts` (DELETE) — gated by `accessSettings` permission + `plan_id='pro'` + `hasAddon(companyId, 'marketing')`, returns 403 with an upsell message otherwise.
- `app/(app)/configuracion/whatsapp/plantillas/page.tsx` — list with status badges (APPROVED/PENDING/REJECTED/...), create-template dialog (name, category, language, header/body/footer with `{{n}}` variables), delete. Shows an addon-upsell screen when the API returns 403. Linked from `configuracion/whatsapp/page.tsx`.

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

### Pending
- [ ] Stripe payments — plan upgrade/downgrade, webhook updates `companies.plan_id`

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
