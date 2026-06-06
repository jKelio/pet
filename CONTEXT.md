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

**Completed Session**:
A session whose live tracking has finished and which has been stored locally in IndexedDB (`db.sessions`). Distinct from a *Draft* (the in-progress autosave in `db.drafts`).
_Avoid_: Saved Session (use in code only), finished session.

**Pending Sync (Outbox)**:
The set of Completed Sessions not yet transferred to the backend. The local `db.sessions` table *is* this outbox — it holds only sessions awaiting sync. Surfaced to the coach in the "Pending — not synced" section of the History view.
_Avoid_: queue, unsynced backlog.

**Synced Session**:
A Completed Session that has been transferred to the backend. On a successful sync the local copy is **deleted** (delete-on-sync), so a Synced Session lives only in the cloud and is re-viewed via the History list.
_Avoid_: uploaded session.

**Local-Only Session**:
A Completed Session the coach has explicitly marked as **not for the cloud** — typically a foreign/scouting team from another club, which has no registered Team to sync to. Marked via a checkbox at tracking time so it is never auto-synced; it stays in the local outbox under a "Local only" section (re-viewable, PDF-exportable) until deleted. Distinct from [[Pending Sync (Outbox)]], which *is* awaiting sync.
_Avoid_: draft, offline session.

### Multi-tenant admin

**Tenant**:
A club — the top-level organisational unit. One club owns one or more Teams and has a set of Members.
_Avoid_: Organisation, account, club (use Tenant in code; "club" is fine in UI copy).

**Team**:
A group within a Tenant (e.g. "U16", "Herren 1"). A Tenant has one or more Teams. A Member can be assigned to multiple Teams.
_Avoid_: Group, squad.
_Note_: A practice session carries a free-text **team name** (a display label, possibly typed ad hoc). It is bound to an actual registered Team only when that name matches one; that binding is what decides which Team the session syncs into. An unmatched name leaves the session's Team ambiguous.

**Membership**:
The relationship between a User and a Tenant, carrying a single Role. A User has at most one Membership per Tenant.
_Avoid_: Account, subscription.

**Roster**:
The set of Members assigned to a specific Team. Managed by the club_admin; coaches see only their own Roster(s) in the app.
_Avoid_: Team members (ambiguous with the broader Membership concept).

**Role**:
The permission level of a Membership within its Tenant. One of three: `club_admin`, `coach`, `analyst`. A single Role per Membership — not per Team.
_Avoid_: Permission, access level.

**club_admin**:
The person who runs the club in the app: manages Teams, Memberships and Roles, and the club's settings. Tenant-wide in everything — sees every Team's sessions and may track for any Team without being on its Roster.
_Avoid_: owner, manager.

**coach**:
A trainer who runs practices for the Team(s) they are assigned to. Tracks sessions (creates, tracks and syncs them) and reads/exports sessions — but only for their own Roster(s). Has no club-management rights.
_Avoid_: trainer (use in UI copy only), head coach.

**analyst**:
A read-only, club-wide role: reads and exports the sessions of every Team but never tracks and never manages the club. The dedicated data/video analyst who evaluates but does not run on-ice tracking.
_Avoid_: viewer, observer.

### Actions & counters

**Action**:
Any single thing a coach can log against a drill. Every Action is one of two kinds — a **Timer Action** or a **Counter** — so "Action" is the umbrella term, not a third category alongside them.
_Avoid_: using "Action" to mean only the timed kind.

**Timer Action**:
An Action measured as *elapsed time* (e.g. Explanation, Demonstration, `with Puck`, `without Puck`). It accumulates duration while running.

**Counter**:
An Action measured as a *number of occurrences* (e.g. Repetition, Shot, Pass, Feedback to a player). Each trigger records one event; there is no duration.
_Avoid_: Tally, hit count.

### Support / meta

**App Feedback**:
A coach's report *about the application itself* — a bug, a feature request, or a general comment — submitted from the App Feedback page. Realised as a prefilled GitHub issue in the project repo (`jKelio/pet`), opened in the coach's browser and submitted under their own GitHub identity; it is **not** stored in PET's own data. The issue body carries the coach's display name only (the repo is public), never their email.
_Avoid_: using bare "Feedback" in code for this — it collides with the on-ice **Feedback** Counter ("Feedback to a player"), a drill [[Action]]. Use `appFeedback` in code/routes/i18n.
