import { describe, test, expect } from 'bun:test';
import { formatRelativeTime } from './ganttUtils.js';

describe('formatRelativeTime', () => {
  test('formats zero as 0:00', () => {
    expect(formatRelativeTime(0)).toBe('0:00');
  });

  test('formats 30 seconds', () => {
    expect(formatRelativeTime(30_000)).toBe('0:30');
  });

  test('formats 1 minute exactly', () => {
    expect(formatRelativeTime(60_000)).toBe('1:00');
  });

  test('formats 90 seconds as 1:30', () => {
    expect(formatRelativeTime(90_000)).toBe('1:30');
  });

  test('formats 10 minutes', () => {
    expect(formatRelativeTime(600_000)).toBe('10:00');
  });

  test('pads seconds below 10 with a leading zero', () => {
    expect(formatRelativeTime(65_000)).toBe('1:05');
  });

  test('truncates sub-second values', () => {
    expect(formatRelativeTime(1_500)).toBe('0:01');
  });
});
