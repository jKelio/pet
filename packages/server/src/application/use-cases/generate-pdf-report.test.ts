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
  summary: { drills: 2, totalTime: 3_600_000, passiveTime: 600_000, passivePercent: 17 },
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

// Same shape plus the optional chart-ready fields the Results page mirrors.
const MODEL_WITH_CHARTS: PdfReportModel = {
  ...MODEL,
  drillTimeData: [
    { name: 'Drill 1', totalTime: 60_000, color: '#0088FE' },
    { name: 'Drill 2', totalTime: 90_000, color: '#FF8042' },
    { name: 'Gap', totalTime: 30_000, color: '#808080' },
  ],
  drillOverview: {
    totalDuration: 180_000,
    drills: [
      { drillNumber: 1, label: 'Drill 1', startOffset: 0, endOffset: 60_000, duration: 60_000, color: '#0088FE' },
      { drillNumber: 2, label: 'Drill 2', startOffset: 70_000, endOffset: 160_000, duration: 90_000, color: '#FF8042' },
    ],
  },
  drills: [
    {
      drillNumber: 1,
      tags: ['drill'],
      timers: [{ label: 'with Puck', segments: 2, totalTime: 60_000 }],
      counters: [{ label: 'Passes', count: 5 }],
      timeByAction: [
        { label: 'Explanation', totalTime: 30_000, color: '#0088FE' },
        { label: 'Time moving', totalTime: 60_000, color: '#A28BFE' },
      ],
      timeline: {
        totalDuration: 90_000,
        segments: [
          { label: 'Explanation', startOffset: 0, endOffset: 30_000, color: '#0088FE' },
          { label: 'Time moving with Puck', startOffset: 30_000, endOffset: 90_000, color: '#A28BFE' },
        ],
        counterEvents: [{ label: 'Passes', timestamp: 45_000, color: '#4CAF50' }],
        actionLabels: [
          { label: 'Explanation', color: '#0088FE' },
          { label: 'Time moving with Puck', color: '#A28BFE' },
          { label: 'Passes', color: '#4CAF50' },
        ],
      },
    },
  ],
};

const CTX = { userId: 'user-1', tenantId: 'tenant-1' };

function makeMembershipRepo(isMember = true): MembershipRepository {
  return {
    findByUserAndTenant: mock(async () => (isMember ? { id: 'mem-1', userId: 'user-1', tenantId: 'tenant-1', role: 'member' } : null)),
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

  test('renders a PDF with the chart sections (overview, pie/bar, per-drill timeline)', async () => {
    const buffer = await renderer.render(MODEL_WITH_CHARTS);
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    // The extra SVG charts produce a meaningfully larger document than the
    // table-only model.
    const tableOnly = await renderer.render(MODEL);
    expect(buffer.length).toBeGreaterThan(tableOnly.length);
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
