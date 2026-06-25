import { describe, test, expect } from 'bun:test';
import { EmailSchema, SendMagicLinkSchema, CreateTeamSchema, SyncSessionSchema } from './validation.js';

describe('EmailSchema', () => {
  test('accepts a valid email', () => {
    expect(EmailSchema.parse('Coach@Example.COM')).toBe('coach@example.com');
  });

  test('normalizes to lowercase', () => {
    expect(EmailSchema.parse('UPPER@DOMAIN.COM')).toBe('upper@domain.com');
  });

  test('rejects an invalid email', () => {
    expect(() => EmailSchema.parse('not-an-email')).toThrow();
  });

  test('rejects empty string', () => {
    expect(() => EmailSchema.parse('')).toThrow();
  });
});

describe('SendMagicLinkSchema', () => {
  test('parses a valid payload', () => {
    const result = SendMagicLinkSchema.parse({ email: 'coach@example.com' });
    expect(result.email).toBe('coach@example.com');
  });

  test('rejects missing email', () => {
    expect(() => SendMagicLinkSchema.parse({})).toThrow();
  });
});

describe('CreateTeamSchema', () => {
  test('accepts a valid team name and age class', () => {
    const result = CreateTeamSchema.parse({ name: '  Lions  ', ageClass: 16 });
    expect(result.name).toBe('Lions'); // trimmed
    expect(result.ageClass).toBe(16);
  });

  test('rejects empty name after trimming', () => {
    expect(() => CreateTeamSchema.parse({ name: '   ', ageClass: 16 })).toThrow();
  });

  test('rejects name over 100 characters', () => {
    expect(() => CreateTeamSchema.parse({ name: 'a'.repeat(101), ageClass: 16 })).toThrow();
  });

  test('rejects age class below 7', () => {
    expect(() => CreateTeamSchema.parse({ name: 'Lions', ageClass: 6 })).toThrow();
  });

  test('rejects age class above 21', () => {
    expect(() => CreateTeamSchema.parse({ name: 'Lions', ageClass: 22 })).toThrow();
  });

  test('rejects missing age class', () => {
    expect(() => CreateTeamSchema.parse({ name: 'Lions' })).toThrow();
  });
});

describe('SyncSessionSchema', () => {
  const validSession = {
    id: '00000000-0000-0000-0000-000000000001',
    teamId: '00000000-0000-0000-0000-000000000002',
    practiceInfo: {
      clubName: 'EHC Test',
      teamName: 'U16 A',
      date: '2026-01-01T10:00:00.000Z',
      coachName: 'Coach',
      athletesNumber: 20,
      coachesNumber: 2,
      totalTime: 60,
      trackedPlayerName: '',
      drillsNumber: 1,
      wasteTime: { totalTime: 0, timeSegments: [] },
    },
    drills: [],
  };

  test('accepts a valid sync payload', () => {
    const result = SyncSessionSchema.parse(validSession);
    expect(result.id).toBe(validSession.id);
  });

  test('rejects a non-UUID id', () => {
    expect(() => SyncSessionSchema.parse({ ...validSession, id: 'bad-id' })).toThrow();
  });

});
