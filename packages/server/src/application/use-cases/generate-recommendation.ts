import type { RecommendationRepository } from '../../domain/ports/recommendation.repository.js';
import type { SessionRepository } from '../../domain/ports/session.repository.js';
import type { SourceRepository } from '../../domain/ports/source.repository.js';
import type { MembershipRepository } from '../../domain/ports/user.repository.js';
import type { AiRecommendationGenerator } from '../../domain/ports/ai-recommendation.generator.js';
import type { Recommendation } from '@pet/shared';
import { hasPermission } from '@pet/shared';
import { RecommendationForbiddenError, RecommendationNotFoundError } from './get-recommendation.js';

export interface GenerateRecommendationDeps {
  recommendationRepository: RecommendationRepository;
  sessionRepository: SessionRepository;
  sourceRepository: SourceRepository;
  membershipRepository: MembershipRepository;
  aiGenerator: AiRecommendationGenerator;
  geminiModel: string;
}

export interface GenerateRecommendationContext {
  userId: string;
  tenantId: string;
  language: string;
}

export class GenerateRecommendationUseCase {
  constructor(private readonly deps: GenerateRecommendationDeps) {}

  async *execute(
    sessionId: string,
    sourceIds: string[],
    ctx: GenerateRecommendationContext,
  ): AsyncIterable<{ status: string; recommendation?: Recommendation }> {
    const membership = await this.deps.membershipRepository.findByUserAndTenant(ctx.userId, ctx.tenantId);
    if (!membership) throw new RecommendationForbiddenError('Not a member of this tenant');

    const session = await this.deps.sessionRepository.findById(sessionId, ctx.tenantId);
    if (!session) throw new RecommendationNotFoundError('Session not found');

    if (!hasPermission(membership.role, 'sessions:view:all')) {
      const teamIds = await this.deps.membershipRepository.getTeamIds(membership.id);
      if (!teamIds.includes(session.teamId)) {
        throw new RecommendationNotFoundError('Session not found');
      }
    }

    const resolvedSources = await this.deps.sourceRepository.findByIds(sourceIds, ctx.tenantId);
    const sourceUrls = resolvedSources.map((s) => s.url);

    for await (const event of this.deps.aiGenerator.generate({ session, sourceUrls, language: ctx.language })) {
      if (event.status === 'done' && event.document) {
        const recommendation = await this.deps.recommendationRepository.upsert({
          sessionId,
          tenantId: ctx.tenantId,
          document: event.document,
          sourceUrls,
          model: this.deps.geminiModel,
          createdBy: ctx.userId,
        });
        yield { status: 'ready', recommendation };
      } else {
        yield { status: event.status };
      }
    }
  }
}
