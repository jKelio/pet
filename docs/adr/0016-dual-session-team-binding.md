# ADR 0016 — Dual Session-Team Binding After Altersklasse Introduction

**Status:** Accepted  
**Date:** 2026-06-25

## Context

Before Altersklasse was added, teams were identified only by a free-text name. Sessions carried a `teamName` string typed at setup time; the sync process attempted to match it to a registered Team by name to determine the `teamId` for the sync payload. An unmatched name left the session's team ambiguous.

With Altersklasse (ADR sibling: the Team entity now has `(ageClass, name)` as its canonical identity), the tracking setup switches from a free-text autocomplete to a dropdown, so the member selects a concrete team and the session is bound by `teamId` at the moment of selection — no matching required at sync time.

## Decision

New sessions (created after this change) bind to a Team by **ID** (set at tracking setup via dropdown selection).

Legacy sessions (created before this change, still in local IndexedDB) remain bound by **free-text name match** in `resolveSyncTeamId()` — no migration is performed.

## Alternatives Considered

- **Migrate all local IndexedDB sessions** to ID-based binding: requires reading every draft/pending session and resolving names against the current team list. Risky (renaming a team between session creation and migration breaks the mapping), expensive, and the app is not yet in production use.
- **Keep free-text for new sessions too**: sacrifices the uniqueness guarantee and perpetuates the ambiguity the dropdown was designed to eliminate.

## Consequences

- `resolveSyncTeamId()` and name-matching logic in `sessionSync.ts` remain as a permanent fallback for legacy sessions.
- Once all pre-Altersklasse sessions have been synced or discarded, the name-matching fallback can be removed.
- No data is lost or at risk from the coexistence of the two binding mechanisms.
