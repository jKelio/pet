import type { UserRepository, MembershipRepository } from '../../domain/ports/user.repository.js';
import type { TokenIssuer } from './verify-magic-link.js';

export interface SwitchTenantDeps {
  userRepository: UserRepository;
  membershipRepository: MembershipRepository;
  tokenIssuer: TokenIssuer;
}

export class ForbiddenError extends Error {
  readonly statusCode = 403;
  constructor() {
    super('Not a member of this tenant');
    this.name = 'ForbiddenError';
  }
}

export class SwitchTenantUseCase {
  constructor(private readonly deps: SwitchTenantDeps) {}

  async execute(userId: string, targetTenantId: string): Promise<{ accessToken: string }> {
    const membership = await this.deps.membershipRepository.findByUserAndTenant(userId, targetTenantId);
    if (!membership) throw new ForbiddenError();

    const user = await this.deps.userRepository.findById(userId);
    if (!user) throw new ForbiddenError();

    const accessToken = await this.deps.tokenIssuer.issueAccessToken(user, targetTenantId);
    return { accessToken };
  }
}
