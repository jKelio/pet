import type { PdfReportModel } from '@pet/shared';

export interface PdfRenderer {
  /** Render a report model into a PDF document buffer. Pure, stateless. */
  render(model: PdfReportModel): Promise<Buffer>;
}
