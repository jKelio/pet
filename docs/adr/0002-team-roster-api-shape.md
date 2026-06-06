# Team Roster API: granular endpoints + extended list-members

## Decision

Team Roster management (assigning/removing Members from a Team) uses two granular endpoints:
- `POST /admin/teams/:teamId/members` — assign one Member to the Team
- `DELETE /admin/teams/:teamId/members/:membershipId` — remove one Member from the Team

The existing `GET /admin/members` response is extended to include a `teamIds: string[]` field per Member, rather than introducing a separate `GET /admin/teams/:teamId/members` endpoint.

## Why granular POST/DELETE instead of bulk PUT

A `PUT /admin/teams/:teamId/members` (replace-roster) would simplify the frontend but risks accidentally clearing an entire Roster if a client sends a partial list. Granular add/remove maps directly to the existing `assignTeam` / `unassignTeam` repository operations and makes each mutation explicit and independently auditable.

## Why extend list-members instead of a new team-members endpoint

The Admin page already loads all Tenant Members via `GET /admin/members`. Embedding `teamIds` in that response allows the frontend to derive any Team's Roster client-side without an additional per-team request. A dedicated endpoint would require an extra round-trip every time a Team accordion is opened — for a dataset (< ~20 members per club) that fits comfortably in the existing members payload.
