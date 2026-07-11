import type { FastifyInstance } from 'fastify';
import type { SyncSessionUseCase } from '../../application/use-cases/sync-session.js';
import type { DeleteSessionUseCase } from '../../application/use-cases/delete-session.js';
import type { ListTeamSessionsUseCase } from '../../application/use-cases/list-team-sessions.js';
import { InvalidCursorError } from '../../application/use-cases/list-team-sessions.js';
import type { GetSessionUseCase } from '../../application/use-cases/get-session.js';
import type { UpdateSessionPracticeInfoUseCase } from '../../application/use-cases/update-session-practice-info.js';
import { SyncSessionSchema, UpdatePracticeInfoSchema } from '@pet/shared';
import { UnauthorizedError } from '../../application/use-cases/sync-session.js';
import { ForbiddenError, NotFoundError } from '../../application/use-cases/delete-session.js';
import { isEntitlementError } from '../../application/services/entitlement.service.js';

interface SessionRoutesDeps {
  syncSession: SyncSessionUseCase;
  deleteSession: DeleteSessionUseCase;
  listTeamSessions: ListTeamSessionsUseCase;
  getSession: GetSessionUseCase;
  updateSessionPracticeInfo: UpdateSessionPracticeInfoUseCase;
}

export function registerSessionRoutes(fastify: FastifyInstance, deps: SessionRoutesDeps): void {
  // All session routes require authentication
  fastify.addHook('onRequest', fastify.authenticate);

  // POST /sessions/sync — upload a completed offline session
  fastify.post('/sessions/sync', async (request, reply) => {
    const result = SyncSessionSchema.safeParse(request.body);
    if (!result.success) {
      const issue = result.error.issues[0];
      const field = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
      return reply.code(400).send({
        code: 'VALIDATION_ERROR',
        message: `${field}${issue.message}`,
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
      if (isEntitlementError(error)) {
        return reply.code(error.statusCode).send({ code: error.code, message: error.message, statusCode: error.statusCode });
      }
      throw error;
    }
  });

  // GET /sessions?teamId=xxx&limit=20&cursor=yyy — paginated session list for a team,
  // newest practice first (view-scope enforced)
  fastify.get('/sessions', async (request, reply) => {
    const { teamId, limit, cursor } = request.query as { teamId?: string; limit?: string; cursor?: string };
    const tenantId = request.tenantId;

    if (!tenantId || !teamId) {
      return reply.code(400).send({
        code: 'MISSING_PARAM',
        message: 'teamId query parameter is required',
        statusCode: 400,
      });
    }

    let parsedLimit: number | undefined;
    if (limit !== undefined) {
      parsedLimit = Number(limit);
      if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
        return reply.code(400).send({
          code: 'VALIDATION_ERROR',
          message: 'limit must be a positive integer',
          statusCode: 400,
        });
      }
    }

    try {
      const page = await deps.listTeamSessions.execute(
        teamId,
        { userId: request.userId, tenantId },
        { limit: parsedLimit, cursor },
      );
      return reply.code(200).send(page);
    } catch (error) {
      if (error instanceof ForbiddenError) {
        return reply.code(403).send({ code: 'FORBIDDEN', message: error.message, statusCode: 403 });
      }
      if (error instanceof InvalidCursorError) {
        return reply.code(400).send({ code: 'INVALID_CURSOR', message: error.message, statusCode: 400 });
      }
      throw error;
    }
  });

  // GET /sessions/:id — get a single session (view-scope enforced)
  fastify.get('/sessions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenantId;

    if (!tenantId) {
      return reply.code(403).send({ code: 'NO_TENANT', message: 'No active tenant', statusCode: 403 });
    }

    try {
      const session = await deps.getSession.execute(id, { userId: request.userId, tenantId });
      return reply.code(200).send(session);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return reply.code(404).send({ code: 'NOT_FOUND', message: error.message, statusCode: 404 });
      }
      throw error;
    }
  });

  // PATCH /sessions/:id/practice-info — correct practice metadata (creator or club_admin)
  fastify.patch('/sessions/:id/practice-info', async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenantId;

    if (!tenantId) {
      return reply.code(403).send({ code: 'NO_TENANT', message: 'No active tenant', statusCode: 403 });
    }

    const result = UpdatePracticeInfoSchema.safeParse(request.body);
    if (!result.success) {
      const issue = result.error.issues[0];
      const field = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
      return reply.code(400).send({
        code: 'VALIDATION_ERROR',
        message: `${field}${issue.message}`,
        statusCode: 400,
      });
    }

    try {
      const session = await deps.updateSessionPracticeInfo.execute(id, result.data, {
        userId: request.userId,
        tenantId,
      });
      return reply.code(200).send(session);
    } catch (error) {
      if (error instanceof ForbiddenError) {
        return reply.code(403).send({ code: 'FORBIDDEN', message: error.message, statusCode: 403 });
      }
      if (error instanceof NotFoundError) {
        return reply.code(404).send({ code: 'NOT_FOUND', message: error.message, statusCode: 404 });
      }
      throw error;
    }
  });

  // DELETE /sessions/:id — delete a synced session (creator or club_admin)
  fastify.delete('/sessions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenantId;

    if (!tenantId) {
      return reply.code(403).send({ code: 'NO_TENANT', message: 'No active tenant', statusCode: 403 });
    }

    try {
      await deps.deleteSession.execute(id, { userId: request.userId, tenantId });
      return reply.code(204).send();
    } catch (error) {
      if (error instanceof ForbiddenError) {
        return reply.code(403).send({ code: 'FORBIDDEN', message: error.message, statusCode: 403 });
      }
      if (error instanceof NotFoundError) {
        return reply.code(404).send({ code: 'NOT_FOUND', message: error.message, statusCode: 404 });
      }
      throw error;
    }
  });
}
