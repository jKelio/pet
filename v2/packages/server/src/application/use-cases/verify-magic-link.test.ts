import { describe, test, expect, mock, beforeEach } from 'bun:test';
import {
  VerifyMagicLinkUseCase,
  InvalidTokenError,
  ExpiredTokenError,
} from './verify-magic-link.js';
import { AuthService } from '../../domain/services/auth.service.js';
import type { UserRepository } from '../../domain/ports/user.repository.js';
import type { User } from '@pet/shared';

function makeUserWithExpiry(overrides?: Partial<{ tokenExpiresAt: Date }>) {
  return {
    id: 'user-1',
    email: 'coach@example.com',
    name: 'Coach',
    createdAt: new Date().toISOString(),
    tokenExpiresAt: overrides?.tokenExpiresAt ?? new Date(Date.now() + 60_000),
  };
}

function makeRepo(userWithExpiry: ReturnType<typeof makeUserWithExpiry> | null): UserRepository {
  return {
    findByEmail: mock(async () => null),
    save: mock(async () => {}),
    findById: mock(async () => null),
    saveMagicLinkToken: mock(async () => {}),
    clearMagicLinkToken: mock(async () => {}),
    updateLastLogin: mock(async () => {}),
    findByMagicLinkToken: mock(async () => userWithExpiry),
    findByRefreshToken: mock(async () => null),
    saveRefreshToken: mock(async () => {}),
    clearRefreshToken: mock(async () => {}),
  } as unknown as UserRepository;
}

const tokenIssuer = {
  issueAccessToken: mock(async (_user: User) => 'access-token'),
  issueRefreshToken: mock(async (_userId: string) => 'refresh-token'),
};

describe('VerifyMagicLinkUseCase', () => {
  const authService = new AuthService();

  beforeEach(() => {
    tokenIssuer.issueAccessToken.mockReset();
    tokenIssuer.issueRefreshToken.mockReset();
    tokenIssuer.issueAccessToken.mockImplementation(async () => 'access-token');
    tokenIssuer.issueRefreshToken.mockImplementation(async () => 'refresh-token');
  });

  test('returns tokens and user for a valid, unexpired token', async () => {
    const userWithExpiry = makeUserWithExpiry();
    const repo = makeRepo(userWithExpiry);
    const useCase = new VerifyMagicLinkUseCase({ userRepository: repo, authService, tokenIssuer });

    const result = await useCase.execute('any-raw-token');

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(result.user.id).toBe('user-1');
    expect((result.user as Record<string, unknown>).tokenExpiresAt).toBeUndefined();
  });

  test('clears the token and records last login on success', async () => {
    const userWithExpiry = makeUserWithExpiry();
    const repo = makeRepo(userWithExpiry);
    const useCase = new VerifyMagicLinkUseCase({ userRepository: repo, authService, tokenIssuer });

    await useCase.execute('any-raw-token');

    expect(repo.clearMagicLinkToken).toHaveBeenCalledWith('user-1');
    expect(repo.updateLastLogin).toHaveBeenCalledWith('user-1');
  });

  test('throws InvalidTokenError when token is not found', async () => {
    const repo = makeRepo(null);
    const useCase = new VerifyMagicLinkUseCase({ userRepository: repo, authService, tokenIssuer });

    expect(useCase.execute('bad-token')).rejects.toBeInstanceOf(InvalidTokenError);
  });

  test('throws ExpiredTokenError when token is past its expiry', async () => {
    const userWithExpiry = makeUserWithExpiry({ tokenExpiresAt: new Date(Date.now() - 1000) });
    const repo = makeRepo(userWithExpiry);
    const useCase = new VerifyMagicLinkUseCase({ userRepository: repo, authService, tokenIssuer });

    expect(useCase.execute('expired-token')).rejects.toBeInstanceOf(ExpiredTokenError);
  });
});
