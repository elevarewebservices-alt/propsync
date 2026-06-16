# CRM Module — Export Pack

This folder is a **self-contained snapshot** of the CRM module extracted from PropSync
(a real-estate SaaS). It's designed to be **copy-pasted into a fresh Next.js 14 project**
and adapted into a CRM for a **cleaning-services company** (or any service business).

Everything here compiles together as-is — all internal imports resolve within this folder.

---

## What's included

```
exports/
├── app/
│   ├── (app)/
│   │   ├── crm/                  # Main CRM UI
│   │   │   ├── page.tsx          # Table + Kanban board, pipeline tabs, filters
│   │   │   ├── [id]/page.tsx     # Contact detail (tabs: info, interest, notes, activity…)
│   │   │   ├── nuevo/page.tsx    # New-contact form
│   │   │   ├── importar/page.tsx # CSV/Excel import wizard
│   │   │   ├── equipo/page.tsx   # Team / agent performance view
│   │   │   └── reportes/page.tsx # KPIs + charts
│   │   └── configuracion/crm/    # Pipeline & stage settings
│   ├── api/
│   │   ├── crm/                  # All CRM API routes (contacts, stages, pipelines…)
│   │   └── contact/route.ts      # Public contact-form intake endpoint
│   ├── contacto/page.tsx         # Public contact form (lead capture)
│   ├── globals.css               # Tailwind + shadcn CSS variables
│   ├── layout.tsx                # Root layout (fonts + Providers)
│   └── providers.tsx             # Theme provider wrapper
├── components/
│   ├── crm/                      # Kanban, table, filters, detail tabs, import wizard
│   └── ui/                       # shadcn/ui primitives (button, card, dialog, …)
├── lib/
│   ├── supabase.ts               # Browser / server / admin Supabase clients
│   ├── auth.ts                   # Session → company_id resolver, plan helpers
│   ├── types.ts                  # All TypeScript interfaces (SOURCE OF TRUTH)
│   ├── database.types.ts         # Supabase typed schema
│   ├── validation.ts             # Input validation helpers
│   ├── crypto.ts                 # Encrypt/decrypt (used for SMTP credentials)
│   ├── email.ts / email-config.ts# Transactional email (nodemailer + per-company SMTP)
│   ├── matching.ts               # ⚠️ REAL-ESTATE specific — see "Adapt" below
│   ├── plans.ts                  # Plan tiers / feature gating
│   └── utils.ts                  # shadcn cn() helper
├── supabase/
│   ├── schema.sql                # Base tables: companies, agents, contacts, …
│   └── migrations/               # CRM-specific migrations (stages, notes, pipelines)
├── package.json / tsconfig.json / tailwind.config.ts / postcss.config.mjs
├── components.json               # shadcn config
├── next.config.mjs
└── middleware.ts                 # Auth route protection
```

---

## Core architecture (carries over unchanged)

| Concept | Where | Notes |
|---|---|---|
| **Multi-tenant** | `companies` table + `company_id` on every row | One company = one cleaning business |
| **Auth** | Supabase Auth + `agents` table | `agents.auth_user_id` links to `auth.users` |
| **Company resolution** | `lib/auth.ts → resolveCompanyId()` | Reads session cookie → agent → company_id |
| **Pipelines & stages** | `crm_stages` + `pipelines` tables | Fully dynamic, configurable per company |
| **Contacts** | `contacts` table | The lead/customer record — adapt fields (see below) |
| **Notes (immutable)** | `contact_notes` table | Append-only activity log |
| **Admin DB writes** | `(db.from('x') as any).insert(...)` | Documented Supabase v2 + TS workaround |

The Kanban board, table view, filters, CSV import/export, stage configuration,
notifications and reports are **business-agnostic** — they work for a cleaning CRM
with zero changes.

---

## ⚠️ Adapt for cleaning services

The CRM was built for real estate, so a few pieces reference properties. For a
cleaning-services CRM:

### 1. Delete these real-estate-specific files
```
components/crm/detail/ContactPropertiesTab.tsx   # links contacts ↔ properties
components/crm/detail/ContactMatchesTab.tsx       # AI property matching
lib/matching.ts                                    # property-matching engine
app/api/crm/contacts/[id]/links/                   # contact↔property links API
app/api/crm/contacts/[id]/matches/route.ts         # property-matching API
```
Then remove their imports + the two `<TabsTrigger>` / `<TabsContent>` blocks
(`matches`, `propiedades`) from `app/(app)/crm/[id]/page.tsx`.

### 2. Rework the `Contact` interface (`lib/types.ts`)
Real-estate fields → cleaning-services fields:

| Current (real estate) | Suggested (cleaning services) |
|---|---|
| `tipo: 'cliente' \| 'propietario' \| 'broker'` | `tipo: 'residencial' \| 'comercial' \| 'recurrente'` |
| `tipo_operacion: 'compra' \| 'alquiler'` | `tipo_servicio: 'profunda' \| 'mantenimiento' \| 'post_obra' \| 'alfombras'` |
| `presupuesto_min / presupuesto_max` | `presupuesto_estimado` (per visit) |
| `zona_interes` | `direccion_servicio` / `zona_cobertura` |
| `meta_campaign / meta_form / meta_ad_set` | keep (lead-source tracking still useful) |

Mirror the same field renames in:
- `supabase/schema.sql` (the `contacts` table definition)
- `components/crm/detail/ContactInfoTab.tsx` + `ContactInteresTab.tsx` (the edit forms)
- `app/api/crm/contacts/route.ts` + `[id]/route.ts` (validation + insert/update payloads)
- `components/crm/ContactsFilterBar.tsx` (filter dropdowns)

### 3. Pick cleaning-relevant default stages
The seed/migration sets real-estate stages. For cleaning, e.g.:
`Nuevo lead → Cotización enviada → Agendado → Servicio completado → Recurrente`.
Stages are editable in the UI (`/configuracion/crm`), so you can also just change
them after launch.

### 4. Branding
- `lib/email.ts` and email templates reference "PropSync" — rename.
- `app/layout.tsx` metadata title/description.
- Google Calendar "Agendar" link text in `[id]/page.tsx` says "CRM PropSync".

---

## Setup in a new project

1. **Create the app**
   ```bash
   npx create-next-app@14 my-cleaning-crm --typescript --tailwind --app
   ```
2. **Copy** the contents of this `exports/` folder into the project root, merging
   `package.json` dependencies.
3. **Install deps**
   ```bash
   npm install @supabase/supabase-js @supabase/ssr nodemailer lucide-react next-themes
   npx shadcn@latest init           # if components.json conflicts
   ```
4. **Supabase**
   - Create a project, then run `supabase/schema.sql` in the SQL Editor.
   - Run the migrations in `supabase/migrations/` in numeric order.
5. **Environment variables** (`.env.local`):
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   NEXT_PUBLIC_DEV_COMPANY_ID=     # a company UUID for local dev before auth is wired
   ENCRYPTION_KEY=                 # 32-byte key for lib/crypto.ts (SMTP secrets)
   ```
6. `npm run dev` → visit `/crm`.

---

## What is NOT included (intentionally)

Real-estate-only modules were left out: property inventory, Wasi sync, publishing
channels, WhatsApp verification campaigns, virtual tours, the landing page, and the
AI assistant. If you later want the AI chat assistant, it lives in `lib/assistant-tools.ts`
+ `app/api/assistant/` in the original project and can be ported the same way.

---

*Extracted from PropSync · built by Elevare.*
