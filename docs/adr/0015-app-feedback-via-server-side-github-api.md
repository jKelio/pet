# App Feedback via server-side GitHub API proxy

Supersedes [ADR 0005](0005-app-feedback-via-prefilled-github-issue.md).

## Decision

App Feedback is now submitted via a new authenticated server route (`POST /api/app-feedback`) that calls the GitHub REST API on behalf of the member. A server-side PAT (`GITHUB_PAT` env var) authenticates all calls. The web client posts the form data (type, text, optional screenshot) as `multipart/form-data`; the server uploads the screenshot to GitHub's asset storage and embeds it as a Markdown image before creating the issue. The route requires a valid JWT session — the member's display name is taken from the token, never from the client payload, and the email is never included (the repo is public). On success the client receives `201` and shows a plain success message; no GitHub issue link is surfaced to the member (most members have no GitHub account).

## Why we moved away from the prefilled URL

ADR 0005 explicitly rejected a server-side approach because it required a stored credential and created a public abuse surface. Two requirements changed the calculus:

- **Members don't have GitHub accounts.** The user base is coaches, not developers; requiring a GH account to submit feedback is a real friction point, not a theoretical one.
- **Screenshot attachment.** There is no client-side way to attach a file to a GitHub issue URL; embedding one requires either the GitHub asset upload API (needs auth) or external storage — both demand a server.

The abuse surface concern from ADR 0005 is mitigated by making the route JWT-authenticated: only active members of a Tenant can submit.

## Consequences

- `GITHUB_PAT` is a new required secret in production and in `.env.example` — rotation is now an ops concern.
- Issues are created under the bot identity (the PAT owner), not per-member attribution. The issue body carries `**From:** <display name>` to preserve human attribution.
- `buildIssueUrl.ts` and its tests are deleted; the URL-building logic moves server-side.
- Screenshot upload uses GitHub's Contents API (`PUT /repos/{owner}/{repo}/contents/{path}`), writing each screenshot directly into the repo under `feedback-screenshots/` as an individual commit. If this call fails, that screenshot silently disappears from the issue — the fallback is to submit without it rather than block the whole form.
- Up to 3 screenshots may be attached per submission (each one its own commit); a member can attach more than one, but the count is capped both client-side and server-side to bound the number of commits a single feedback submission can generate against the public repo.
