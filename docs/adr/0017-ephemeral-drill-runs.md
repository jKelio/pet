# ADR 0017 — Ephemeral Drill Runs

**Status:** Accepted
**Date:** 2026-07-12

## Context

Issue #54 splits tracking into two Trackers: the Training Tracker (the existing full session flow, Planned/Open) and a new Drill Tracker — a zero-setup surface that tracks exactly one drill "wie offen" and shows only the per-drill evaluation (Trainingsauswertung). The question was what lifecycle a Drill Tracker run gets: PET's session machinery (Completed Session → History → Cloud Sync → Recommendation) assumes durable, team-bound sessions, while the Drill Tracker's value is that none of that is asked for upfront.

## Decision

A **Drill Run is ephemeral**: it is never stored as a Completed Session, never appears in History, never syncs, and never gets a Recommendation. Closing its on-screen evaluation discards it permanently. The only durable artifact it can leave is a **PDF Report** (same metered Entitlement, counted per Drill Run; the player name for the report header is asked at export time). While live, the run autosaves as a draft purely for crash recovery — the draft is deleted when the evaluation is closed or the run is discarded. There is deliberately **no conversion path** from a Drill Run into a Session.

## Alternatives Considered

- **Store Drill Runs as local sessions with a flag** (a one-drill Completed Session in the outbox): would give a run history for free, but drags every session invariant into the zero-setup mode — team binding, sync semantics, plan-locked cloud lists — and re-creates the retired "Local-Only Session" special case the app just eliminated.
- **"Continue as Open Session"** (run becomes Drill 1, Practice Info back-filled): blurs the boundary between the two Trackers and produces half-configured sessions; rejected to keep the modes sharp. A coach who wants the whole practice starts the Training Tracker afresh.

## Consequences

- Discarded runs are unrecoverable by design; users wanting durable data must use the Training Tracker.
- If a Drill Run history is ever demanded, it needs its own storage concept — reusing `db.sessions` would silently re-introduce the flagged-session alternative rejected here.
- PDF metering keys on the run's client-generated ID, so re-exporting the same run in the same month stays free, consistent with per-session metering.
