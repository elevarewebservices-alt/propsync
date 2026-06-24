# PropSync — Pending Tasks & Next Steps

**Last updated:** 2026-06-23  
**Current date:** 2026-06-23

---

## 🔴 CRITICAL — Must do before shipping to production

### 1. Run Supabase migration for API key feature
- **File:** `supabase/migrations/021_company_api_key.sql`
- **Status:** ✅ **Done** — confirmed applied via `node scripts/check-api-key-migration.mjs` on 2026-06-22

### 2. Test API key feature end-to-end
- **Status:** ✅ **Done 2026-06-22** — generated a real key, tested list/single/pagination/missing-key(401)/invalid-key(401) against production. All passed.
- Regenerated the test key after sharing it in chat — old key confirmed `401` afterward.

### 3. Verify three High-severity security fixes
- **H-01:** Try to escalate agent role via PATCH `/api/agents/[id]` (should 403 if not owner/admin)
- **H-02:** Try account takeover by POSTing to `/api/auth/setup` with fake `userId` (should 401)
- **H-03:** Try presigned-URL upload without session (should 401, not generate unsigned URL)
- **Status:** ✅ Code-reviewed line-by-line 2026-06-22 — all three confirmed correctly implemented and fail closed in production. `npx tsc --noEmit` clean.
- **⚠️ Found + fixed during this review (not in original H-01/02/03 list):** `DELETE /api/agents/[id]` had **no role check at all** — any active agent (role `agente`) could deactivate teammates/admins. The UI button is shown to every role with no gate, so this was live-exploitable, not theoretical. Fixed: added the same `['owner','admin']` check used in PATCH. Also wrapped `resolveCompanyId()` in PATCH/DELETE with try/catch (was throwing unhandled 500 instead of clean 401 for unauthenticated requests).
- **⚠️ Important caveat for manual testing:** all these checks have a `process.env.NODE_ENV !== 'production'` dev fallback that grants owner access when there's no session. `npm run dev` always runs in development mode, so these attacks will silently succeed against the dev server (false negative). **Must test against `npm run build && npm start` or the Vercel deployment**, not `npm run dev`.
- **Status:** ✅ **Done 2026-06-23** — H-01 and H-03 confirmed live against production with a real non-owner session (H-02 and the API key flow were already confirmed earlier). All three hold.

---

## 🟡 HIGH PRIORITY — Needed for Phase 2 mobile app

