# ADR 0010 — Non-destructive, reversible plan downgrade (soft-lock)

**Status:** Accepted

## Context

The three Plans (see [[0008-tenant-plan-entitlement-gating]]) carry capacity limits (seats, teams) and a hard rule that `free` has **no cloud sessions at all**. A club can therefore end up **over its limits** by downgrading — most acutely premium → free:

> A premium federation with 18 teams, 12 members and 300 synced cloud sessions drops to free (1 team, 1 member, no cloud sync). What happens to the 17 extra teams, 11 extra members, and 300 cloud sessions?

Downgrades are frequently **involuntary and temporary** (an expired card, a lapsed renewal). A policy that destroys data on the way down would punish a transient billing hiccup permanently.

## Decision

**Downgrades never delete data. Overflow is soft-locked and auto-restored on re-upgrade.**

- **New creation over a cap is blocked** (no 2nd team on free, no invite on free, no sync on free) — the normal entitlement gate from [[0008-tenant-plan-entitlement-gating]].
- **Existing over-cap rows are retained but [[Locked]]:** over-cap Teams and Memberships, and — on `free` — **all** of the club's cloud sessions. Locked data is hidden behind an "upgrade to restore access" prompt.
- **Re-upgrade restores everything** automatically; no data is ever removed by a plan change.
- When dropping to `free` (1 team), the **club_admin chooses which single Team stays active**; the rest lock. The club_admin's own Membership always stays active.

"Locked" is an access state, not deletion: rows stay in the DB, excluded from normal queries by a lock predicate tied to the current plan's limits.

## Alternatives considered

**Block the downgrade until under-limit:** refuse until the admin manually deletes teams/members/sessions to fit. Keeps plan invariants always true (free truly has ≤ its caps), but pushes destruction onto the user and blocks self-serve downgrade exactly when billing has lapsed and the user is least able to act. Rejected.

**Hard-delete the overflow:** auto-remove whatever exceeds the new caps; wipe all cloud sessions on free. Simplest state, but irreversibly destroys user data on a possibly-temporary lapse. Rejected as dangerous.

## Consequences

- **"free has no cloud data" is really "no *accessible* cloud data."** A downgraded free club's sessions still exist server-side, Locked — the data model must support rows that exist but are filtered out by plan, and every cloud-session query must apply the lock predicate.
- Re-upgrade is a pure unlock (cheap, no data migration), which makes win-back and dunning flows painless.
- Storage is retained for non-paying (Locked) clubs — an accepted cost; a separate retention/cleanup policy for long-dormant locked tenants can be decided later and is explicitly out of scope here.
- Enforcement must distinguish "over capacity because you downgraded" (lock, allow read-after-upgrade) from "at capacity, creating new" (block create) — both read the same `PLAN_LIMITS`, but act differently.
