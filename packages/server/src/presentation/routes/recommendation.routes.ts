import type { FastifyInstance } from 'fastify';
import { GenerateRecommendationSchema } from '@pet/shared';
import type { GenerateRecommendationUseCase } from '../../application/use-cases/generate-recommendation.js';
import type { GetRecommendationUseCase } from '../../application/use-cases/get-recommendation.js';
import { RecommendationForbiddenError, RecommendationNotFoundError } from '../../application/use-cases/get-recommendation.js';
import { RecommendationGenerationError } from '../../infrastructure/services/gemini-recommendation.generator.js';

interface RecommendationRoutesDeps {
  generateRecommendation: GenerateRecommendationUseCase;
  getRecommendation: GetRecommendationUseCase;
  geminiEnabled: boolean;
}

export function registerRecommendationRoutes(fastify: FastifyInstance, deps: RecommendationRoutesDeps): void {
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /sessions/:sessionId/recommendation — load existing recommendation
  fastify.get('/sessions/:sessionId/recommendation', async (request, reply) => {
    const tenantId = request.tenantId;
    if (!tenantId) return reply.code(403).send({ code: 'NO_TENANT', message: 'No active tenant', statusCode: 403 });

    const { sessionId: rawSessionId } = request.params as { sessionId: string };
    const sessionId = rawSessionId.replace(/^cloud-/, '');

    try {
      const recommendation = await deps.getRecommendation.execute(sessionId, { userId: request.userId, tenantId });
      return reply.code(200).send(recommendation);
    } catch (error) {
      if (error instanceof RecommendationNotFoundError) {
        return reply.code(404).send({ code: 'NOT_FOUND', message: error.message, statusCode: 404 });
      }
      if (error instanceof RecommendationForbiddenError) {
        return reply.code(403).send({ code: 'FORBIDDEN', message: error.message, statusCode: 403 });
      }
      throw error;
    }
  });

  // POST /sessions/:sessionId/recommendation — generate (SSE stream)
  fastify.post('/sessions/:sessionId/recommendation', {
    config: { rateLimit: { max: 10, timeWindow: '1 hour' } },
  }, async (request, reply) => {
    if (!deps.geminiEnabled) {
      return reply.code(503).send({ code: 'FEATURE_DISABLED', message: 'AI recommendations are not configured', statusCode: 503 });
    }

    const tenantId = request.tenantId;
    if (!tenantId) return reply.code(403).send({ code: 'NO_TENANT', message: 'No active tenant', statusCode: 403 });

    const { sessionId: rawSessionId } = request.params as { sessionId: string };
    const sessionId = rawSessionId.replace(/^cloud-/, '');
    const result = GenerateRecommendationSchema.safeParse(request.body);
    if (!result.success) {
      const issue = result.error.issues[0];
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: issue.message, statusCode: 400 });
    }

    const acceptLang = (request.headers['accept-language'] ?? 'en').split(',')[0].trim().split('-')[0];
    const language = ['de', 'ru', 'en'].includes(acceptLang) ? acceptLang : 'en';

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const sendEvent = (event: string, data: unknown) => {
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      for await (const event of deps.generateRecommendation.execute(
        sessionId,
        result.data.sourceIds,
        { userId: request.userId, tenantId, language },
      )) {
        if (event.status === 'ready') {
          sendEvent('result', event.recommendation);
        } else {
          sendEvent('progress', { status: event.status });
        }
      }
    } catch (error) {
      if (error instanceof RecommendationForbiddenError) {
        sendEvent('error', { code: 'FORBIDDEN', message: error.message });
      } else if (error instanceof RecommendationNotFoundError) {
        sendEvent('error', { code: 'NOT_FOUND', message: error.message });
      } else if (error instanceof RecommendationGenerationError) {
        sendEvent('error', { code: 'GENERATION_FAILED', message: error.message });
      } else {
        sendEvent('error', { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
        fastify.log.error(error);
      }
    } finally {
      reply.raw.end();
    }
  });
}
