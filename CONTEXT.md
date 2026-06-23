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

### Results

**Session Results** (DE: Trainingsauswertung):
The on-screen charts, KPI cards, and timelines shown immediately after a Completed Session finishes, or when re-opening a session from the History view. A transient view — it exists only in the context of one specific session and is reached either (a) automatically after finishing live tracking, or (b) via "View results" in the History view. It is not a persistent navigation destination; there is no sidebar link. Direct access to `/sessions` without session data in the store redirects to the History view. Distinct from the [[PDF Report]], which is a generated document artifact.
_Avoid_: Results page, Ergebnisse, Trainingsergebnisse.

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
_Note_: applies only where [[Cloud Sync]] is possible. On the [[free]] [[Plan]] sync is disabled, so sessions are not framed as a draining "pending" backlog — the UI presents them as local-only with an upgrade prompt, not as awaiting sync.

**Cloud Sync**:
The act of transferring a [[Completed Session]] to the backend. A metered [[Entitlement]] ([[Plan Limit]]: **0 on `free`** — disabled entirely — 10/month on `pro`, unlimited on `premium`), counted per distinct session per month. On `free` the sync action is disabled in the UI (with an upgrade prompt) and refused server-side; nothing a free club tracks ever leaves the device.
_Avoid_: upload, backup (use "Cloud Sync" / "sync" as the verb).

**Synced Session**:
A Completed Session that has been transferred to the backend via [[Cloud Sync]]. On a successful sync the local copy is **deleted** (delete-on-sync), so a Synced Session lives only in the cloud and is re-viewed via the History list. After a downgrade to `free`, a club's Synced Sessions are not deleted but become [[Locked]] until re-upgrade.
_Avoid_: uploaded session.

**Local-Only Session**:
**Retired for new tracking.** Historically, a Completed Session the coach explicitly marked as **not for the cloud** — typically a foreign/scouting team from another club with no registered Team to sync to — via a checkbox at tracking time. That checkbox was **removed** when the foreign-team scenario moved entirely to the [[premium]] [[External Team]] (admin-curated, syncable): below premium a foreign team is no longer trackable at all, so no new not-for-cloud sessions are created. Existing Local-Only Sessions persist in the local outbox under a "Local only" section, still re-viewable and exportable as a [[PDF Report]]; they are never auto-synced. Distinct from [[Pending Sync (Outbox)]], which *is* awaiting sync.
_Note_: a [[PDF Report]] for a Local-Only Session is produced by posting its data to the server render endpoint (it never needs to sync), metered like any other Report. AI [[Recommendation]]s remain unavailable for Local-Only Sessions (they are synced-only). On the [[free]] [[Plan]] all sessions stay on-device because [[Cloud Sync]] is disabled — that is a Plan effect, not a per-session mark.
_Avoid_: draft, offline session.

### Multi-tenant admin

**Tenant**:
A club — the top-level organisational unit. One club owns one or more Teams and has a set of Members.
_Avoid_: Organisation, account, club (use Tenant in code; "club" is fine in UI copy).

**Team**:
A group **the Tenant fields** (e.g. "U16", "Herren 1") — its own players, with a [[Roster]]. A Tenant has one or more Teams. A Member can be assigned to multiple Teams. Contrast with an [[External Team]], which the Tenant tracks but does not field.
_Avoid_: Group, squad.
_Note_: A practice session carries a free-text **team name** (a display label, possibly typed ad hoc). It is bound to an actual registered Team only when that name matches one; that binding is what decides which Team the session syncs into. An unmatched name leaves the session's Team ambiguous.

**External Team**:
A team a Tenant **tracks but does not field** — e.g. a federation tracking a training of one of its member clubs. Its players take the ice for another club; the tracking Tenant only observes. Registered under the *tracking* Tenant (the federation), so the results are stored in **its own** Tenant, never in the tracked club's Tenant. Stored as a [[Team]] with `kind='external'`, carrying the **name of the club it belongs to** (the tracked member club) — distinct from the tracking Tenant's own club name, and set once at registration rather than retyped per session. **Created and maintained by the [[club_admin]] in the admin area** (a [[premium]]-only curated catalogue); a [[coach]] **selects** a curated External Team during Tracking Setup, picking by external club then team — no free-text, no on-the-fly creation. Unlike own Teams, a [[Roster]] is optional: **all** coaches in the Tenant may select, track and view *every* External Team session without roster assignment (open roster). Sessions bound to an External Team sync to the cloud like own-team sessions (still a [[premium]]-only [[Entitlement]]). Below premium the feature is unavailable and the "track an external team" option is **hidden** (not merely disabled).
_Avoid_: foreign team, opponent, non-tenant team, scouted team (use "External Team" in code; "foreign team" is fine in UI copy).

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

### Drills & tags

