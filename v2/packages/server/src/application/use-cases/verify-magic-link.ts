import type { UserRepository } from '../../domain/ports/user.repository.js';
import { AuthService } from '../../domain/services/auth.service.js';
import type { User } from '@pet/shared';

export interface TokenIssuer {
  issueAccessToken(user: User, tenantId?: string): Promise<string>;
  issueRefreshToken(userId: string): Promise<string>;
}

export interface VerifyMagicLinkDeps {
  userRepository: UserRepository;
  authService: AuthService;
  tokenIssuer: TokenIssuer;
}

export interface VerifyMagicLinkResult {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export class VerifyMagicLinkUseCase {
  constructor(private readonly deps: VerifyMagicLinkDeps) {}

  async execute(rawToken: string): Promise<VerifyMagicLinkResult> {
    const tokenHash = this.deps.authService.hashToken(rawToken);
    const userWithExpiry = await this.deps.userRepository.findByMagicLinkToken(tokenHash);

    if (!userWithExpiry) {
      throw new InvalidTokenError();
    }

    if (this.deps.authService.isTokenExpired(userWithExpiry.tokenExpiresAt)) {
      throw new ExpiredTokenError();
    }

    await this.deps.userRepository.clearMagicLinkToken(userWithExpiry.id);
    await this.deps.userRepository.updateLastLogin(userWithExpiry.id);

    const { tokenExpiresAt: _, ...user } = userWithExpiry;

    const [accessToken, refreshToken] = await Promise.all([
      this.deps.tokenIssuer.issueAccessToken(user),
      this.deps.tokenIssuer.issueRefreshToken(user.id),
    ]);

    return { accessToken, refreshToken, user };
  }
}

export class InvalidTokenError extends Error {
  readonly statusCode = 401;
  constructor() {
    super('Invalid or expired magic link token');
    this.name = 'InvalidTokenError';
  }
}

export class ExpiredTokenError extends Error {
  readonly statusCode = 401;
  constructor() {
    super('Magic link has expired. Please request a new one.');
    this.name = 'ExpiredTokenError';
  }
}
