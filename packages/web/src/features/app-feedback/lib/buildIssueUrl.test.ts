import { describe, test, expect } from 'bun:test';
import { buildIssueUrl } from './buildIssueUrl.js';

function parse(url: string) {
  const u = new URL(url);
  return {
    base: `${u.origin}${u.pathname}`,
    title: u.searchParams.get('title') ?? '',
    body: u.searchParams.get('body') ?? '',
    labels: u.searchParams.get('labels') ?? '',
  };
}

describe('buildIssueUrl', () => {
  test('targets the jKelio/pet new-issue endpoint', () => {
    const { base } = parse(buildIssueUrl({ type: 'general', text: 'hi', name: 'Coach' }));
    expect(base).toBe('https://github.com/jKelio/pet/issues/new');
  });

  test('maps each type to its title prefix and label', () => {
    expect(parse(buildIssueUrl({ type: 'bug', text: 'x', name: 'C' })).labels).toBe('bug');
    expect(parse(buildIssueUrl({ type: 'bug', text: 'x', name: 'C' })).title).toStartWith('[Bug]');

    expect(parse(buildIssueUrl({ type: 'feature', text: 'x', name: 'C' })).labels).toBe('enhancement');
    expect(parse(buildIssueUrl({ type: 'feature', text: 'x', name: 'C' })).title).toStartWith('[Feature]');

    expect(parse(buildIssueUrl({ type: 'general', text: 'x', name: 'C' })).labels).toBe('feedback');
    expect(parse(buildIssueUrl({ type: 'general', text: 'x', name: 'C' })).title).toStartWith('[Feedback]');
  });

  test('body includes the display name and the feedback text', () => {
    const { body } = parse(
      buildIssueUrl({ type: 'general', text: 'The timer drifts', name: 'Max Mustermann' }),
    );
    expect(body).toContain('**From:** Max Mustermann');
    expect(body).toContain('The timer drifts');
  });

  test('never leaks an email — only the supplied name reaches the body', () => {
    const { title, body } = parse(
      buildIssueUrl({ type: 'bug', text: 'no contact details here', name: 'Coach' }),
    );
    expect(`${title}${body}`).not.toContain('@');
  });

  test('truncates a long title summary but keeps the full body', () => {
    const long = 'a'.repeat(100);
    const { title, body } = parse(buildIssueUrl({ type: 'general', text: long, name: 'C' }));
    expect(title).toBe(`[Feedback] ${'a'.repeat(60)}…`);
    expect(body).toContain(long);
  });
});
