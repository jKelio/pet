import { currentPeriod, type PdfReportModel } from '@pet/shared';
import type { MembershipRepository } from '../../domain/ports/user.repository.js';
import type { PdfExportRepository } from '../../domain/ports/pdf-export.repository.js';
import type { PdfRenderer } from '../../domain/ports/pdf-renderer.js';
import type { EntitlementService } from '../services/entitlement.service.js';

export class PdfForbiddenError extends Error {
  readonly statusCode = 403;
  readonly code = 'FORBIDDEN';
  constructor(message: string) {
    super(message);
    this.name = 'PdfForbiddenError';
  }
}

export interface GeneratePdfReportDeps {
  membershipRepository: MembershipRepository;
  pdfExportRepository: PdfExportRepository;
  pdfRenderer: PdfRenderer;
  entitlementService: EntitlementService;
}

export interface GeneratePdfReportContext {
  userId: string;
  tenantId: string;
}

/**
 * Stateless PDF Report generation. Renders from the posted report model (the
 * session is never read from the DB), so it works for any session — synced,
 * pending, or Local-Only. The monthly allowance is metered per distinct session:
 * a re-export of a session already recorded this period is free.
 * See docs/adr/0008 and docs/adr/0009.
 */
export class GeneratePdfReportUseCase {
  constructor(private readonly deps: GeneratePdfReportDeps) {}

  async execute(model: PdfReportModel, ctx: GeneratePdfReportContext): Promise<Buffer> {
    const membership = await this.deps.membershipRepository.findByUserAndTenant(ctx.userId, ctx.tenantId);
    if (!membership) throw new PdfForbiddenError('Not a member of this tenant');

    const period = currentPeriod();
    const alreadyExported = await this.deps.pdfExportRepository.hasExported(
      ctx.tenantId, model.sessionId, period,
    );

    // Only a session not yet exported this period consumes the monthly allowance.
    if (!alreadyExported) {
      await this.deps.entitlementService.assertCanExportPdf(ctx.tenantId);
    }

    const buffer = await this.deps.pdfRenderer.render(model);

    // Record only after a successful render, so a render failure never burns quota.
    if (!alreadyExported) {
      await this.deps.pdfExportRepository.recordExport(ctx.tenantId, model.sessionId, period);
    }

    return buffer;
  }
}
