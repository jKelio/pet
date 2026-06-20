export interface PdfExportRepository {
  /** Whether this session was already exported as a PDF in the given `YYYY-MM` period. */
  hasExported(tenantId: string, sessionId: string, period: string): Promise<boolean>;
  /**
   * Record that this session was exported in the given period. Idempotent — a
   * repeat for the same (tenant, session, period) is a no-op (unique index).
   */
  recordExport(tenantId: string, sessionId: string, period: string): Promise<void>;
}
