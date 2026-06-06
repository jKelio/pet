/**
 * Builds a prefilled GitHub "new issue" URL for App Feedback.
 *
 * The form opens this URL in a new tab; the coach submits the issue under their own
 * GitHub identity. No backend, no stored token. The repo (`jKelio/pet`) is **public**,
 * so the body deliberately carries the coach's display name only — never their email.
 */

export type FeedbackType = 'bug' | 'feature' | 'general';

const REPO = 'jKelio/pet';

/** Maps a feedback type to its issue title prefix and GitHub label. */
const TYPE_META: Record<FeedbackType, { prefix: string; label: string }> = {
  bug: { prefix: '[Bug]', label: 'bug' },
  feature: { prefix: '[Feature]', label: 'enhancement' },
  general: { prefix: '[Feedback]', label: 'feedback' },
};

const TITLE_SUMMARY_MAX = 60;

export interface BuildIssueUrlInput {
  type: FeedbackType;
  text: string;
  /** The coach's display name. Goes into the (public) issue body; email never does. */
  name: string;
}

export function buildIssueUrl({ type, text, name }: BuildIssueUrlInput): string {
  const { prefix, label } = TYPE_META[type];
  const trimmed = text.trim();

  const summary =
    trimmed.length > TITLE_SUMMARY_MAX ? `${trimmed.slice(0, TITLE_SUMMARY_MAX)}…` : trimmed;
  const title = `${prefix} ${summary}`;
  const body = `**From:** ${name}\n\n${trimmed}`;

  const params = new URLSearchParams({ title, body, labels: label });
  return `https://github.com/${REPO}/issues/new?${params.toString()}`;
}
