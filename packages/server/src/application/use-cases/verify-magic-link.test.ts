import { describe, test, expect, mock, beforeEach } from 'bun:test';
import {
  VerifyMagicLinkUseCase,
  InvalidTokenError,
  ExpiredTokenError,
} from './verify-magic-link.js';
import { AuthService } from '../../domain/services/auth.service.js';
import type { UserRepository, MembershipRepository } from '../../domain/ports/user.repository.js';
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
    updateLastLogin: mock(async () => {}),
    consumeMagicLinkToken: mock(async () => userWithExpiry),
  } as unknown as UserRepository;
}

function makeMembershipRepo(): MembershipRepository {
  return {
    findById: mock(async () => null),
    findByUser: mock(async () => []),
    findByUserAndTenant: mock(async () => null),
    findByTenant: mock(async () => []),
    save: mock(async () => {}),
    delete: mock(async () => {}),
    assignTeam: mock(async () => {}),
    getTeamIds: mock(async () => []),
  } as unknown as MembershipRepository;
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
    const useCase = new VerifyMagicLinkUseCase({ userRepository: repo, membershipRepository: makeMembershipRepo(), authService, tokenIssuer });

    const result = await useCase.execute('any-raw-token');

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(result.user.id).toBe('user-1');
    expect((result.user as unknown as Record<string, unknown>).tokenExpiresAt).toBeUndefined();
  });

  test('consumes the token and records last login on success', async () => {
    const userWithExpiry = makeUserWithExpiry();
    const repo = makeRepo(userWithExpiry);
    const useCase = new VerifyMagicLinkUseCase({ userRepository: repo, membershipRepository: makeMembershipRepo(), authService, tokenIssuer });

    await useCase.execute('any-raw-token');

    expect(repo.consumeMagicLinkToken).toHaveBeenCalledTimes(1);
    expect(repo.updateLastLogin).toHaveBeenCalledWith('user-1');
  });

  test('rejects a second use of the same token (single-use)', async () => {
    const userWithExpiry = makeUserWithExpiry();
    const repo = makeRepo(userWithExpiry);
    // First call consumes the token, second call finds nothing to consume
    (repo.consumeMagicLinkToken as ReturnType<typeof mock>)
      .mockImplementationOnce(async () => userWithExpiry)
      .mockImplementation(async () => null);
    const useCase = new VerifyMagicLinkUseCase({ userRepository: repo, membershipRepository: makeMembershipRepo(), authService, tokenIssuer });

    await useCase.execute('any-raw-token');

    expect(useCase.execute('any-raw-token')).rejects.toBeInstanceOf(InvalidTokenError);
  });

  test('throws InvalidTokenError when token is not found', async () => {
    const repo = makeRepo(null);
    const useCase = new VerifyMagicLinkUseCase({ userRepository: repo, membershipRepository: makeMembershipRepo(), authService, tokenIssuer });

    expect(useCase.execute('bad-token')).rejects.toBeInstanceOf(InvalidTokenError);
  });

  test('throws ExpiredTokenError when token is past its expiry', async () => {
    const userWithExpiry = makeUserWithExpiry({ tokenExpiresAt: new Date(Date.now() - 1000) });
    const repo = makeRepo(userWithExpiry);
    const useCase = new VerifyMagicLinkUseCase({ userRepository: repo, membershipRepository: makeMembershipRepo(), authService, tokenIssuer });

    expect(useCase.execute('expired-token')).rejects.toBeInstanceOf(ExpiredTokenError);
  });
});
