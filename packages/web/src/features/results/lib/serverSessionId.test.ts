import { describe, test, expect } from 'bun:test';
import { toServerSessionId } from './serverSessionId.js';

const UUID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

describe('toServerSessionId', () => {
  test('strips the cloud- prefix added by the History browser', () => {
    expect(toServerSessionId(`cloud-${UUID}`)).toBe(UUID);
  });

  test('strips the local- prefix added by the History browser', () => {
    expect(toServerSessionId(`local-${UUID}`)).toBe(UUID);
  });

  test('leaves a bare UUID (the normal post-completion flow) unchanged', () => {
    expect(toServerSessionId(UUID)).toBe(UUID);
  });

  test('only strips the leading prefix, not occurrences elsewhere', () => {
    expect(toServerSessionId(`cloud-cloud-${UUID}`)).toBe(`cloud-${UUID}`);
  });

  test('produces a value that satisfies the server UUID schema', () => {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(UUID_RE.test(toServerSessionId(`cloud-${UUID}`))).toBe(true);
  });
});
