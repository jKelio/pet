import { apiClient } from '../../../shared/lib/api-client.js';
import type { Tenant, Membership, TenantPlan, LibraryEntry, Sport, SuperAdminUserDto } from '@pet/shared';

export interface CreateTenantInput {
  tenantName: string;
  teamName: string;
  ageClass: number;
  adminName: string;
  adminEmail: string;
}

export interface LibraryEntryInput {
  title: string;
  content: string;
  sport: Sport;
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

  setPlan: (tenantId: string, plan: TenantPlan, accessToken: string) =>
    apiClient.patch<Tenant>(`/superadmin/tenants/${tenantId}/plan`, { plan }, accessToken),

  // ── Global users ──
  listUsers: (accessToken: string) =>
    apiClient.get<SuperAdminUserDto[]>('/superadmin/users', accessToken),

  deleteUser: (userId: string, accessToken: string) =>
    apiClient.delete<void>(`/superadmin/users/${userId}`, accessToken),

  // ── Global knowledge library ──
  listLibrary: (accessToken: string) =>
    apiClient.get<LibraryEntry[]>('/superadmin/library', accessToken),

  createLibraryEntry: (input: LibraryEntryInput, accessToken: string) =>
    apiClient.post<LibraryEntry>('/superadmin/library', input, accessToken),

  updateLibraryEntry: (id: string, input: Partial<LibraryEntryInput>, accessToken: string) =>
    apiClient.patch<LibraryEntry>(`/superadmin/library/${id}`, input, accessToken),

  deleteLibraryEntry: (id: string, accessToken: string) =>
    apiClient.delete<void>(`/superadmin/library/${id}`, accessToken),
};
