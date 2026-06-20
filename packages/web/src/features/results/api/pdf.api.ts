import { apiClient } from '../../../shared/lib/api-client.js';
import type { PdfReportModel } from '@pet/shared';

export const pdfApi = {
  /** Render a session's PDF Report server-side. Returns the PDF as a Blob. */
  generate: (model: PdfReportModel, accessToken: string) =>
    apiClient.postBlob('/pdf', model, accessToken),
};
