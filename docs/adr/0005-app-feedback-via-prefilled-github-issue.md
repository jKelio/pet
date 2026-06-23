# App Feedback via a prefilled public GitHub issue

**Status: superseded by [ADR 0015](0015-app-feedback-via-server-side-github-api.md)**

## Decision

The App Feedback feature (a coach reporting a bug, requesting a feature, or leaving a general
comment) is realised **entirely client-side**: on submit the web app builds a prefilled
GitHub *new issue* URL for the public `jKelio/pet` repo and opens it in a new tab via
`window.open`. The coach reviews and submits the issue under their **own GitHub account**.
There is no server route, no stored credential, and nothing about the feedback is persisted in
PET's own database. The issue body carries the coach's **display name only** — never their
email — because the repo is public.

The `type` field (Bug / Feature / General) only shapes the issue: it sets a title prefix
(`[Bug]` / `[Feature]` / `[Feedback]`) and a label (`bug` / `enhancement` / `feedback`). `bug`
and `enhancement` are GitHub default labels; `feedback` is one project-defined label, and
GitHub silently ignores an unknown `?labels=` value, so the form works even before it exists.

The single piece of logic — URL construction — lives in a pure, unit-tested helper
(`features/app-feedback/lib/buildIssueUrl.ts`).

## Context

The legacy `master` app had a feedback page that opened a prefilled GitHub issue for "feature"
feedback and a `mailto:` link for "general" feedback. We wanted the capability in the greenfield
app but consolidated to a single destination (GitHub) so all feedback lands in the tracked
backlog rather than a personal inbox.

## Why client-side prefilled URL, not a server-side GitHub API call

A server-side `POST /issues` would let us capture feedback from coaches without GitHub accounts
and store nothing on GitHub at submission time. We rejected it:

- It requires a **stored GitHub token** (PAT / app installation) to rotate and protect, plus a
  new route in the server's Clean Architecture — real operational weight for a low-frequency
  feature.
- A server bot would attribute every issue to the bot, losing per-coach attribution; the
  prefilled URL attributes each issue to the submitting coach's GitHub identity for free.
- A public, unauthenticated "create issue" path is an **abuse surface**; requiring the human to
  submit on GitHub removes it entirely.

The cost is that a coach without a GitHub account cannot submit, and we store nothing of our own.
For an internal coaching tool that is acceptable, and an email fallback can be added later if real
users need it.

## Why name-only in the body

`jKelio/pet` is a **public** repository, so anything in the prefilled body is permanently and
publicly indexable. Including the coach's email would be a non-consensual disclosure; the name is
enough for the maintainer to map the report to a coach, and replies happen on the GitHub thread
(which notifies the submitter's GitHub account) rather than by email. The "no email in body"
contract is pinned by a unit test.

## Consequences

- The feature is **web-only** (`packages/web`); the server and its layers are untouched.
- Submission depends on the repo staying public and the coach being willing to use GitHub.
- Making `jKelio/pet` private later would change the privacy calculus (the public-body concern
  disappears) but break submission for coaches who are not repo collaborators — revisit this ADR
  if the repo's visibility changes.
- The one-time `gh label create feedback --repo jKelio/pet` is optional; until it exists,
  General feedback issues are created unlabelled.
