import { apiClient } from '../../../shared/lib/api-client.js';
import type { Source, Recommendation } from '@pet/shared';

export async function listSources(accessToken: string): Promise<Source[]> {
  return apiClient.get<Source[]>('/sources', accessToken);
}

export async function createSource(data: { url: string; title: string }, accessToken: string): Promise<Source> {
  return apiClient.post<Source>('/sources', data, accessToken);
}

export async function updateSource(id: string, data: { url?: string; title?: string }, accessToken: string): Promise<Source> {
  return apiClient.patch<Source>(`/sources/${id}`, data, accessToken);
}

export async function deleteSource(id: string, accessToken: string): Promise<void> {
  return apiClient.delete<void>(`/sources/${id}`, accessToken);
}

export async function getRecommendation(sessionId: string, accessToken: string): Promise<Recommendation> {
  return apiClient.get<Recommendation>(`/sessions/${sessionId}/recommendation`, accessToken);
}

export function streamRecommendation(
  sessionId: string,
  sourceIds: string[],
  language: string,
  accessToken: string,
): AsyncIterable<{ event: string; data: unknown }> {
  return apiClient.sse(
    `/sessions/${sessionId}/recommendation`,
    { sourceIds, language },
    accessToken,
  );
}
