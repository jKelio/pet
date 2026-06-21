import type { FastifyInstance } from 'fastify';
import { CreateLibraryEntrySchema, UpdateLibraryEntrySchema } from '@pet/shared';
import type { ListLibraryEntriesUseCase } from '../../application/use-cases/list-library-entries.js';
import { LibraryEntryNotFoundError } from '../../application/use-cases/list-library-entries.js';
import type { CreateLibraryEntryUseCase } from '../../application/use-cases/create-library-entry.js';
import type { UpdateLibraryEntryUseCase } from '../../application/use-cases/update-library-entry.js';
import type { DeleteLibraryEntryUseCase } from '../../application/use-cases/delete-library-entry.js';

interface LibraryRoutesDeps {
  listLibraryEntries: ListLibraryEntriesUseCase;
  createLibraryEntry: CreateLibraryEntryUseCase;
  updateLibraryEntry: UpdateLibraryEntryUseCase;
  deleteLibraryEntry: DeleteLibraryEntryUseCase;
}

/**
 * The global, Pracmetrics-curated knowledge library. Read+write is restricted to
 * super-admins — tenants never manage these entries.
 */
export function registerLibraryRoutes(fastify: FastifyInstance, deps: LibraryRoutesDeps): void {
  fastify.addHook('onRequest', fastify.authenticate);
  fastify.addHook('onRequest', fastify.requireSuperAdmin);

  fastify.get('/superadmin/library', async (_request, reply) => {
    const entries = await deps.listLibraryEntries.execute();
    return reply.code(200).send(entries);
  });

  fastify.post('/superadmin/library', async (request, reply) => {
    const result = CreateLibraryEntrySchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: result.error.issues[0].message, statusCode: 400 });
    }
    const entry = await deps.createLibraryEntry.execute(result.data);
    return reply.code(201).send(entry);
  });

  fastify.patch('/superadmin/library/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = UpdateLibraryEntrySchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: result.error.issues[0].message, statusCode: 400 });
    }
    try {
      const entry = await deps.updateLibraryEntry.execute(id, result.data);
      return reply.code(200).send(entry);
    } catch (error) {
      if (error instanceof LibraryEntryNotFoundError) {
        return reply.code(404).send({ code: 'NOT_FOUND', message: error.message, statusCode: 404 });
      }
      throw error;
    }
  });

  fastify.delete('/superadmin/library/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await deps.deleteLibraryEntry.execute(id);
      return reply.code(204).send();
    } catch (error) {
      if (error instanceof LibraryEntryNotFoundError) {
        return reply.code(404).send({ code: 'NOT_FOUND', message: error.message, statusCode: 404 });
      }
      throw error;
    }
  });
}