**Drill**:
The structural unit a practice session is divided into. Actions are logged against the currently active Drill; a session is an ordered list of Drills (declared upfront in a [[Planned Session]], or added one by one in an [[Open Session]]).
_Avoid_: Exercise, segment.

**Drill Tag**:
An optional classification label applied to a Drill from a fixed vocabulary (`station`, `drill`, `technique`, `tactic`, `smallareagame`, `skating`, `passing`, `shot`, `puckhandling`, `battlechecking`). A Drill carries zero or more. Tags *classify* a Drill — they are not logged [[Action]]s and produce no timing or counts.
_Avoid_: Category, type, drill kind.

**Technique Time (stationary)** (DE: Technikzeit (stationär)):
A [[Timer Action]] and session-level metric for station drills where the tracked player stays at a fixed position and practises a technical skill without moving — e.g. partner passing (players stand and exchange the puck). The stationary counterpart to [[Time Moving]]: both count as active training time and are the opposite of [[Waste Time]]. Belongs to a different drill type than `with Puck` / `without Puck`; the two are not used together by convention. In a [[Planned Session]] the separation is enforced by the coach's action selection at setup time; in an [[Open Session]] all actions are always available. Pass and Shot counters can still be logged while this timer runs. Stops when any coach-led [[Timer Action]] (Explanation, Demonstration, Feedback (Team)) starts.
_Avoid_: Stationary Active, Stationszeit.

**Waste Time** (DE: Verschwendete Zeit):
Time elapsed while no [[Timer Action]] is running — whether within an active Drill or in the gap between Drills (before the first, between Drills, after the last). Stored per-Drill under the `wasteTime` key and at session level under `gapTimeData` (a legacy column name; both represent the same concept at different scopes).
_Avoid_: Gap Time, Pausenzeit (use "Verschwendete Zeit" / "Waste Time" everywhere — the within-drill vs. between-drill distinction is an implementation detail, not a domain concept).

**Passive Time** (DE: Passivzeit):
Total time during which the tracked player is physically inactive within a practice session: the sum of [[Waste Time]] across all Drills and between-Drill gaps, plus intentional coach-led [[Timer Action]]s (Explanation, Demonstration, Feedback (Team)). [[Waste Time]] is unintentional; coach-led phases are intentional — both contribute to physical inactivity.
_Avoid_: inactive time, idle time (too narrow — does not capture coach-led phases).

### Actions & counters

**Action**:
Any single thing a coach can log against a drill. Every Action is one of two kinds — a **Timer Action** or a **Counter** — so "Action" is the umbrella term, not a third category alongside them.
_Avoid_: using "Action" to mean only the timed kind.

**Timer Action**:
An Action measured as *elapsed time* (e.g. Explanation, Demonstration, `with Puck`, `without Puck`). It accumulates duration while running.

**Counter**:
An Action measured as a *number of occurrences* (e.g. Repetition, Shot, Pass, Feedback to a player). Each trigger records one event; there is no duration.
_Avoid_: Tally, hit count.

### AI recommendations

**Library Entry**:
A single curated knowledge item — `{ title, content, sport }` — written and maintained by Pracmetrics. `content` is editorial **text** (e.g. a digest of a training framework like the DEB RTK), not an external URL. It is grounding context for AI analysis. Lives in the [[Knowledge Library]].
_Avoid_: source, link, document (these are overloaded; the old URL-based "Source" no longer exists — see [[Knowledge Library]]).

**Knowledge Library**:
The single, global, Pracmetrics-curated set of [[Library Entry]]s, organised by **sport** (currently ice hockey only). One shared library per sport grounds **every** [[Recommendation]] uniformly across all Tenants. Managed only by super-admins (Pracmetrics staff); Tenants neither edit nor see it, and there is no per-analysis selection — the whole sport-relevant library is always used. Replaces the former per-tenant, URL-based "Source Library" (see [ADR 0011](docs/adr/0011-curated-knowledge-library.md)).
_Avoid_: source library, source repository, link library.

**Recommendation**:
A structured AI-generated document analysing a [[Synced Session]] against the [[Knowledge Library]]. Belongs to the `sessions:read` domain — generating a Recommendation is an act of evaluation, not on-ice tracking. **One-shot**: exactly one Recommendation per Session, generated once and thereafter read-only — it cannot be regenerated (the generate endpoint refuses with `409` once one exists).
_Note_: *generating* a Recommendation is a boolean gated action requiring a [[pro]] or [[premium]] [[Plan]] (in addition to the synced-session and Role checks); it has no monthly quota beyond the existing rate limit. Reading an already-generated Recommendation is not gated.
_Avoid_: analysis, report, AI summary (use `recommendation` in code) — note "report" specifically denotes the [[PDF Report]], a different artifact.

### Plans & entitlements

