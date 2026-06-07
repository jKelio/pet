# ADR 0006 — Recommendations stored server-side, bound to Synced Sessions

**Status:** Accepted

## Context

The AI training recommendation feature generates a structured document from a completed practice session and one or more user-provided Source URLs via the Gemini API. We had to decide whether to store the generated Recommendation or treat it as ephemeral (generated on demand, never persisted).

## Decision

Recommendations are **stored server-side** (table `session_recommendations`, FK on `practice_sessions`, tenant-scoped) and are therefore bound to **Synced Sessions**. Key consequences:

- A session must be synchronised to the cloud before it can be analysed. Local-Only sessions and Pending (not-yet-synced) sessions cannot be analysed.
- The Source URLs used during generation are **snapshotted** alongside the document. If a Source is later deleted or updated, the historical basis of the recommendation remains auditable.
- Only one active Recommendation per Session exists. Re-generating overwrites the previous record (upsert on `sessionId` unique index) after user confirmation.

## Alternatives considered

**Ephemeral (on-demand):** The recommendation endpoint would be stateless — post session data + source URLs, receive the document, nothing saved. This would work for Local-Only/Pending sessions and would not require a schema change. However, every view of the recommendation would require a new (costly) Gemini call, there is no history, and source attribution cannot be audited.

## Trade-offs

| | Stored | Ephemeral |
|---|---|---|
| Works for Local-Only sessions | ✗ | ✓ |
| One-time cost per analysis | ✓ | ✗ |
| Source snapshot & audit trail | ✓ | ✗ |
| Schema complexity | Higher | None |
| Re-view without re-generating | ✓ | ✗ |

The tradeoff of excluding Local-Only sessions is accepted as reasonable: Local-Only sessions are specifically scouting/foreign-team sessions that coaches explicitly mark as not-for-the-cloud. Requiring a cloud session for AI analysis is consistent with the existing Synced Session model.
