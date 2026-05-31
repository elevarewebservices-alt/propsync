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
│   ├── publicar/
│   │   ├── canales/page.tsx
│   │   ├── cola/page.tsx
│   │   └── historial/page.tsx
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
│   ├── PropertyDetailSheet.tsx   # Slide-over: CRM fields + immutable notes feed
│   └── PublishModal.tsx
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

| Plan | Properties | Key features |
|---|---|---|
| `starter` | 50 | DB + basic CRM, Facebook only, 1 user |
| `pro` | 200 | Full CRM, WhatsApp, marketing automation, 5 users, API |
| `agency` | ∞ | Everything + unlimited users, dedicated support |

Prices are **pending final decision** — do not treat current landing page prices ($49/$99/$199) as final.

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

### Pending
- [ ] Real dashboard — `/dashboard` still shows MOCK_PROPERTIES; needs live Supabase counts
- [ ] Brevo transactional emails — welcome email on signup, follow-up reminders, password reset
- [ ] Stripe payments — plan upgrade/downgrade, webhook updates `companies.plan_id`
- [ ] 3D renders / AI walkthrough — generate virtual walkthroughs from uploaded property photos (see section below)
- [ ] Facebook publishing — currently calls `localhost:8001`; Python backend needs production deploy
- [ ] Wasi auto-sync — daily cron via Vercel Cron Jobs or Supabase pg_cron
- [ ] Password reset page — `/auth/callback` needs to handle `type=recovery` flow
- [ ] Vercel deploy + custom domain
- [ ] `supabase/migrations/003_crm_stages.sql` — run in Supabase SQL Editor if not done

---

## 3D Renders / AI Virtual Walkthrough

**Goal:** Allow agents to upload regular photos of a property and generate an AI-powered 3D walkthrough / virtual tour that clients can navigate in browser.

### Approach options (choose one at build time)
| Option | How | Cost |
|---|---|---|
| **Matterport embed** | Agent uploads `.matterport` scan link; we embed the iframe in PropertyDetailSheet | Free embed, requires Matterport camera |
| **Kuula / 360° photo** | Agent uploads equirectangular 360° JPG; we use `pannellum.js` or `three.js` to render it | Free, works with any 360° phone |
| **AI upscale + tour** | Upload regular photos → send to Replicate/Stability AI model → stitch into walkable scene | ~$0.10–$0.50/property, requires model selection |
| **Video walkthrough** | Agent uploads MP4 video → stored in R2 → streamed via `<video>` in sheet | Cheapest, no AI needed |

### MVP recommendation
Start with **Kuula-style 360° photo + pannellum.js** (free, no API needed, works with any modern phone camera in panorama mode):
1. Add `panorama_url` column to `properties` table
2. `PropertyDetailSheet` — new "Tour 360°" tab: renders pannellum viewer if `panorama_url` set
3. In "Nueva propiedad" / property edit — upload field for 360° image (stores to R2 same as regular photos)
4. Future: swap pannellum for AI-generated scene once a stable model is chosen

### Files to create
- `supabase/migrations/004_panorama.sql` — `ALTER TABLE properties ADD COLUMN panorama_url TEXT`
- `components/propiedades/PanoramaViewer.tsx` — wraps `pannellum` via dynamic import (no SSR)
- Add panorama upload field to `app/(app)/propiedades/nueva/page.tsx`
- Add "Tour 360°" tab to `components/propiedades/PropertyDetailSheet.tsx`
