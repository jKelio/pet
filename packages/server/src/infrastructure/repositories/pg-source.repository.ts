import { eq, and, inArray } from 'drizzle-orm';
import type { DbClient } from '../db/client.js';
import { sources } from '../db/schema.js';
import type { SourceRepository } from '../../domain/ports/source.repository.js';
import type { Source } from '@pet/shared';

export class PgSourceRepository implements SourceRepository {
  constructor(private readonly db: DbClient) {}

  async findByTenant(tenantId: string): Promise<Source[]> {
    const rows = await this.db
      .select()
      .from(sources)
      .where(eq(sources.tenantId, tenantId))
      .orderBy(sources.createdAt);
    return rows.map(this.toEntity);
  }

  async findById(id: string, tenantId: string): Promise<Source | null> {
    const [row] = await this.db
      .select()
      .from(sources)
      .where(and(eq(sources.id, id), eq(sources.tenantId, tenantId)))
      .limit(1);
    return row ? this.toEntity(row) : null;
  }

  async findByIds(ids: string[], tenantId: string): Promise<Source[]> {
    if (ids.length === 0) return [];
    const rows = await this.db
      .select()
      .from(sources)
      .where(and(inArray(sources.id, ids), eq(sources.tenantId, tenantId)));
    return rows.map(this.toEntity);
  }

  async create(source: Omit<Source, 'id' | 'createdAt' | 'updatedAt'>): Promise<Source> {
    const [row] = await this.db
      .insert(sources)
      .values({
        tenantId: source.tenantId,
        url: source.url,
        title: source.title,
        createdBy: source.createdBy,
      })
      .returning();
    return this.toEntity(row);
  }

  async update(id: string, tenantId: string, patch: { url?: string; title?: string }): Promise<Source | null> {
    const [row] = await this.db
      .update(sources)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(sources.id, id), eq(sources.tenantId, tenantId)))
      .returning();
    return row ? this.toEntity(row) : null;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.db
      .delete(sources)
      .where(and(eq(sources.id, id), eq(sources.tenantId, tenantId)));
  }

  private toEntity(row: typeof sources.$inferSelect): Source {
    return {
      id: row.id,
      tenantId: row.tenantId,
      url: row.url,
      title: row.title,
      createdBy: row.createdBy,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
