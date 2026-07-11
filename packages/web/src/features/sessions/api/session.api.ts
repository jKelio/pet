import { apiClient } from '../../../shared/lib/api-client.js';
import type { PracticeSession, SessionListPage } from '@pet/shared';
import type { SyncSessionInput, UpdatePracticeInfoInput } from '@pet/shared';

export const sessionApi = {
  sync: (payload: SyncSessionInput, accessToken: string) =>
    apiClient.post<PracticeSession>('/sessions/sync', payload, accessToken),

  listByTeam: (teamId: string, accessToken: string, opts: { limit?: number; cursor?: string } = {}) => {
    const params = new URLSearchParams({ teamId });
    if (opts.limit != null) params.set('limit', String(opts.limit));
    if (opts.cursor) params.set('cursor', opts.cursor);
    return apiClient.get<SessionListPage>(`/sessions?${params.toString()}`, accessToken);
  },

  updatePracticeInfo: (id: string, payload: UpdatePracticeInfoInput, accessToken: string) =>
    apiClient.patch<PracticeSession>(`/sessions/${encodeURIComponent(id)}/practice-info`, payload, accessToken),

  remove: (id: string, accessToken: string) =>
    apiClient.delete<void>(`/sessions/${encodeURIComponent(id)}`, accessToken),
};
