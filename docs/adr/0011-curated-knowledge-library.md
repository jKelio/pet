# ADR 0011 — Central, curated Knowledge Library grounds AI analysis (not per-tenant URLs)

**Status:** Accepted

## Context

The AI training recommendation feature (see [ADR 0006](0006-recommendations-bound-to-synced-sessions.md), [ADR 0007](0007-recommendation-generation-via-sse.md)) originally grounded each analysis on a **per-tenant Source Library**: every `club_admin` curated their own list of external URLs, the coach picked 1–5 per analysis, and Gemini fetched those URLs at generation time via its `urlContext` tool.

This had three problems for a multi-tenant SaaS aimed at uniform quality across hockey clubs:

1. **No uniformity** — each tenant analysed against a different, self-curated basis.
2. **Fragility** — URL-based grounding suffers link rot, Gemini's ~20-URL `urlContext` ceiling, JS-heavy/login-gated pages, and unpredictable fetch quality. The reference framework we want to standardise on (DEB Rahmentrainingskonzeption) spans 60–80 sub-pages.
3. **No central control** — the platform operator could not steer the knowledge base shared across clubs.

## Decision

Replace the per-tenant URL Source Library with a single **global, Pracmetrics-curated Knowledge Library** of editorial **text** entries, scoped by **sport**.

- **Global, super-admin-managed.** Entries live in `library_entries` (no `tenant_id`), CRUD only via `/superadmin/library`. Tenants neither manage nor see the library.
- **Curated text, not URLs.** An entry is `{ title, content, sport }`. The analysis concatenates the `content` of all entries for the sport directly into the prompt; the `urlContext` tool is removed. No scraping, no fetch-at-generation, no URL ceiling, no link rot, copyright-cleaner (our own paraphrase), and token-cheap (curated digests, not raw HTML).
- **Whole library, always.** No per-analysis source picker — every analysis is grounded on the full set of entries for the sport, so results are uniform.
- **Sport seam.** Each entry carries a `sport` (default `ice_hockey`); the analysis filters by sport (currently fixed to ice hockey). The tenant→sport mapping is deferred until a second sport actually exists.
- **No source citations.** `RecommendationDocument.sourceReferences` is no longer produced (kept optional for historical records). The used entry titles are snapshotted into `session_recommendations.sourceUrls` as lightweight provenance.
- Existing per-tenant `sources` rows are **discarded** in migration `0005`; historical recommendations are kept untouched.

## Alternatives considered

- **Keep URLs but make the list global.** Still subject to link rot, the `urlContext` URL ceiling, and unreliable fetching of a 60–80-page framework.
- **Scrape + store page text per URL.** Adds scraping/refresh infrastructure, still tied to changing URLs, and raises copyright questions around storing third-party content.
- **Per-tenant + global baseline.** Reintroduces non-uniformity, the explicit thing we set out to remove.

## Trade-offs

| | Curated text (chosen) | Per-tenant URLs (before) |
|---|---|---|
| Uniform across tenants | ✓ | ✗ |
| Stable (no link rot / fetch failures) | ✓ | ✗ |
| Central platform control | ✓ | ✗ |
| Tenant flexibility | ✗ | ✓ |
| Stays current automatically | ✗ (manual curation) | ✓ (live URLs) |
| Token cost per analysis | Low | Variable / high |

The cost is manual curation effort and that the library does not auto-update — accepted deliberately, since uniformity and central control are the goal, and the source framework is stable.
