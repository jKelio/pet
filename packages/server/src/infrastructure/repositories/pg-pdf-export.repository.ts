import { and, eq } from 'drizzle-orm';
import type { DbClient } from '../db/client.js';
import { pdfExports } from '../db/schema.js';
import type { PdfExportRepository } from '../../domain/ports/pdf-export.repository.js';

export class PgPdfExportRepository implements PdfExportRepository {
  constructor(private readonly db: DbClient) {}

  async hasExported(tenantId: string, sessionId: string, period: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: pdfExports.id })
      .from(pdfExports)
      .where(and(
        eq(pdfExports.tenantId, tenantId),
        eq(pdfExports.sessionId, sessionId),
        eq(pdfExports.period, period),
      ))
      .limit(1);
    return !!row;
  }

  async recordExport(tenantId: string, sessionId: string, period: string): Promise<void> {
    await this.db
      .insert(pdfExports)
      .values({ tenantId, sessionId, period })
      .onConflictDoNothing();
  }
}
