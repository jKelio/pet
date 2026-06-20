# ADR 0009 — Server-side PDF Report: stateless `@react-pdf/renderer` render

**Status:** Accepted

## Context

The session results PDF was generated **100% client-side**: `domToPng` screenshots of the live recharts SVGs, stitched by `jsPDF` (`ResultsPage.tsx`). To put the PDF behind a tamper-proof paywall (see [[0008-tenant-plan-entitlement-gating]]), the artifact must be produced **server-side** — *if the client can render the PDF, it can save it without asking the server*, so client rendering can never be the gated path.

This forces two sub-decisions: **how** the server renders, and **what** it renders from.

Constraints in play:

- The backend runs on **Render free tier** (512 MB, cold starts, the prior 429-wakeup saga). A ~300 MB+ headless Chromium would make cold-starts and OOM materially worse.
- recharts depends on the DOM and **cannot run server-side**.
- The PDF must remain available for a [[Local-Only Session]] (foreign/scouting team) — which by definition **never syncs** — otherwise the scouting use case dies or Local-Only's meaning is corrupted by forcing it into the cloud.

## Decision

The **PDF Report** is rendered server-side with **`@react-pdf/renderer`** (pure-JS, no browser), **statelessly from a posted payload**:

- `POST /pdf` carries the session JSON in the body. The server checks **tenant entitlement** (`pdf:generate`, per [[0008-tenant-plan-entitlement-gating]]), renders the document, returns the PDF buffer, and **stores nothing**.
- The document is **re-composed from session data** (shared `@pet/shared` types), with charts drawn as server-side vector primitives — *not* a pixel-port of the on-screen view. The Report is treated as a new, cleaner artifact, not a screenshot.
- The **client-side `exportToPdf` path for the training results is deleted.** All training-results PDF generation goes through the server, which is also what makes the **monthly quota** countable (see below). Note: `jspdf` / `modern-screenshot` remain in `web` because a *separate* feature — exporting an AI **Recommendation** as a PDF (`RecommendationView`) — still renders client-side and is out of scope here; only the results-page export moved server-side.

Because the endpoint is stateless, PDF generation is **decoupled from the sync state machine**: any session — synced, Pending Sync, or Local-Only — can be exported by posting its data, subject to the club's monthly [[PDF Report]] allowance.

**Metering note (per [[0008-tenant-plan-entitlement-gating]]):** PDF is *not* a boolean `pro` gate — `free` gets **2 Reports/month**, `pro`/`premium` unlimited, counted per distinct session per month. This is decisive for *why* the render must be stateless-from-payload: `free` clubs **cannot sync at all**, so the only thing the server can render their 2 monthly Reports from is the **posted payload** — there is no stored session to read. A tiny `pdf_exports(tenantId, sessionId, yyyymm)` ledger records which distinct sessions were exported, to dedupe (re-downloads are free) and to enforce the cap. The rendered PDF itself is still never stored.

## Alternatives considered

**Headless browser (Puppeteer/Playwright):** Render the actual React results page → pixel-identical PDF. Rejected: ~300 MB+ Chromium is infra-hostile on Render free tier (cold-start latency, OOM); realistically needs a paid plan or a separate render worker. Pixel parity is not worth that operational cost.

**Server charts → image → PDF compositor:** Render charts to PNG/SVG via a headless charting lib, compose with a PDF lib. Rejected: middle weight, two rendering codebases to maintain, still re-implements the visuals without the declarative clarity of react-pdf.

**Stateful, synced-sessions-only** (`POST /sessions/:id/pdf` from the DB): Reuses team-scoped authz and is symmetric with AI (ADR 0006). Rejected: Local-Only and not-yet-synced sessions would get **no PDF ever**, killing scouting or forcing foreign teams into the cloud. The paywall doesn't need persistence to be tamper-proof — the **entitlement** is the gate, not the storage.

## Consequences

- **Deliberate asymmetry with AI** (ADR 0006): AI Recommendations are synced-only (they persist a record and are expensive); the PDF Report is ephemeral and stateless. This is intentional and is why a Local-Only session can have a Report but not a Recommendation.
- The server trusts client-posted session data — acceptable, since it is the coach's own data and the output is a document for them; no cross-tenant authz is meaningful on a self-supplied payload (only authentication + entitlement).
- Add a body-size guard and a zod schema for the payload, plus a rate limit on the render (CPU cost), mirroring the AI route.
- The server PDF will look different from the old screenshot PDF; this is an accepted, one-time visual change.
- **Fonts / Cyrillic:** react-pdf's built-in Helvetica covers Latin-1 (en/de including umlauts/ß) but **not Cyrillic** — so Russian text (the `ru` locale, or Cyrillic club/player names) will not render correctly with the default font. The renderer registers a Unicode TTF as `PetSans` when `PDF_FONT_PATH` points at one (e.g. a bundled Noto Sans), falling back to Helvetica otherwise. Shipping that font asset is the follow-up required for full `ru` support; the render itself does not crash on missing glyphs (they render as blank), so the feature degrades rather than fails.
- The model is rendered with charts approximated as proportional bars (filled `View`s), not recharts pies — a deliberate, lighter visual consistent with "vector primitives, not a screenshot."
