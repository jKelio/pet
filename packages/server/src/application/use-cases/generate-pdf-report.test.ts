import { describe, test, expect, mock } from 'bun:test';
import type { PdfReportModel } from '@pet/shared';
import type { MembershipRepository } from '../../domain/ports/user.repository.js';
import type { PdfExportRepository } from '../../domain/ports/pdf-export.repository.js';
import { ReactPdfRenderer } from '../../infrastructure/services/react-pdf.renderer.js';
import { EntitlementService, QuotaExceededError } from '../services/entitlement.service.js';
import { GeneratePdfReportUseCase, PdfForbiddenError } from './generate-pdf-report.js';

const MODEL: PdfReportModel = {
  sessionId: '11111111-1111-1111-1111-111111111111',
  locale: 'en',
  generatedAt: '2026-06-20T09:00:00.000Z',
  info: { clubName: 'EHC Test', teamName: 'U16', coachName: 'Coach', trackedPlayerName: 'P1', date: '2026-06-20' },
  summary: { drills: 2, totalTime: 3_600_000, wasteTime: 600_000, wastePercent: 17 },
  overallTimers: [{ label: 'Explanation', segments: 3, totalTime: 120_000 }],
  overallCounters: [{ label: 'Shots', count: 12 }],
  drills: [
    {
      drillNumber: 1,
      tags: ['drill'],
      timers: [{ label: 'with Puck', segments: 2, totalTime: 60_000 }],
      counters: [{ label: 'Passes', count: 5 }],
    },
  ],
};

const CTX = { userId: 'user-1', tenantId: 'tenant-1' };

function makeMembershipRepo(isMember = true): MembershipRepository {
  return {
    findByUserAndTenant: mock(async () => (isMember ? { id: 'mem-1', userId: 'user-1', tenantId: 'tenant-1', role: 'coach' } : null)),
  } as unknown as MembershipRepository;
}

function makeLedger(alreadyExported = false): PdfExportRepository {
  return {
    hasExported: mock(async () => alreadyExported),
    recordExport: mock(async () => {}),
  };
}

/** Entitlement double whose assertCanExportPdf either passes or throws QUOTA_EXCEEDED. */
function makeEntitlement(allow: boolean): EntitlementService {
  return {
    assertCanExportPdf: mock(async () => {
      if (!allow) throw new QuotaExceededError('You have used all 2 PDF exports this month.', 'pdf');
    }),
  } as unknown as EntitlementService;
}

const renderer = new ReactPdfRenderer();

describe('GeneratePdfReportUseCase', () => {
  test('renders a real PDF buffer and records the export', async () => {
    const ledger = makeLedger(false);
    const useCase = new GeneratePdfReportUseCase({
      membershipRepository: makeMembershipRepo(),
      pdfExportRepository: ledger,
      pdfRenderer: renderer,
      entitlementService: makeEntitlement(true),
    });

    const buffer = await useCase.execute(MODEL, CTX);

    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(500);
    expect(ledger.recordExport).toHaveBeenCalledTimes(1);
  });

  test('non-members are refused before any render', async () => {
    const ledger = makeLedger(false);
    const useCase = new GeneratePdfReportUseCase({
      membershipRepository: makeMembershipRepo(false),
      pdfExportRepository: ledger,
      pdfRenderer: renderer,
      entitlementService: makeEntitlement(true),
    });

    expect(useCase.execute(MODEL, CTX)).rejects.toBeInstanceOf(PdfForbiddenError);
    expect(ledger.recordExport).not.toHaveBeenCalled();
  });

  test('a new session over quota is blocked and not recorded', async () => {
    const ledger = makeLedger(false);
    const entitlement = makeEntitlement(false);
    const useCase = new GeneratePdfReportUseCase({
      membershipRepository: makeMembershipRepo(),
      pdfExportRepository: ledger,
      pdfRenderer: renderer,
      entitlementService: entitlement,
    });

    expect(useCase.execute(MODEL, CTX)).rejects.toBeInstanceOf(QuotaExceededError);
    expect(ledger.recordExport).not.toHaveBeenCalled();
  });

  test('re-exporting an already-recorded session bypasses the quota and re-records nothing', async () => {
    const ledger = makeLedger(true); // already exported this period
    const entitlement = makeEntitlement(false); // quota spent — must NOT be consulted
    const useCase = new GeneratePdfReportUseCase({
      membershipRepository: makeMembershipRepo(),
      pdfExportRepository: ledger,
      pdfRenderer: renderer,
      entitlementService: entitlement,
    });

    const buffer = await useCase.execute(MODEL, CTX);

    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(entitlement.assertCanExportPdf).not.toHaveBeenCalled();
    expect(ledger.recordExport).not.toHaveBeenCalled();
  });

  test('renders each locale without throwing', async () => {
    const useCase = new GeneratePdfReportUseCase({
      membershipRepository: makeMembershipRepo(),
      pdfExportRepository: makeLedger(false),
      pdfRenderer: renderer,
      entitlementService: makeEntitlement(true),
    });

    for (const locale of ['en', 'de', 'ru'] as const) {
      const buffer = await useCase.execute({ ...MODEL, locale }, CTX);
      expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    }
  });
});
