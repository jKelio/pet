import type { LibraryRepository } from '../../domain/ports/library.repository.js';
import type { LibraryEntry, Sport } from '@pet/shared';
import { DEFAULT_SPORT } from '@pet/shared';

export interface ListLibraryEntriesDeps {
  libraryRepository: LibraryRepository;
}

export class ListLibraryEntriesUseCase {
  constructor(private readonly deps: ListLibraryEntriesDeps) {}

  execute(sport: Sport = DEFAULT_SPORT): Promise<LibraryEntry[]> {
    return this.deps.libraryRepository.listBySport(sport);
  }
}

export class LibraryEntryNotFoundError extends Error {
  readonly statusCode = 404;
  constructor(message = 'Library entry not found') {
    super(message);
    this.name = 'LibraryEntryNotFoundError';
  }
}
