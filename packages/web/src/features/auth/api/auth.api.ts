import { apiClient } from '../../../shared/lib/api-client.js';
import type { User, AuthTokens, TenantMembership } from '@pet/shared';

export interface VerifyResponse extends AuthTokens {
  user: User;
}

export const authApi = {
  sendMagicLink: (email: string) =>
    apiClient.post<{ message: string }>('/auth/magic-link', { email }),

  verify: (token: string) =>
    apiClient.post<VerifyResponse>('/auth/verify', { token }),

  logout: () =>
    apiClient.post<{ message: string }>('/auth/logout', {}),

  getMyTenants: (accessToken: string) =>
    apiClient.get<TenantMembership[]>('/auth/my-tenants', accessToken),

  switchTenant: (tenantId: string, accessToken: string) =>
    apiClient.post<{ accessToken: string }>('/auth/switch-tenant', { tenantId }, accessToken),
};
