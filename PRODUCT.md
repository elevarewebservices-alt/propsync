# Product

## Register

product

## Users

Real estate agents and agency admins in Latin America (primarily Panama). They work mostly from their phones — in the field, between property visits, often on the PropSync native app (Capacitor iOS/Android shell wrapping the live web app). Spanish-first. Their job: keep property inventory current, respond to leads fast, and publish listings across portals without duplicating work.

## Product Purpose

PropSync is an all-in-one platform (database + CRM + AI) for real estate agencies: property inventory, client/lead management, AI assistant, WhatsApp marketing, and multi-portal publishing. Success = an agent can manage their entire inventory and pipeline from their phone, with nothing lost and nothing published twice. Tagline: "Tu inventario, siempre activo, siempre publicado."

## Brand Personality

Professional, efficient, trustworthy. The app register is calm and utilitarian (Inter, semantic Tailwind tokens, `#1a73e8` blue accent); the marketing landing is the expressive surface (Outfit, iridescent dark hero). In-app: clarity over flash.

## Anti-references

- Cluttered legacy real-estate CRMs (Wasi's own UI) — dense tables, tiny touch targets.
- Consumer-portal look (bright listing-site aesthetics) inside the work app.
- Anything that hides or covers content on mobile — the native app is the primary surface; overlays must respect notch/home-indicator safe areas.

## Design Principles

1. **Mobile is the primary surface** — every screen, sheet, and modal must be fully usable one-handed on a phone inside the native WebView (edge-to-edge, `contentInset: 'never'` → CSS owns the safe areas).
2. **Nothing gets covered** — fixed/sticky/overlay UI must pad for `env(safe-area-inset-*)`; content never sits under the status bar or home indicator.
3. **Two-field truth** — status is always `estado_publicacion` + `disponibilidad`, shown as two badges, never merged.
4. **Server is the authority** — plan gates, trial status, and permissions render from server verdicts; UI never implies access it can't deliver.
5. **Spanish-first copy** — direct, action-oriented labels ("Publicar", "Guardar borrador"); errors say what's missing and how to fix it.

## Accessibility & Inclusion

- Semantic Tailwind tokens for full dark/light support (next-themes, class strategy).
- Touch targets ≥ 44px on mobile nav and action buttons.
- Visible focus states on interactive elements; forms highlight missing required fields in red with an explanatory alert.
- No WCAG certification target set; aim for AA contrast in app surfaces.
