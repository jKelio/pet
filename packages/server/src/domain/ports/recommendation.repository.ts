import type { Recommendation } from '@pet/shared';

export interface RecommendationRepository {
  findBySession(sessionId: string, tenantId: string): Promise<Recommendation | null>;
  upsert(recommendation: Omit<Recommendation, 'id' | 'createdAt' | 'updatedAt'> & { sessionId: string }): Promise<Recommendation>;
}
