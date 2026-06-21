import type { LibraryEntry, Sport } from '@pet/shared';

/**
 * Global, Pracmetrics-curated knowledge library. Entries are scoped by sport, not
 * by tenant — there is one shared library per sport that grounds every AI analysis.
 */
export interface LibraryRepository {
  listBySport(sport: Sport): Promise<LibraryEntry[]>;
  findById(id: string): Promise<LibraryEntry | null>;
  create(entry: { title: string; content: string; sport: Sport }): Promise<LibraryEntry>;
  update(id: string, patch: { title?: string; content?: string; sport?: Sport }): Promise<LibraryEntry | null>;
  delete(id: string): Promise<void>;
}
