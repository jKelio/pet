import type { PdfReportModel, Recommendation } from '@pet/shared';

export interface PdfRenderer {
  /** Render a report model into a PDF document buffer. Pure, stateless. */
  render(model: PdfReportModel): Promise<Buffer>;
  /** Render an AI recommendation document into a PDF buffer. */
  renderRecommendation(recommendation: Recommendation, lang: string): Promise<Buffer>;
}
