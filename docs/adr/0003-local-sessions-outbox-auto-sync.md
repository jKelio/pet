# Local sessions as a delete-on-sync outbox with auto-sync + reconnect retry

## Decision

The local IndexedDB `db.sessions` table is a **pending-sync outbox**: it holds only Completed Sessions that have not yet been synced to the backend.

- On completion, a session is appended to `db.sessions` (no longer clearing prior rows).
- A sync is attempted immediately when the app is online and has an access token + team.
- On a **successful** sync the local row is **deleted** (delete-on-sync); the session then lives only in the cloud.
- Sessions that fail to sync (offline / no team yet) remain in the outbox and are retried on app start, when a token+team become available, and on the browser `online` event (`useSyncPending`, mounted in `AppShell`).
- The outbox is surfaced in the History view ("Pending — not synced") with per-session re-view and manual re-sync.

## Context

Previously `completeSession()` called `db.sessions.clear()` before storing each session, so only the single most recent Completed Session was kept, and `db.sessions` was never read back into the UI. Combined with the only `sessionApi.sync` call living on the Results page, this meant a Completed Session that was not synced before navigating away was both **un-viewable** and **permanently un-syncable** — and the *next* completion silently destroyed it via `clear()`. Coaches track at ice rinks (poor connectivity) and run back-to-back sessions, so multiple unsynced sessions co-existing is a real scenario.

## Why delete-on-sync instead of keeping a marked local copy

Keeping synced sessions locally would duplicate the backend (the source of truth, already browsable via the History list) and require pruning/storage management. Treating the local table purely as an outbox keeps its semantics unambiguous ("local = awaiting sync") and the data small.

**Trade-off accepted:** an already-synced session cannot be re-viewed while offline — but it is safe in the cloud, and the offline-safety concern that motivated this change is specifically about *unsynced* data.

## Why no navigation guard

A "you haven't synced — really leave?" guard was the original idea but addresses neither root problem: it does not make data re-viewable/re-syncable, and it never fires for the real data-loss path (the next completion). Auto-sync + a persistent retried outbox provide an actual recovery path, so the guard was deliberately not implemented.

## Session → team binding (resolved)

A session is routed to a team via `resolveSyncTeamId(session, teams)`:

1. the team the coach chose while tracking — captured as `practiceInfo.teamId` when the free-text `teamName` matches a registered Team (set in `PracticeInfoForm`), else
2. the coach's only team when they have exactly one (unambiguous), else
3. `null` — **ambiguous**: auto-sync does not fire, the session stays visibly in the outbox, and the coach picks a team in the History "Pending" list before syncing.

This replaces the earlier blind `teams[0]` fallback, which silently routed every session to the coach's first team — so a session tracked for "Team B" landed under "Team A" and was invisible under "Team B" (and, having auto-synced, never showed as pending either).

`practiceInfo.teamId` is an optional field on the shared `PracticeInfo` DTO. It is purely client-side routing metadata; the authoritative team association is the top-level `PracticeSession.teamId` the backend stores from the sync request.

### Why resolve-or-defer instead of always routing to a default team

Auto-sync fires before the coach can confirm anything, so a default team would re-introduce silent mis-routing for multi-team coaches. Deferring the ambiguous case to a visible manual pick keeps the seamless path for the common case (one team, or a name that matches a team) while never guessing the team wrong.

## Local-only (foreign / scouting) sessions

Coaches occasionally track a team from another club (scouting an opponent). Such a session has no
registered Team to sync to, and must never go to the cloud. A `localOnly` flag carries this intent:

- Set via an explicit **checkbox in the tracking form** — *before* completion. This is deliberate: for
  single-team coaches auto-sync fires immediately on completion, so a "mark it later in History" affordance
  would be too late. An explicit, pre-completion flag is also robust where name-matching heuristics are not.
- `localOnly` sessions are skipped by completion auto-sync and by the reconnect retry, and are shown in a
  separate "Local only" section in History (view + PDF export, no team picker / no sync), until deleted.
- The flag is a purely local concern — it lives on the Dexie `SavedSession`/`DraftSession` and the tracking
  store, **not** on the shared `PracticeInfo` DTO (these sessions never reach the backend).

## Deletion

- **Local sessions** (outbox or local-only) are removed straight from IndexedDB (`db.sessions.delete`) —
  no server involvement. This also bounds growth of the local-only pile.
- **Synced (cloud) sessions** are removed via `DELETE /sessions/:id` → `DeleteSessionUseCase`, authorized
  for the session's **creator or a club_admin** (mirrors the existing role pattern in
  `RemoveTeamMemberUseCase`). The backend enforces this regardless of what the UI shows.
- Both confirm via native `confirm()` (consistent with `SuperAdminPage`).
