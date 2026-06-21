import type { LibraryRepository } from '../../domain/ports/library.repository.js';
import type { CreateLibraryEntryInput, LibraryEntry } from '@pet/shared';

export interface CreateLibraryEntryDeps {
  libraryRepository: LibraryRepository;
}

export class CreateLibraryEntryUseCase {
  constructor(private readonly deps: CreateLibraryEntryDeps) {}

  execute(input: CreateLibraryEntryInput): Promise<LibraryEntry> {
    return this.deps.libraryRepository.create({
      title: input.title,
      content: input.content,
      sport: input.sport,
    });
  }
}
