# ADR 0012 — Session Results is a transient view, not a sidebar destination

**Status:** Accepted  
**Date:** 2026-06-22

## Context

The **Session Results** view (`/sessions`) shows charts, KPI cards, and timelines for a single completed practice session. It reads its data exclusively from the Zustand tracking store — either snapshotted right after live tracking ends, or populated via `restoreFromDraft` when re-opening a session from the History view.

The sidebar previously included a permanent "Results" link to `/sessions`. This was misleading: the view has no data of its own; it only makes sense in the context of a specific session. Navigating to it directly from the sidebar when no session was freshly completed produced an empty fallback state with no useful content. Additionally, ResultsPage resets the tracking store on mount (in non-view-only mode), so returning to it via the sidebar after the first visit always showed the empty state.

## Decision

1. **Remove the sidebar entry.** `nav.results` is dropped from `NAV_ITEMS` and from i18n. Session Results is reachable only via its two legitimate entry points:
   - Automatically, when the coach taps "Finish" at the end of live tracking (`TrackingPage` → `navigate('/sessions')`).
   - Explicitly, via the "View results" action on any session in the History view (`HistoryPage` → `restoreFromDraft` → `navigate('/sessions?view=1')`).

2. **Redirect on empty store.** If `/sessions` is accessed directly (bookmark, browser back, manual URL) and the store contains no drills, the page redirects immediately to `/history` instead of rendering a dead-end fallback.

## Alternatives considered

- **Context-sensitive sidebar entry** (show only when a fresh session is in the store): increases nav complexity and confuses users when the item appears and disappears.
- **Keep the sidebar link, fix the empty state**: still a misleading nav affordance — a permanent sidebar item implies a persistent, revisitable destination.

## Consequences

- The sidebar loses one item. Coaches reach results via the natural end-of-tracking flow or History — both already existed and work unchanged.
- Direct URL access is no longer a dead end; it falls back to History, which is the appropriate context for browsing past sessions.
- Future features that want to surface session-level analysis (e.g. cross-session comparisons) should live in the History view, not resurrect `/sessions` as a standalone destination.
