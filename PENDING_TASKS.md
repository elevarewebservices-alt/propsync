# PropSync — Pending Tasks & Next Steps

**Last updated:** 2026-06-22 (code review pass)  
**Current date:** 2026-06-22

---

## 🔴 CRITICAL — Must do before shipping to production

### 1. Run Supabase migration for API key feature
- **File:** `supabase/migrations/021_company_api_key.sql`
- **Status:** ✅ **Done** — confirmed applied via `node scripts/check-api-key-migration.mjs` on 2026-06-22

### 2. Test API key feature end-to-end
- Generate key via UI (`/configuracion/general` → "API para desarrolladores")
- Test reveal/hide/copy
- Test regenerate (old key should stop working)
- Test `GET /api/v1/properties` with `Authorization: Bearer <key>`
- Test `GET /api/v1/properties/[id]` with key and without key (should 401)
- **Status:** ⏳ Pending — blocked on task #1 (migration)
- **Target date:** 2026-06-23

### 3. Verify three High-severity security fixes
- **H-01:** Try to escalate agent role via PATCH `/api/agents/[id]` (should 403 if not owner/admin)
- **H-02:** Try account takeover by POSTing to `/api/auth/setup` with fake `userId` (should 401)
- **H-03:** Try presigned-URL upload without session (should 401, not generate unsigned URL)
- **Status:** ✅ Code-reviewed line-by-line 2026-06-22 — all three confirmed correctly implemented and fail closed in production. `npx tsc --noEmit` clean.
- **⚠️ Found + fixed during this review (not in original H-01/02/03 list):** `DELETE /api/agents/[id]` had **no role check at all** — any active agent (role `agente`) could deactivate teammates/admins. The UI button is shown to every role with no gate, so this was live-exploitable, not theoretical. Fixed: added the same `['owner','admin']` check used in PATCH. Also wrapped `resolveCompanyId()` in PATCH/DELETE with try/catch (was throwing unhandled 500 instead of clean 401 for unauthenticated requests).
- **⚠️ Important caveat for manual testing:** all these checks have a `process.env.NODE_ENV !== 'production'` dev fallback that grants owner access when there's no session. `npm run dev` always runs in development mode, so these attacks will silently succeed against the dev server (false negative). **Must test against `npm run build && npm start` or the Vercel deployment**, not `npm run dev`.
- **Status:** Manual live testing (against production build) still ⏳ Pending
- **Target date:** 2026-06-23

---

## 🟡 HIGH PRIORITY — Needed for Phase 2 mobile app

