import type { FastifyInstance } from 'fastify';
import { GenerateRecommendationSchema } from '@pet/shared';
import type { GenerateRecommendationUseCase } from '../../application/use-cases/generate-recommendation.js';
import type { GetRecommendationUseCase } from '../../application/use-cases/get-recommendation.js';
import { RecommendationForbiddenError, RecommendationNotFoundError } from '../../application/use-cases/get-recommendation.js';
import { RecommendationConflictError } from '../../application/use-cases/generate-recommendation.js';
import { RecommendationGenerationError } from '../../infrastructure/services/gemini-recommendation.generator.js';
import type { EntitlementService } from '../../application/services/entitlement.service.js';
import { isEntitlementError } from '../../application/services/entitlement.service.js';
import type { PdfRenderer } from '../../domain/ports/pdf-renderer.js';

interface RecommendationRoutesDeps {
  generateRecommendation: GenerateRecommendationUseCase;
  getRecommendation: GetRecommendationUseCase;
  entitlement: EntitlementService;
  geminiEnabled: boolean;
  pdfRenderer: PdfRenderer;
}

export function registerRecommendationRoutes(fastify: FastifyInstance, deps: RecommendationRoutesDeps): void {
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /sessions/:sessionId/recommendation/pdf — render recommendation as PDF
  fastify.get('/sessions/:sessionId/recommendation/pdf', async (request, reply) => {
    const tenantId = request.tenantId;
    if (!tenantId) return reply.code(403).send({ code: 'NO_TENANT', message: 'No active tenant', statusCode: 403 });

    const { sessionId: rawSessionId } = request.params as { sessionId: string };
    const sessionId = rawSessionId.replace(/^cloud-/, '');
    const { lang = 'de' } = request.query as { lang?: string };

    try {
      const recommendation = await deps.getRecommendation.execute(sessionId, { userId: request.userId, tenantId });
      const buffer = await deps.pdfRenderer.renderRecommendation(recommendation, lang);
      const date = recommendation.updatedAt.split('T')[0];
      return reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="recommendation-${date}.pdf"`)
        .send(buffer);
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

    // Paywall: AI analysis requires a Pro/Premium plan. Checked before the SSE
    // stream opens so a blocked tenant gets a real HTTP status (and upsell),
    // not an in-stream error event.
    try {
      await deps.entitlement.assertCanUseAi(tenantId);
    } catch (error) {
      if (isEntitlementError(error)) {
        return reply.code(error.statusCode).send({ code: error.code, message: error.message, statusCode: error.statusCode });
      }
      throw error;
    }

    const language = result.data.language;

    // Analysis is one-shot: refuse (before opening the stream) if the caller may not
    // generate or a recommendation already exists for this session.
    try {
      await deps.generateRecommendation.ensureGeneratable(sessionId, { userId: request.userId, tenantId, language });
    } catch (error) {
      if (error instanceof RecommendationConflictError) {
        return reply.code(409).send({ code: 'CONFLICT', message: error.message, statusCode: 409 });
      }
      if (error instanceof RecommendationForbiddenError) {
        return reply.code(403).send({ code: 'FORBIDDEN', message: error.message, statusCode: 403 });
      }
      if (error instanceof RecommendationNotFoundError) {
        return reply.code(404).send({ code: 'NOT_FOUND', message: error.message, statusCode: 404 });
      }
      throw error;
    }

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
