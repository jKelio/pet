import { apiClient } from '../../../shared/lib/api-client.js';
import type { Tenant, Membership } from '@pet/shared';

export interface CreateTenantInput {
  tenantName: string;
  teamName: string;
  adminEmail: string;
}

export const superAdminApi = {
  listTenants: (accessToken: string) =>
    apiClient.get<Tenant[]>('/superadmin/tenants', accessToken),

  createTenant: (input: CreateTenantInput, accessToken: string) =>
    apiClient.post<{ tenant: Tenant }>('/superadmin/tenants', input, accessToken),

  deleteTenant: (tenantId: string, accessToken: string) =>
    apiClient.delete<void>(`/superadmin/tenants/${tenantId}`, accessToken),

  addClubAdmin: (tenantId: string, email: string, accessToken: string) =>
    apiClient.post<Membership>(`/superadmin/tenants/${tenantId}/admins`, { email }, accessToken),
};