**Plan**:
The subscription tier of a [[Tenant]]. One of `free`, `pro`, `premium`. Tenant-wide — every [[Membership]] in the club inherits it; it is not per-Member or per-[[Team]]. A Plan is a bundle of [[Plan Limit]]s (the quota matrix) plus boolean feature access. Source of truth is a field on the Tenant; a payment provider may set it later, but enforcement does not depend on one.
_Avoid_: subscription (reserved for the eventual billing object), package, level.

**free**:
The trial [[Plan]]. A **single, fully-local** club: 1 [[Membership]] (who is the [[club_admin]]), 1 [[Team]], **no [[Cloud Sync]] at all**, 2 [[PDF Report]]s per month, no AI [[Recommendation]]. Tracking and on-screen results are unlimited. Because nothing syncs, a free club's sessions live only in the device's IndexedDB — the only server-side footprint is the account (Tenant + the one Membership), kept for login, the plan flag, and the upgrade path.
_Avoid_: trial, starter, lite.

**pro**:
The standard paid [[Plan]] — aimed at ordinary small clubs. Up to 5 [[Membership]]s, up to 10 [[Team]]s, **10 synced sessions per month** ([[Cloud Sync]]), unlimited [[PDF Report]]s, AI [[Recommendation]] generation.
_Avoid_: standard, basic, paid tier.

**premium**:
The top [[Plan]] — aimed at large clubs and national/regional federations (National-/Landesverbände). **Unlimited** [[Membership]]s, [[Team]]s, [[Cloud Sync]], and [[PDF Report]]s, plus AI [[Recommendation]] generation. ∞ on every metered dimension, so no bespoke per-tenant deals are needed.
_Avoid_: enterprise, unlimited (use `premium` in code and UI copy).

**Plan Limit**:
A numeric cap a [[Plan]] places on one dimension. Two kinds: a **capacity limit** (an absolute ceiling on a current count — [[Membership]]s/seats, [[Team]]s) and a **consumption limit** (a per-calendar-month allowance that resets — [[Cloud Sync]]s, [[PDF Report]]s). All limits live in one fixed `PLAN_LIMITS` matrix in `@pet/shared` (no per-tenant overrides); `∞` means uncapped. Consumption is pooled **tenant-wide** and metered **per distinct session** (re-syncing or re-exporting the same session in the same month is free).
_Avoid_: quota (informal use only), cap, allowance.

**Entitlement**:
The right, derived from a club's [[Plan]], to perform a gated action — either boolean (`ai:generate`) or quota-bounded ([[Cloud Sync]], [[PDF Report]]). Enforced **server-side** (the UI is never the wall); a denied action yields `403 UPGRADE_REQUIRED` (plan too low) or `429`/`403 QUOTA_EXCEEDED` (monthly allowance spent). The resolved Plan, limits, and current usage are surfaced to the client via the profile so the app can show counters and prompt an upgrade rather than fail blindly.
_Avoid_: permission (reserved for [[Role]]-based access), licence, feature flag.
_Note_: distinct from [[Role]]. Role answers "what may this person do in the club"; Entitlement answers "what has the club paid for, and how much is left this month". Both must pass — e.g. an [[analyst]] in a `free` club may *read* a [[Recommendation]] but neither role nor plan lets them generate one.

**Locked**:
The state of data that a club retains but cannot currently access because a [[Plan]] downgrade put it over a [[Plan Limit]] — over-cap [[Team]]s/[[Membership]]s, and **all** cloud sessions once on `free`. Downgrades are **non-destructive**: Locked data is hidden behind an "upgrade to restore" prompt and fully restored on re-upgrade; nothing is ever deleted. New creation over a cap is blocked, but existing rows are never removed.
_Avoid_: suspended, archived, disabled.

**PDF Report**:
The PDF document of a session's results, generated **server-side** from session data and returned to the coach. A metered [[Entitlement]] ([[Plan Limit]]: 2/month on `free`, unlimited on `pro`/`premium`), counted per distinct session per month. Rendered statelessly from posted session data (nothing is stored), so it works for any session — including a [[Local-Only Session]] or any free-tier local session — without needing a sync. Distinct from the always-free **on-screen results** (the charts/tables view), which is not a Report.
_Avoid_: export, printout, PDF export (use "PDF Report" / "Report" for the artifact; "export" is the verb only).

### Support / meta

**App Feedback**:
A coach's report *about the application itself* — a bug, a feature request, or a general comment — submitted from the App Feedback page. Realised as a prefilled GitHub issue in the project repo (`jKelio/pet`), opened in the coach's browser and submitted under their own GitHub identity; it is **not** stored in PET's own data. The issue body carries the coach's display name only (the repo is public), never their email.
_Avoid_: using bare "Feedback" in code for this — it collides with the on-ice **Feedback** Counter ("Feedback to a player"), a drill [[Action]]. Use `appFeedback` in code/routes/i18n.
