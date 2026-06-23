import type { RecommendationRepository } from '../../domain/ports/recommendation.repository.js';
import type { SessionRepository } from '../../domain/ports/session.repository.js';
import type { MembershipRepository } from '../../domain/ports/user.repository.js';
import type { Recommendation } from '@pet/shared';

export interface GetRecommendationDeps {
  recommendationRepository: RecommendationRepository;
  sessionRepository: SessionRepository;
  membershipRepository: MembershipRepository;
}

export interface GetRecommendationContext {
  userId: string;
  tenantId: string;
}

export class RecommendationNotFoundError extends Error {
  readonly statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = 'RecommendationNotFoundError';
  }
}

export class RecommendationForbiddenError extends Error {
  readonly statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = 'RecommendationForbiddenError';
  }
}

export class GetRecommendationUseCase {
  constructor(private readonly deps: GetRecommendationDeps) {}

  async execute(sessionId: string, ctx: GetRecommendationContext): Promise<Recommendation> {
    const membership = await this.deps.membershipRepository.findByUserAndTenant(ctx.userId, ctx.tenantId);
    if (!membership) throw new RecommendationForbiddenError('Not a member of this tenant');

    const session = await this.deps.sessionRepository.findById(sessionId, ctx.tenantId);
    if (!session) throw new RecommendationNotFoundError('Session not found');

    const recommendation = await this.deps.recommendationRepository.findBySession(sessionId, ctx.tenantId);
    if (!recommendation) throw new RecommendationNotFoundError('No recommendation for this session');
    return recommendation;
  }
}
