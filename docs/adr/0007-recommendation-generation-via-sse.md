# ADR 0007 — Recommendation generation delivered via Server-Sent Events (SSE)

**Status:** Accepted

## Context

Generating a Recommendation involves a Gemini API call that can take 20–60 seconds (it fetches multiple URLs, generates structured output). The client needs feedback during this wait. Three options were considered: synchronous HTTP, SSE, and WebSockets.

## Decision

Recommendation generation uses **Server-Sent Events (SSE)**. The client sends a `POST /sessions/:sessionId/recommendation` and the server responds with `Content-Type: text/event-stream`. The stream emits:

- `event: progress` — status updates (`fetching`, `generating`)
- `event: result` — the persisted Recommendation once done
- `event: error` — on failure

The client uses a `fetch`-based SSE reader (not the native `EventSource` API) so it can include the JWT `Authorization` header, which `EventSource` does not support. The 401-refresh path in the existing api-client is not needed for SSE (the stream is one-shot), so auth is handled at stream start.

Reverse-proxy deployments (Render, Helm Nginx ingress) must disable response buffering for SSE to work. The server sets `X-Accel-Buffering: no` to signal this.

## Alternatives considered

**Synchronous:** Simple — one HTTP request, response arrives when done. Risk: proxy timeouts (typically 30–60 s), and the user sees a frozen UI with no progress indicator.

**WebSockets:** Bidirectional, supports streaming tokens live. However, the communication here is strictly server → client (one-way). WebSockets require a separate connection-management layer, a separate auth handshake, and reconnect logic — none of which exist in the current server. Overhead is not justified for a unidirectional, one-shot interaction.

**Background job with polling:** Persist a `pending` record, client polls `GET /recommendations/:id` until `status = ready`. Robust against long waits, but requires new status tracking infrastructure and repeated polling requests.

## Trade-offs

| | SSE | Synchronous | WebSockets |
|---|---|---|---|
| Progress feedback | ✓ | ✗ | ✓ |
| Infra added | Minimal | None | Significant |
| JWT via header | ✓ (fetch-based) | ✓ | Needs custom handshake |
| Proxy buffering risk | Mitigated by header | High | N/A |
| Live token streaming | ✗ (not needed) | ✗ | ✓ |

SSE is the natural fit for a one-directional, event-driven response where the client needs progress feedback without bidirectional communication.
