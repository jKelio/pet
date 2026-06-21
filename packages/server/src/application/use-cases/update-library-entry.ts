import type { LibraryRepository } from '../../domain/ports/library.repository.js';
import type { UpdateLibraryEntryInput, LibraryEntry } from '@pet/shared';
import { LibraryEntryNotFoundError } from './list-library-entries.js';

export interface UpdateLibraryEntryDeps {
  libraryRepository: LibraryRepository;
}

export class UpdateLibraryEntryUseCase {
  constructor(private readonly deps: UpdateLibraryEntryDeps) {}

  async execute(id: string, patch: UpdateLibraryEntryInput): Promise<LibraryEntry> {
    const updated = await this.deps.libraryRepository.update(id, patch);
    if (!updated) throw new LibraryEntryNotFoundError();
    return updated;
  }
}
