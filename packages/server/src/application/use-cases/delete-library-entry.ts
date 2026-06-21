import type { LibraryRepository } from '../../domain/ports/library.repository.js';
import { LibraryEntryNotFoundError } from './list-library-entries.js';

export interface DeleteLibraryEntryDeps {
  libraryRepository: LibraryRepository;
}

export class DeleteLibraryEntryUseCase {
  constructor(private readonly deps: DeleteLibraryEntryDeps) {}

  async execute(id: string): Promise<void> {
    const existing = await this.deps.libraryRepository.findById(id);
    if (!existing) throw new LibraryEntryNotFoundError();
    await this.deps.libraryRepository.delete(id);
  }
}
