# ADR 0018 — Minimal public landing page at the root route

**Status:** Accepted

## Context

Unauthenticated visitors to the app previously had no marketing surface: the root route required login. A public landing page was added (`packages/web/src/features/marketing/`), and its design was later stress-tested against an external proposal (a ChatGPT-generated "high-converting SaaS landing page": 11 sections with demo CTA, dashboard screenshots, problem/solution framing, multi-sport positioning, social proof, video, and a large bottom login block).

Constraints that shaped the decision:

- There is **no self-serve funnel**: tenants are onboarded by invitation/onboarding, there is no public signup, no demo environment, and no free tier. The only meaningful conversion for a visitor today is **logging in**.
- The product is ice-hockey-focused; multi-sport is deferred until a second sport exists (see [ADR 0011](0011-curated-knowledge-library.md), sport seam).
- A public page aimed at the German market legally requires an Impressum (§ 5 DDG) and a Datenschutzerklärung (DSGVO), reachable from every public page.

## Decision

1. **Root route branches on auth.** `/` renders the marketing landing page for unauthenticated visitors and the tracking app for members (`RootRoute` in `packages/web/src/router.tsx`). No separate marketing domain or static site.
2. **Deliberately minimal, single-CTA page.** Hero (logo, claim, subclaim, one login button) plus three feature cards (Live Tracking, TEI, Federation Reporting) and a footer. Long-form conversion sections — demo/free-tier CTA, dashboard screenshots, testimonials, how-it-works, video — are **rejected until a self-serve signup or demo exists**, because they would advertise actions a visitor cannot take.
3. **Theme-independent dark surface.** Colors are hardcoded to the splash-screen palette (`#03101f → #0d1c39`) instead of the `bg-background`/`text-foreground` theme tokens, so the page looks identical regardless of the visitor's `prefers-color-scheme`; the logo CSS variables are pinned to their dark-theme values for the same reason. Shared styling lives in `packages/web/src/features/marketing/surface.ts`; lazy-route Suspense fallbacks mirror the surface so chunks load without a light flash.
4. **Legal pages as public routes.** `/impressum` and `/datenschutz` render on the same marketing surface and are linked from the landing footer and the login page. The legal body text is German-only (it is a legal document, not UI copy); only the footer link labels go through i18n (en/de — Russian deliberately skipped for now).

## Alternatives considered

- **Long-form conversion page** (screenshots, demo CTA, social proof, multi-sport icons). Rejected: no demo/free-tier to convert to, no testimonials/logos to show yet, and multi-sport copy contradicts the deferred sport seam. Revisit when a self-serve funnel exists.
- **Theme-token styling** (page follows the visitor's light/dark preference). Rejected: on light preference the marketing surface loses the brand look and the logo renders navy-on-navy.
- **Separate static marketing site.** Rejected: an extra deployable for one page; the SPA lazy-loads the marketing chunk only for logged-out visitors.

## Deferred / backlog

- **Coach Center** — an in-app menu item hosting user-facing PDF help documents (usage guide + "Best Practice – Coaches Cards"). Distinct from ADR 0011's Knowledge Library (AI-grounding text, super-admin-only). Needs its own planning round: PDF hosting/serving, nav placement, translations, roles.
- Landing conversion sections (screenshots, how-it-works, social proof) once a self-serve funnel exists.
