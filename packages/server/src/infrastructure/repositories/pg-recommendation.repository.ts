import { eq, and } from 'drizzle-orm';
import type { DbClient } from '../db/client.js';
import { sessionRecommendations } from '../db/schema.js';
import type { RecommendationRepository } from '../../domain/ports/recommendation.repository.js';
import type { Recommendation, RecommendationDocument } from '@pet/shared';

export class PgRecommendationRepository implements RecommendationRepository {
  constructor(private readonly db: DbClient) {}

  async findBySession(sessionId: string, tenantId: string): Promise<Recommendation | null> {
    const [row] = await this.db
      .select()
      .from(sessionRecommendations)
      .where(and(
        eq(sessionRecommendations.sessionId, sessionId),
        eq(sessionRecommendations.tenantId, tenantId),
      ))
      .limit(1);
    return row ? this.toEntity(row) : null;
  }

  async upsert(
    rec: Omit<Recommendation, 'id' | 'createdAt' | 'updatedAt'> & { sessionId: string },
  ): Promise<Recommendation> {
    const [row] = await this.db
      .insert(sessionRecommendations)
      .values({
        sessionId: rec.sessionId,
        tenantId: rec.tenantId,
        document: rec.document as any,
        sourceUrls: rec.sourceUrls,
        model: rec.model,
        createdBy: rec.createdBy,
      })
      .onConflictDoUpdate({
        target: sessionRecommendations.sessionId,
        set: {
          document: rec.document as any,
          sourceUrls: rec.sourceUrls,
          model: rec.model,
          createdBy: rec.createdBy,
          updatedAt: new Date(),
        },
      })
      .returning();
    return this.toEntity(row);
  }

  private toEntity(row: typeof sessionRecommendations.$inferSelect): Recommendation {
    return {
      id: row.id,
      sessionId: row.sessionId,
      tenantId: row.tenantId,
      document: row.document as RecommendationDocument,
      sourceUrls: row.sourceUrls ?? [],
      model: row.model,
      createdBy: row.createdBy,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
