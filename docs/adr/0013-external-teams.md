# ADR 0013 — External Teams (Premium-only, Tenant-owned)

**Status:** Accepted

## Context

A federation (or any large club) wants to track a training of a team it does **not field** — e.g. a member club's U16 — and keep the results in **its own** Tenant, never in the tracked club's Tenant. Until now the only way to track a non-own team was a [[Local-Only Session]]: a free-text team name that matches no registered [[Team]], marked never-to-sync. That stays available on every plan, but it is purely local and not a first-class, syncable entity.

The ask is to make such a foreign team a real, syncable record — sold as a [[premium]] capability, consistent with premium's "national/regional federations" positioning. The constraints already in force:

- Enforcement is **server-side** ([[0008-tenant-plan-entitlement-gating]]); the server only ever sees a session at **sync** time, so a "tracking" gate is unenforceable — the gate must bite at register and sync.
- **Tenant isolation** is load-bearing: every query is scoped by `tenantId`, including the sync roster check, view-scope ([[0004-role-model-and-enforcement]]), metering, and the lock predicate ([[0010-non-destructive-plan-downgrade]]).

## Decision

**An External Team is a [[Team]] with `kind='external'`, owned by the *tracking* Tenant, that only `premium` may create or sync.**

1. **Tenant-owned, not cross-tenant.** The External Team and its sessions live in the tracking Tenant. The tracked club's account is not involved — no row crosses the tenant boundary, so tenant isolation is preserved.

2. **Flag on Team, not a new entity.** A `kind` discriminator (`'own' | 'external'`, default `'own'`) plus `externalClubName` (the tracked club's name, set once at registration — own teams leave it null). Sessions keep binding to `teamId` unchanged, so the membership↔team [[Roster]] assignment, coach view-scope, and the lock predicate all work as-is. Cost accepted: own-team list/capacity queries must filter `kind='own'`.

3. **Premium gated at both register and sync.** Creating a `kind='external'` Team requires premium (a new boolean feature in `CreateTeam`, modelled like `ai` — *not* the team-capacity check, so external teams don't consume the own-team cap). Syncing a session bound to one also requires premium (`SyncSession`), on top of the normal Cloud Sync quota and the existing roster check. Both gates means a non-premium Tenant can never hold an External Team, so no orphaned external entities exist below premium.

4. **Below premium is unchanged.** A foreign team is still trackable as a free-text [[Local-Only Session]] on every plan — local, exportable as a [[PDF Report]], never synced. External Team is strictly the premium upgrade of that scenario.

5. **Access rights fall out of "it is a Team."** `club_admin` tracks any team; a `coach` assigned to the External Team's Roster tracks/reads it; `analyst`/`club_admin` read all. No new role or scope rule (see [[0004-role-model-and-enforcement]]).

6. **Downgrade locks the feature.** See the amendment to [[0010-non-destructive-plan-downgrade]]: External Teams and their synced sessions are [[Locked]] whenever `plan !== 'premium'` — a **feature**-based lock trigger, distinct from 0010's capacity-based ones, so it fires even on premium→pro where own-team cloud data is retained. Re-upgrade to premium restores them; nothing is deleted.

## Alternatives considered

**Reference another Tenant's Team directly** (the literal "non-tenant team"): rejected — a session belonging to one Tenant but pointing at another Tenant's Team special-cases every tenant-scoped query (roster, view-scope, metering, lock) and raises unmodelled ownership/consent questions. The federation registering its *own* record of the team gives the same outcome without breaching isolation.

**Synced session with no registered Team** (`teamId`-less cloud session): rejected — forces every team-scoped query to tolerate a null `teamId`, and loses the ability to group a tracked opponent across sessions, which is the point of tracking them.

**Separate `ExternalTeam` entity:** rejected — a second nullable FK on sessions plus duplicated assignment, view-scope, and lock machinery, for a row that is a Team in all but ownership of players.

**Gate sync only (let any plan register one):** rejected — leaves inert external entities in free/pro tenants, reopening the "do they count against the team cap / clutter pickers" question that the both-gates rule closes.

## Consequences

- Schema: `teams` gains `kind` and `externalClubName`. `EntitlementSnapshot` gains `externalTeams: { allowed }`, surfaced via `/me`.
- New gates in `CreateTeam` and `SyncSession`; own-team list/capacity queries must exclude `kind='external'`.
- An external-team session's `clubName` derives from the team's `externalClubName`, not the tenant-name default.
- The lock predicate gains a feature dimension (`kind='external'` ⇒ locked unless premium) — see [[0010-non-destructive-plan-downgrade]].