### 4. Complete Capacitor mobile app scaffold
**From:** Plan file @ `C:\Users\DELL\.claude\plans\yes-here-is-what-peppy-quilt.md`
- ✅ `mobile/capacitor.config.ts` with appId `com.propsyncia.app`
- ✅ Plugins in `mobile/package.json` (camera, push-notifications, app, splash-screen, status-bar)
- ✅ `npx cap add android` + `npx cap add ios` — both native projects generated locally 2026-06-22 (gitignored per `mobile/.gitignore`, regenerated on demand)
- ✅ **iOS path decided: Codemagic** (user has no Mac). Added `codemagic.yaml` at repo root — workflow `ios-capacitor-release`, triggers on `ios-*` tags, regenerates `ios/` in CI (since it's gitignored), signs via App Store Connect integration, publishes to TestFlight. Documented setup steps in `mobile/README.md`.
- **Status:** ⏳ Pending — (1) Codemagic account ✅ done, (2) Apple Developer account ⏳ **payment processing 2026-06-23** ($99/yr, not yet confirmed/active — Apple's enrollment review can take hours to days). **Still needed once active**: (3) create the App Store Connect API key integration named exactly `propsync_app_store_connect` in Codemagic, (4) create the `com.propsyncia.app` app shell in App Store Connect, (5) push a tag like `ios-1` to trigger the first build.
- **Android:** Google Play account ✅ **paid 2026-06-23** ($25). ⏸️ **On hold** — user needs to acquire a physical Android device before building/testing locally via Android Studio.
- **Target date:** 2026-06-30 (before Phase 2 testing)

### 5. Push notifications — native APNs/FCM
- Add `native_push_tokens` table migration (stores FCM/APNs tokens, not VAPID)
- Create `POST /api/push/native-token` endpoint (receives and stores native token)
- Adapt push sending logic to use FCM/APNs when token is native
- Set up Firebase project (FCM) and Apple APNs certificates
- **Status:** ⏳ Pending (Phase 3 per plan)
- **Target date:** 2026-07-15

### 6. Mobile biometric login
- Add biometric handler in `lib/native.ts`
- Gate sensitive actions behind `@capacitor/biometric` plugin
- **Status:** ⏳ Pending (Phase 3 per plan)
- **Target date:** 2026-07-15

---

## 🟠 MEDIUM PRIORITY — Business/product

### 7. Finalize pricing
- **Status:** ✅ **Done 2026-06-23** — final 2-tier structure: **Individual** $30/mes (1 usuario, 50 propiedades, Facebook only, sin API) and **Pro** $60/mes (propiedades ilimitadas, 2 usuarios incluidos + $7.99/usuario adicional, conexión a portales, API REST incluida, módulo Mantener completo). **Agency tier removed entirely** — large agencies scale by adding extra users to Pro instead of a separate tier.
- Updated: `lib/plans.ts` (PLANS, ASSISTANT_LIMITS, requiresPlan order), `lib/types.ts` (`PlanId`, added `PlanLimits.api`), `lib/auth.ts` (`getSessionPlan`), `components/layout/Header.tsx`, `components/shared/PlanBadge.tsx`, `app/(app)/configuracion/planes/page.tsx`, `app/(app)/mantener/automatizaciones/page.tsx`, `app/page.tsx` (landing, ES+EN), `app/precios/page.tsx`, `app/(app)/ayuda/faq/page.tsx`, `lib/mock-data.ts`.
- **API access gated to Pro+**: `lib/api-key.ts`'s `authenticateApiKey()` now checks `canAccess(plan_id, 'api')` (fails closed if plan downgraded after key generation); `POST /api/configuracion/api-key` also checks plan before generating a key, returns 403 with a clear message on Starter/Individual.
- **Production data:** the one company that was on `plan_id: 'agency'` (`a0000000-0000-0000-0000-000000000001`, "Mi Empresa" — seed/test company) was migrated to `'pro'` after explicit user confirmation, since Agency had equal-or-greater features than Pro.

### 9. Stripe payments
- Plan upgrade/downgrade flow
- Webhook for subscription updates (`companies.plan_id`)
- UI in `/configuracion/planes`
- **Status:** ⏳ Pending
- **Target date:** 2026-08-15

> **Removed from this list 2026-06-23 (handled outside this session, not Claude's scope):** Brevo transactional emails, Facebook publishing backend production deploy.

---

## 🟢 LOW PRIORITY — Nice-to-have / post-launch

### 11. Wasi auto-sync
- Daily cron via Vercel Cron Jobs or Supabase `pg_cron`
- **Status:** ⏳ Pending
- **Target date:** Post-launch (v1.1)

### 12. Rate limiting on `/api/v1/properties`
- **Status:** ✅ **Done 2026-06-22, tightened 2026-06-22** — `lib/rate-limit.ts`, **20 req/min** per company (lowered from 60 per owner request to slow bulk extraction), max **50/page** (lowered from 500). Wired into both `/api/v1/properties` and `/api/v1/properties/[id]`. Returns `429` + `Retry-After` header when exceeded; `X-RateLimit-Remaining` header on success.
- **Known limitation:** in-memory, per-instance (no Redis/KV configured in this project) — under multiple concurrent Vercel instances the real ceiling is `N_instances × 20/min`, not a precise distributed limit. Upgrade to Upstash/Vercel KV later if traffic justifies it.
- **Not covered:** invalid/brute-forced API keys aren't rate-limited (the check only runs after a key authenticates successfully) — that would need IP-based limiting, a separate piece of work.

### 13. Virtual tours (3D/360°)
- **Status:** ✅ **Already done** — discovered 2026-06-23 while scoping this as new work: this was fully built in an earlier session and just never reflected back into CLAUDE.md/this doc. `TourUploader.tsx` (mixed regular + 360° photo upload, reorder, label per room) + `TourViewer.tsx` (Ken Burns slideshow, swaps to `PanoramaViewer.tsx`/`@photo-sphere-viewer/core` for 360° rooms) + public `app/tour/[id]/page.tsx` (shareable + `?embed=true` iframe support) + `properties.tour_rooms` JSONB column (migration `004_tour_rooms.sql`). Lives as the "Tour virtual" tab in `PropertyDetailSheet.tsx`. CLAUDE.md's roadmap section rewritten to describe what's actually built instead of the original pannellum/AI-walkthrough plan.
- **Not built:** AI-generated 3D scenes from regular photos (current approach is manual curation, not AI stitching), Matterport embed. Only worth doing if specifically requested later.

### 14. Password reset page (`/auth/callback?type=recovery`)
- **Status:** ✅ **Done** — verified 2026-06-23, this was already fully wired: `(auth)/reset/page.tsx` calls `resetPasswordForEmail` with `redirectTo=/auth/callback?type=recovery`; `app/auth/callback/route.ts` exchanges the code and redirects `type=recovery` sessions to `/update-password`; `(auth)/update-password/page.tsx` validates length/match and calls `auth.updateUser({ password })`, then redirects to `/dashboard`. Expired/invalid links surface a clear message via `login?error=auth_callback_failed`. "¿Olvidaste tu contraseña?" link on `/login` points to `/reset`. No code changes needed — this PENDING_TASKS entry was stale.

### 15. Vercel deployment + custom domain
- **Status:** ⏳ Pending (currently dev-only)
- **Target date:** Before public launch

### 16. Per-agent permission system
- **Status:** ✅ **Done 2026-06-23** — `agente` role now defaults to: edit-only-own properties, view-only-own contacts, Configuración restricted to "General". Admin/owner can override any flag per-agent from Configuración → Usuarios (⚙️ icon per row). AI assistant tools respect the same scoping. See `lib/permissions.ts` + memory `agent-permissions-system.md`.
- **Migration 022 confirmed applied** (`agents.permissions` column exists).
- **✅ Tested live 2026-06-23** with the `jupiteralemanc@carolinau.edu` test agent — confirmed scoped to own properties/contacts and Configuración reduced to "General".
- **Flagged assumptions to revisit if wrong:** "Usuarios" nav item hidden for agentes (wasn't explicitly named); "Equipo"/"Reportes" team-wide views left open (not explicitly mentioned); property/contact notes stayed unrestricted (collaborative by design).

---

## ✅ COMPLETED (this session, 2026-06-22 → 2026-06-23)

- [x] Three High-severity security fixes (H-01, H-02, H-03) + DELETE role-gate fix found in review
- [x] Per-company API key feature (management + v1 endpoints) — tested live end-to-end
- [x] Rate limiting on /api/v1/* — shipped at 60/min, tightened to 20/min + 50/page same day
- [x] Propietarios/Sidebar/CSV feature (separate owners from leads)
- [x] Security audit (OWASP Top 10 / ASVS)
- [x] Marketing capabilities document (`PropSync-Capacidades.txt`)
- [x] Capacitor + Codemagic CI scaffold (Phase 1 code done, Phase 2 needs user accounts)
- [x] Migrations 021 + 022 run in Supabase (confirmed via check scripts)
- [x] Fixed orphaned invited-agent bug (dashboard crash) — self-healing added to `lib/auth.ts`
- [x] Per-agent permission system (agente scoped to own data, admin override UI, bot scoping)
- [x] **Committed + pushed to `main`** — multiple commits through `172484c`, all deployed to Vercel

---

## 🎯 Immediate next steps

All security + permissions verification is done. What's left is either external setup (accounts, signups) or business decisions — nothing else is blocked on more code review:

1. Codemagic setup: account, Apple Developer account, `propsync_app_store_connect` integration, App Store Connect app shell, push `ios-1` tag
2. Google Play account ($25) + Android Studio local build + 20 testers for internal track
3. Pricing is now finalized (Individual $30 / Pro $60+$7.99/usuario) — unblocks Stripe integration work (item 9) whenever you want to schedule it
4. Password reset and virtual tours both turned out to be already done — verified 2026-06-23, no code changes needed
5. Optional code work available now, not yet requested: custom domain DNS (needs your Vercel access either way)

---

## 📋 Files modified this session

- `app/api/agents/[id]/route.ts` — H-01 authorization fix (PATCH role gate) + 2026-06-22 follow-up (DELETE role gate, try/catch on resolveCompanyId)
- `scripts/check-api-key-migration.mjs` — verifies whether migration 021 has been applied (new, 2026-06-22)
- `app/api/auth/setup/route.ts` — H-02 authentication fix
- `app/auth/callback/route.ts` — H-02 callback update
- `app/api/upload/route.ts` — H-03 upload auth fix
- `app/(app)/configuracion/general/page.tsx` — API key UI
- `app/api/configuracion/api-key/route.ts` — API key management (GET, POST, DELETE)
- `app/api/configuracion/api-key/reveal/route.ts` — API key reveal (owner-only)
- `app/api/v1/properties/route.ts` — Public properties export (paginated)
- `app/api/v1/properties/[id]/route.ts` — Single property export
- `lib/api-key.ts` — Helper functions (generate, hash, authenticate)
- `lib/database.types.ts` — Added CompanyRow API key fields
- `supabase/migrations/021_company_api_key.sql` — Database schema
- Various previous files (propietarios, CSV export, etc.)

---

## 📞 For questions/clarification

- API key feature: masked reveal, owner-only, AES-256-GCM encrypted
- Security fixes: all three High-severity issues addressed; tested with `tsc` + `build`
- Mobile: Capacitor plan is in plan mode (not implemented yet, awaits user confirmation + toolchain setup)
