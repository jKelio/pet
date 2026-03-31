import type { UserRepository } from '../../domain/ports/user.repository.js';
import type { JoseTokenService } from '../../infrastructure/services/jose-token.service.js';

export interface RefreshSessionDeps {
  tokenService: JoseTokenService;
  userRepository: UserRepository;
}

export interface RefreshSessionResult {
  accessToken: string;
  refreshToken: string;
}

export class InvalidRefreshTokenError extends Error {
  readonly statusCode = 401;
  constructor() {
    super('Invalid or expired refresh token');
    this.name = 'InvalidRefreshTokenError';
  }
}

export class RefreshSessionUseCase {
  constructor(private readonly deps: RefreshSessionDeps) {}

  async execute(rawRefreshToken: string): Promise<RefreshSessionResult> {
    let verified;
    try {
      verified = await this.deps.tokenService.verify(rawRefreshToken);
    } catch {
      throw new InvalidRefreshTokenError();
    }

    if (verified.type !== 'refresh') {
      throw new InvalidRefreshTokenError();
    }

    const user = await this.deps.userRepository.findById(verified.userId);
    if (!user) throw new InvalidRefreshTokenError();

    // Issue new token pair — access token has no tenantId; client calls /me to restore context
    const [accessToken, refreshToken] = await Promise.all([
      this.deps.tokenService.issueAccessToken(user),
      this.deps.tokenService.issueRefreshToken(user.id),
    ]);

    return { accessToken, refreshToken };
  }
}
