# Three-role model with enforced track + view scope

## Decision

The role model is reduced from five roles to three — `club_admin`, `coach`, `analyst` — and the
permission matrix in `@pet/shared/permissions` is now actually enforced, where before it was a dormant,
unused declaration. `assistant` and `viewer` are removed; `sessions:create` is merged into
`sessions:track`. Enforcement covers two capabilities: the **right to track** (only `club_admin` and
`coach`; checked in `SyncSessionUseCase`) and the **view scope** (a `coach` may only read/list sessions
of teams they are on a Roster for, while `club_admin`/`analyst` — the holders of `sessions:view:all` —
see every team; checked in `ListTeamSessionsUseCase` / `GetSessionUseCase`). Session **deletion** (creator
or `club_admin`) and the client-side PDF **export** are intentionally left as-is.

## Context

The matrix, the `Role` value object and the `useAuth().can()` helper all existed but were never called,
so any authenticated member assigned to a team could create and track sessions regardless of role. This
review wired the matrix up *and* sharpened it rather than mechanically enforcing the prior, partly
contradictory set.

## Why merge `sessions:create` into `sessions:track`

The app is offline-first: a session is created **and** tracked entirely client-side in IndexedDB and
uploaded later as a single `POST /sessions/sync`. The backend only ever sees a finished session, so it
cannot tell whether a caller "created" versus merely "tracked" it, and there is no multi-device flow
(coach starts, assistant fills in) that would justify the split. A separate create permission was
therefore unenforceable theatre. With the split gone, `assistant` (track-only) collapsed into `coach`,
and `viewer` (read one team, no real persona) was dropped — leaving `analyst` as the one read-only,
club-wide role.

## Why `club_admin` bypasses the team-assignment check when tracking

A `club_admin` manages Rosters for others and is typically on no Roster themselves, yet must be able to
track for any Team. So the team-assignment gate (kept for `coach`) is skipped for `club_admin`,
consistent with "club_admin is tenant-wide in everything".

## Considered alternatives

- **Enforce the original 5-role matrix verbatim** — rejected: it baked in the unenforceable create/track
  split and two roles with no real persona.
- **Reduce to 2 roles (club_admin + coach)** — rejected: `analyst` fills a genuine, non-redundant gap
  (read/export everything, manage nothing), and re-adding an enum value later is cheaper than removing one.
- **Full enforcement pass including delete and export** — rejected as scope creep: delete already behaves
  per the matrix, and export is client-side over data the caller can already see, so an export gate would
  add no real protection.

## Consequences

- Removing two values from the `user_role` Postgres enum requires recreating the type (migration
  `0001_reduce_user_roles`, which first remaps `assistant→coach`, `viewer→analyst`). This is the
  "hard to reverse" part of the decision.
- A role with neither `sessions:view:all` nor a matching Roster assignment receives `403`/`404` from the
  read endpoints; the frontend hides the Tracking nav and redirects no-track roles (e.g. `analyst`) away
  from `/` to `/history`.