### 4. Complete Capacitor mobile app scaffold
**From:** Plan file @ `C:\Users\DELL\.claude\plans\yes-here-is-what-peppy-quilt.md`
- ✅ `mobile/capacitor.config.ts` with appId `com.propsyncia.app`
- ✅ Plugins in `mobile/package.json` (camera, push-notifications, app, splash-screen, status-bar)
- ✅ `npx cap add android` + `npx cap add ios` — both native projects generated locally 2026-06-22 (gitignored per `mobile/.gitignore`, regenerated on demand)
- ✅ **iOS path decided: Codemagic** (user has no Mac). Added `codemagic.yaml` at repo root — workflow `ios-capacitor-release`, triggers on `ios-*` tags, regenerates `ios/` in CI (since it's gitignored), signs via App Store Connect integration, publishes to TestFlight. Documented setup steps in `mobile/README.md`.
- **Status:** ⏳ Pending — code/CI scaffolding done; **user must still**: (1) sign up at codemagic.io and connect the repo, (2) get an Apple Developer account ($99/yr), (3) create the App Store Connect API key integration named `propsync_app_store_connect`, (4) create the `com.propsyncia.app` app shell in App Store Connect, (5) push a tag like `ios-1` to trigger the first build.
- **Android:** stays local — Android Studio, no CI needed (see README).
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
- **Issue:** Landing page shows placeholder prices ($49/$99/$199)
- **Dependency:** Business decision required (sales, market research)
- **Impact:** Cannot promote/sell until locked in
- **Status:** ⏳ Blocked on business
- **Target date:** TBD (owner decision)

### 8. Brevo transactional emails
- Welcome email on signup (already scaffolded in `/api/auth/setup`)
- Follow-up reminders for vencidas (overdue follow-ups)
- Password reset template
- **Status:** ⏳ Pending (low-priority, basic flow works)
- **Target date:** 2026-07-30

### 9. Stripe payments
- Plan upgrade/downgrade flow
- Webhook for subscription updates (`companies.plan_id`)
- UI in `/configuracion/planes`
- **Status:** ⏳ Pending
- **Target date:** 2026-08-15

### 10. Facebook publishing backend
- Currently calls `localhost:8001` (dev Python backend)
- Needs production deployment + environment config
- **Status:** ⏳ Blocked on Python backend ops
- **Target date:** TBD (dependent on ops)

---

## 🟢 LOW PRIORITY — Nice-to-have / post-launch

### 11. Wasi auto-sync
- Daily cron via Vercel Cron Jobs or Supabase `pg_cron`
- **Status:** ⏳ Pending
- **Target date:** Post-launch (v1.1)

### 12. Rate limiting on `/api/v1/properties`
- **Status:** ✅ **Done 2026-06-22** — `lib/rate-limit.ts`, 60 req/min per company, wired into both `/api/v1/properties` and `/api/v1/properties/[id]`. Returns `429` + `Retry-After` header when exceeded; `X-RateLimit-Remaining` header on success. Verified live: fired 63 requests against a test key, confirmed 200 for the first 60 and 429 for the rest.
- **Known limitation:** in-memory, per-instance (no Redis/KV configured in this project) — under multiple concurrent Vercel instances the real ceiling is `N_instances × 60/min`, not a precise distributed limit. Upgrade to Upstash/Vercel KV later if traffic justifies it.
- **Not covered:** invalid/brute-forced API keys aren't rate-limited (the check only runs after a key authenticates successfully) — that would need IP-based limiting, a separate piece of work.

### 13. 3D virtual tours / AI walkthrough
- Documented in CLAUDE.md but not implemented
- Requires model selection (Kuula/360° MVP or AI upscale)
- **Status:** ⏳ Pending (roadmap only)
- **Target date:** v1.2 or later

### 14. Password reset page (`/auth/callback?type=recovery`)
- Already partially wired in `middleware.ts` and `app/auth/callback/route.ts`
- Needs `/update-password` page completion
- **Status:** ⏳ Pending (basic email reset works)
- **Target date:** v1.1

### 15. Vercel deployment + custom domain
- **Status:** ⏳ Pending (currently dev-only)
- **Target date:** Before public launch

---

## ✅ COMPLETED (this session)

- [x] Three High-severity security fixes (H-01, H-02, H-03) + DELETE role-gate fix found in review
- [x] Per-company API key feature (management + v1 endpoints)
- [x] Rate limiting on /api/v1/* (in-memory, 60 req/min/company)
- [x] Propietarios/Sidebar/CSV feature (separate owners from leads)
- [x] Security audit (OWASP Top 10 / ASVS)
- [x] Marketing capabilities document (`PropSync-Capacidades.txt`)
- [x] Capacitor plan drafted (Phase 1/2/3 breakdown)
- [x] Migration 021 run in Supabase (confirmed via check script)
- [x] **Committed + pushed to `main`** — 5 commits (`f4085a1..d7f7b09`), deployed to Vercel

---

## 🎯 Immediate next steps

1. **Verify the Vercel deploy** picked up `d7f7b09` and "API para desarrolladores" now shows at `/configuracion/general`
2. **Test API key** end-to-end (generate, reveal, use in curl) — see step-by-step in conversation
3. **Test security fixes** against the production build (H-01 escalation, H-02 account takeover, H-03 unsigned upload)
4. Codemagic setup: account, Apple Developer account, `propsync_app_store_connect` integration, App Store Connect app shell, push `ios-1` tag

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
