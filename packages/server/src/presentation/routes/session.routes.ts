import type { FastifyInstance } from 'fastify';
import type { SyncSessionUseCase } from '../../application/use-cases/sync-session.js';
import type { SessionRepository } from '../../domain/ports/session.repository.js';
import { SyncSessionSchema } from '@pet/shared';
import { UnauthorizedError } from '../../application/use-cases/sync-session.js';

interface SessionRoutesDeps {
  syncSession: SyncSessionUseCase;
  sessionRepository: SessionRepository;
}

export function registerSessionRoutes(fastify: FastifyInstance, deps: SessionRoutesDeps): void {
  // All session routes require authentication
  fastify.addHook('onRequest', fastify.authenticate);

  // POST /sessions/sync — upload a completed offline session
  fastify.post('/sessions/sync', async (request, reply) => {
    const result = SyncSessionSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({
        code: 'VALIDATION_ERROR',
        message: result.error.issues[0].message,
        statusCode: 400,
      });
    }

    const tenantId = request.tenantId;
    if (!tenantId) {
      return reply.code(403).send({
        code: 'NO_TENANT',
        message: 'No active tenant in token. Please re-authenticate.',
        statusCode: 403,
      });
    }

    try {
      const session = await deps.syncSession.execute(result.data, {
        userId: request.userId,
        tenantId,
      });
      return reply.code(200).send(session);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return reply.code(403).send({ code: 'FORBIDDEN', message: error.message, statusCode: 403 });
      }
      throw error;
    }
  });

  // GET /sessions?teamId=xxx — list sessions for a team
  fastify.get('/sessions', async (request, reply) => {
    const { teamId } = request.query as { teamId?: string };
    const tenantId = request.tenantId;

    if (!tenantId || !teamId) {
      return reply.code(400).send({
        code: 'MISSING_PARAM',
        message: 'teamId query parameter is required',
        statusCode: 400,
      });
    }

    const sessions = await deps.sessionRepository.findByTeam(teamId, tenantId);
    return reply.code(200).send(sessions);
  });

  // GET /sessions/:id — get a single session
  fastify.get('/sessions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenantId;

    if (!tenantId) {
      return reply.code(403).send({ code: 'NO_TENANT', message: 'No active tenant', statusCode: 403 });
    }

    const session = await deps.sessionRepository.findById(id, tenantId);
    if (!session) {
      return reply.code(404).send({ code: 'NOT_FOUND', message: 'Session not found', statusCode: 404 });
    }

    return reply.code(200).send(session);
  });
}
