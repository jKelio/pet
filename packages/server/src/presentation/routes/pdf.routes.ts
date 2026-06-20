import type { FastifyInstance } from 'fastify';
import { PdfReportSchema } from '@pet/shared';
import type { GeneratePdfReportUseCase } from '../../application/use-cases/generate-pdf-report.js';
import { PdfForbiddenError } from '../../application/use-cases/generate-pdf-report.js';
import { isEntitlementError } from '../../application/services/entitlement.service.js';

interface PdfRoutesDeps {
  generatePdfReport: GeneratePdfReportUseCase;
}

export function registerPdfRoutes(fastify: FastifyInstance, deps: PdfRoutesDeps): void {
  fastify.addHook('onRequest', fastify.authenticate);

  // POST /pdf — render a session's PDF Report from the posted report model.
  // Stateless (nothing stored); gated + metered per the tenant's plan.
  fastify.post('/pdf', {
    config: { rateLimit: { max: 20, timeWindow: '1 hour' } },
  }, async (request, reply) => {
    const tenantId = request.tenantId;
    if (!tenantId) {
      return reply.code(403).send({ code: 'NO_TENANT', message: 'No active tenant', statusCode: 403 });
    }

    const result = PdfReportSchema.safeParse(request.body);
    if (!result.success) {
      const issue = result.error.issues[0];
      const field = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: `${field}${issue.message}`, statusCode: 400 });
    }

    try {
      const buffer = await deps.generatePdfReport.execute(result.data, {
        userId: request.userId,
        tenantId,
      });
      const date = (result.data.info.date || new Date().toISOString().split('T')[0]).replace(/[^\d-]/g, '').slice(0, 10) || 'export';
      return reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="training-${date}.pdf"`)
        .send(buffer);
    } catch (error) {
      if (isEntitlementError(error)) {
        return reply.code(error.statusCode).send({ code: error.code, message: error.message, statusCode: error.statusCode });
      }
      if (error instanceof PdfForbiddenError) {
        return reply.code(403).send({ code: error.code, message: error.message, statusCode: 403 });
      }
      throw error;
    }
  });
}
