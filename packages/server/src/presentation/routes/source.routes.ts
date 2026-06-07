import type { FastifyInstance } from 'fastify';
import { CreateSourceSchema, UpdateSourceSchema } from '@pet/shared';
import type { ListSourcesUseCase } from '../../application/use-cases/list-sources.js';
import { SourceForbiddenError, SourceNotFoundError } from '../../application/use-cases/list-sources.js';
import type { CreateSourceUseCase } from '../../application/use-cases/create-source.js';
import type { UpdateSourceUseCase } from '../../application/use-cases/update-source.js';
import type { DeleteSourceUseCase } from '../../application/use-cases/delete-source.js';

interface SourceRoutesDeps {
  listSources: ListSourcesUseCase;
  createSource: CreateSourceUseCase;
  updateSource: UpdateSourceUseCase;
  deleteSource: DeleteSourceUseCase;
}

export function registerSourceRoutes(fastify: FastifyInstance, deps: SourceRoutesDeps): void {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/sources', async (request, reply) => {
    const tenantId = request.tenantId;
    if (!tenantId) return reply.code(403).send({ code: 'NO_TENANT', message: 'No active tenant', statusCode: 403 });

    const sources = await deps.listSources.execute({ userId: request.userId, tenantId });
    return reply.code(200).send(sources);
  });

  fastify.post('/sources', async (request, reply) => {
    const tenantId = request.tenantId;
    if (!tenantId) return reply.code(403).send({ code: 'NO_TENANT', message: 'No active tenant', statusCode: 403 });

    const result = CreateSourceSchema.safeParse(request.body);
    if (!result.success) {
      const issue = result.error.issues[0];
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: issue.message, statusCode: 400 });
    }

    try {
      const source = await deps.createSource.execute(result.data, { userId: request.userId, tenantId });
      return reply.code(201).send(source);
    } catch (error) {
      if (error instanceof SourceForbiddenError) {
        return reply.code(403).send({ code: 'FORBIDDEN', message: error.message, statusCode: 403 });
      }
      throw error;
    }
  });

  fastify.patch('/sources/:id', async (request, reply) => {
    const tenantId = request.tenantId;
    if (!tenantId) return reply.code(403).send({ code: 'NO_TENANT', message: 'No active tenant', statusCode: 403 });

    const { id } = request.params as { id: string };
    const result = UpdateSourceSchema.safeParse(request.body);
    if (!result.success) {
      const issue = result.error.issues[0];
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: issue.message, statusCode: 400 });
    }

    try {
      const source = await deps.updateSource.execute(id, result.data, { userId: request.userId, tenantId });
      return reply.code(200).send(source);
    } catch (error) {
      if (error instanceof SourceForbiddenError) {
        return reply.code(403).send({ code: 'FORBIDDEN', message: error.message, statusCode: 403 });
      }
      if (error instanceof SourceNotFoundError) {
        return reply.code(404).send({ code: 'NOT_FOUND', message: error.message, statusCode: 404 });
      }
      throw error;
    }
  });

  fastify.delete('/sources/:id', async (request, reply) => {
    const tenantId = request.tenantId;
    if (!tenantId) return reply.code(403).send({ code: 'NO_TENANT', message: 'No active tenant', statusCode: 403 });

    const { id } = request.params as { id: string };

    try {
      await deps.deleteSource.execute(id, { userId: request.userId, tenantId });
      return reply.code(204).send();
    } catch (error) {
      if (error instanceof SourceForbiddenError) {
        return reply.code(403).send({ code: 'FORBIDDEN', message: error.message, statusCode: 403 });
      }
      if (error instanceof SourceNotFoundError) {
        return reply.code(404).send({ code: 'NOT_FOUND', message: error.message, statusCode: 404 });
      }
      throw error;
    }
  });
}
