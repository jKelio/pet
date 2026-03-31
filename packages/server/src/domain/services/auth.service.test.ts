import { describe, test, expect } from 'bun:test';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  const service = new AuthService();

  describe('generateMagicLinkToken', () => {
    test('returns a raw token, its SHA-256 hash, and an expiry date', () => {
      const token = service.generateMagicLinkToken();

      expect(token.raw).toBeTruthy();
      expect(token.hash).toBeTruthy();
      expect(token.hash).toHaveLength(64); // SHA-256 hex
      expect(token.expiresAt).toBeInstanceOf(Date);
      expect(token.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    test('each call produces a unique raw token', () => {
      const a = service.generateMagicLinkToken();
      const b = service.generateMagicLinkToken();
      expect(a.raw).not.toBe(b.raw);
      expect(a.hash).not.toBe(b.hash);
    });

    test('hash of raw token matches stored hash', () => {
      const token = service.generateMagicLinkToken();
      expect(service.hashToken(token.raw)).toBe(token.hash);
    });
  });

  describe('hashToken', () => {
    test('is deterministic for the same input', () => {
      const h1 = service.hashToken('abc');
      const h2 = service.hashToken('abc');
      expect(h1).toBe(h2);
    });

    test('differs for different inputs', () => {
      expect(service.hashToken('abc')).not.toBe(service.hashToken('xyz'));
    });
  });

  describe('isTokenExpired', () => {
    test('returns true for a past date', () => {
      const past = new Date(Date.now() - 1000);
      expect(service.isTokenExpired(past)).toBe(true);
    });

    test('returns false for a future date', () => {
      const future = new Date(Date.now() + 60_000);
      expect(service.isTokenExpired(future)).toBe(false);
    });
  });
});
