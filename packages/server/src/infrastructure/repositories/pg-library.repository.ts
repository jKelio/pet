import { eq } from 'drizzle-orm';
import type { DbClient } from '../db/client.js';
import { libraryEntries } from '../db/schema.js';
import type { LibraryRepository } from '../../domain/ports/library.repository.js';
import type { LibraryEntry, Sport } from '@pet/shared';

export class PgLibraryRepository implements LibraryRepository {
  constructor(private readonly db: DbClient) {}

  async listBySport(sport: Sport): Promise<LibraryEntry[]> {
    const rows = await this.db
      .select()
      .from(libraryEntries)
      .where(eq(libraryEntries.sport, sport))
      .orderBy(libraryEntries.createdAt);
    return rows.map(this.toEntity);
  }

  async findById(id: string): Promise<LibraryEntry | null> {
    const [row] = await this.db
      .select()
      .from(libraryEntries)
      .where(eq(libraryEntries.id, id))
      .limit(1);
    return row ? this.toEntity(row) : null;
  }

  async create(entry: { title: string; content: string; sport: Sport }): Promise<LibraryEntry> {
    const [row] = await this.db
      .insert(libraryEntries)
      .values({ title: entry.title, content: entry.content, sport: entry.sport })
      .returning();
    return this.toEntity(row);
  }

  async update(
    id: string,
    patch: { title?: string; content?: string; sport?: Sport },
  ): Promise<LibraryEntry | null> {
    const [row] = await this.db
      .update(libraryEntries)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(libraryEntries.id, id))
      .returning();
    return row ? this.toEntity(row) : null;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(libraryEntries).where(eq(libraryEntries.id, id));
  }

  private toEntity(row: typeof libraryEntries.$inferSelect): LibraryEntry {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      sport: row.sport as Sport,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
