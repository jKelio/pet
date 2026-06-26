import type { RecommendationRepository } from '../../domain/ports/recommendation.repository.js';
import type { SessionRepository } from '../../domain/ports/session.repository.js';
import type { LibraryRepository } from '../../domain/ports/library.repository.js';
import type { MembershipRepository } from '../../domain/ports/user.repository.js';
import type { AiRecommendationGenerator } from '../../domain/ports/ai-recommendation.generator.js';
import type { Recommendation, Sport, PracticeSession } from '@pet/shared';
import { DEFAULT_SPORT } from '@pet/shared';
import { computeTei } from '../../domain/services/tei.js';
import { RecommendationForbiddenError, RecommendationNotFoundError } from './get-recommendation.js';

/** Thrown when a session already has a recommendation — analysis is one-shot, not re-runnable. */
export class RecommendationConflictError extends Error {
  readonly statusCode = 409;
  constructor(message: string) {
    super(message);
    this.name = 'RecommendationConflictError';
  }
}

export interface GenerateRecommendationDeps {
  recommendationRepository: RecommendationRepository;
  sessionRepository: SessionRepository;
  libraryRepository: LibraryRepository;
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

  /**
   * Validates that the caller may generate a recommendation for this session and that
   * none exists yet. Returns the session for reuse. Call this BEFORE opening the SSE
   * stream so a blocked request gets a real HTTP status instead of an in-stream error.
   */
  async ensureGeneratable(sessionId: string, ctx: GenerateRecommendationContext): Promise<PracticeSession> {
    const membership = await this.deps.membershipRepository.findByUserAndTenant(ctx.userId, ctx.tenantId);
    if (!membership) throw new RecommendationForbiddenError('Not a member of this tenant');

    const session = await this.deps.sessionRepository.findById(sessionId, ctx.tenantId);
    if (!session) throw new RecommendationNotFoundError('Session not found');

    const existing = await this.deps.recommendationRepository.findBySession(sessionId, ctx.tenantId);
    if (existing) throw new RecommendationConflictError('A recommendation already exists for this session');

    return session;
  }

  async *execute(
    sessionId: string,
    ctx: GenerateRecommendationContext,
  ): AsyncIterable<{ status: string; recommendation?: Recommendation }> {
    const session = await this.ensureGeneratable(sessionId, ctx);

    // Every analysis is grounded on the full, Pracmetrics-curated knowledge library
    // for the sport (currently fixed to ice hockey). Entries are concatenated into a
    // single grounding text; their titles are kept as lightweight provenance.
    const sport: Sport = DEFAULT_SPORT;
    const entries = await this.deps.libraryRepository.listBySport(sport);
    const knowledgeText = entries
      .map((e) => `### ${e.title}\n${e.content}`)
      .join('\n\n');
    const sourceUrls = entries.map((e) => e.title);

    for await (const event of this.deps.aiGenerator.generate({ session, knowledgeText, language: ctx.language })) {
      if (event.status === 'done' && event.document) {
        const tei = computeTei(session);
        const recommendation = await this.deps.recommendationRepository.upsert({
          sessionId,
          tenantId: ctx.tenantId,
          document: { ...event.document, tei },
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
