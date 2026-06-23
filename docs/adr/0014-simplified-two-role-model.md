# Simplified two-role model: admin and member

The original three-role model (`club_admin`, `coach`, `analyst`) was built around modelling the club's organisational graph: coaches were scoped to their assigned teams (Roster), analysts were read-only observers, and admins managed everything. As the product focus sharpened to tracking and measuring training efficiency — not storing club org structure — that granularity became overhead with no product value.

We collapsed to two roles: `admin` (manages Teams and Memberships; can do everything a member can) and `member` (tracks sessions and views results for all teams, no assignment required). The Roster concept — assigning members to specific teams for access-control purposes — is retired entirely: any member may track and view any team. Not every member is a trainer or coach, so role-based UI labels are avoided in favour of the person's name or a neutral term.

## Considered options

**Keep `analyst` as a third role.** Rejected: the app's value is in the tracking and results, not in partitioning who may read them. A club that needs a view-only seat can invite that person as a `member` — the marginal risk of them accidentally starting a tracking session is not worth the complexity of a third role.

**Keep Roster for display/organisational purposes (without access-control enforcement).** Rejected: the app's purpose is training efficiency, not modelling the club's org chart. Maintaining assignment data with no enforcement consequence is dead weight.
