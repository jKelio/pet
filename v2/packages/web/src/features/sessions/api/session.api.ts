import { apiClient } from '../../../shared/lib/api-client.js';
import type { PracticeSession } from '@pet/shared';
import type { SyncSessionInput } from '@pet/shared';

export const sessionApi = {
  sync: (payload: SyncSessionInput, accessToken: string) =>
    apiClient.post<PracticeSession>('/sessions/sync', payload, accessToken),
};
