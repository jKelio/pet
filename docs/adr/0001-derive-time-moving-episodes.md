# Time-Moving episodes are derived, not stored

`Time Moving` is split into two ordinary timers, `with Puck` and `without Puck`, each persisted as a `TimerData` entry (`totalTime` + `timeSegments`) in `drill.timerData`. A *Time-Moving episode* — one continuous movement bout, which may occur several times per drill and consists of adjacent `with Puck` / `without Puck` intervals — is **computed on demand** from the segment timestamps: contiguous intervals form one episode, a gap (the player stopped moving) separates two episodes. We do **not** persist an explicit nested episode structure.

*Why:* a single source of truth (the timestamps), consistency with the existing flat `timerData` shape, and child totals can never drift from their episode total. The existing results timeline (`ganttUtils.extractTimelineSegments` → `ActionTimeline`) already renders every interval at its real time position, so multiple episodes are visible without any schema change.

*Rejected:* storing episodes explicitly (e.g. `timeMovingEpisodes: { withPuck: TimeSegment[]; withoutPuck: TimeSegment[] }[]`) — more schema, double bookkeeping, and migration cost for no display benefit.
