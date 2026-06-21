import { apiClient } from '../../../shared/lib/api-client.js';
import type { Recommendation } from '@pet/shared';

export async function getRecommendation(sessionId: string, accessToken: string): Promise<Recommendation> {
  return apiClient.get<Recommendation>(`/sessions/${sessionId}/recommendation`, accessToken);
}

export function streamRecommendation(
  sessionId: string,
  language: string,
  accessToken: string,
): AsyncIterable<{ event: string; data: unknown }> {
  return apiClient.sse(
    `/sessions/${sessionId}/recommendation`,
    { language },
    accessToken,
  );
}
