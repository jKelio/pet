# PET — Practice Efficiency Tracking

Domain language for tracking ice-hockey practice efficiency. Coaches log timing and count data per drill during a training session.

## Language

### Time tracking

**Time Moving**:
The total time the tracked player is actively moving during a drill. It is the sum of `with Puck` + `without Puck`, not a separately running timer.

**with Puck**:
A timer for the time the tracked player is moving in possession of the puck. Started by the `with Puck` action (a Reception). Mutually exclusive with `without Puck` — only one of the two runs at a time; starting one stops the other.

**without Puck**:
A timer for the time the tracked player is moving without possession of the puck. Started by the `without Puck` action, or automatically by a `Pass`, `Shot`, or Turnover. Mutually exclusive with `with Puck`.
_Note_: `with Puck` + `without Puck` == `Time Moving` (a partition into two timers).

**Reception**:
The act of the tracked player gaining possession (a received pass or a picked-up loose puck). Realised by starting the `with Puck` timer. Not separately counted.
_Avoid_: Pickup, gain puck.

**Turnover**:
The tracked player losing possession *without* a pass or shot (e.g. a check or a mishandle). Realised by starting the `without Puck` timer while `with Puck` is running.
_Avoid_: Loss, giveaway.

**Time-Moving-Episode**:
One continuous movement bout of the tracked player, made up of adjacent `with Puck` and `without Puck` children. It ends when neither puck timer is running (the player stops moving) and a new one begins when movement resumes. A drill may contain several. Episodes are *derived* from the children's timestamps, not stored.
_Avoid_: Segment (reserved for a single timer start/stop interval), bout.

### Sessions

**Planned Session**:
A practice session where the number of drills is declared upfront and all drills are configured before live tracking starts. The default session type.
_Avoid_: structured, preset.

**Open Session**:
A practice session where the drill structure is not known in advance. Drills are added one by one as the training progresses.
_Avoid_: Observer Mode, Live Mode, unstructured.

### Multi-tenant admin

**Tenant**:
A club — the top-level organisational unit. One club owns one or more Teams and has a set of Members.
_Avoid_: Organisation, account, club (use Tenant in code; "club" is fine in UI copy).

**Team**:
A group within a Tenant (e.g. "U16", "Herren 1"). A Tenant has one or more Teams. A Member can be assigned to multiple Teams.
_Avoid_: Group, squad.

**Membership**:
The relationship between a User and a Tenant, carrying a single Role. A User has at most one Membership per Tenant.
_Avoid_: Account, subscription.

**Roster**:
The set of Members assigned to a specific Team. Managed by the club_admin; coaches see only their own Roster(s) in the app.
_Avoid_: Team members (ambiguous with the broader Membership concept).

**Role**:
The permission level of a Membership within its Tenant (`club_admin`, `coach`, `assistant`, `analyst`, `viewer`). A single Role per Membership — not per Team.
_Avoid_: Permission, access level.

### Actions & counters

**Action**:
Any single thing a coach can log against a drill. Every Action is one of two kinds — a **Timer Action** or a **Counter** — so "Action" is the umbrella term, not a third category alongside them.
_Avoid_: using "Action" to mean only the timed kind.

**Timer Action**:
An Action measured as *elapsed time* (e.g. Explanation, Demonstration, `with Puck`, `without Puck`). It accumulates duration while running.

**Counter**:
An Action measured as a *number of occurrences* (e.g. Repetition, Shot, Pass, Feedback to a player). Each trigger records one event; there is no duration.
_Avoid_: Tally, hit count.
