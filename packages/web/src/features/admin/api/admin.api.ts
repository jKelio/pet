import { apiClient } from '../../../shared/lib/api-client.js';
import type { Team, Tenant, Membership, User, UserRole, EntitlementSnapshot } from '@pet/shared';

export interface MyProfile {
  user: User;
  membership: Membership | null;
  tenant: Tenant | null;
  teams: Team[];
  entitlements: EntitlementSnapshot | null;
  isSuperAdmin: boolean;
}

export interface OnboardPayload {
  tenantName: string;
  teamName: string;
  ageClass: number;
}

export interface OnboardResult {
  tenant: Tenant;
  team: Team;
  membership: Membership;
}

export interface MemberWithUser {
  membership: Membership;
  user: User;
}

export const adminApi = {
  getMyProfile: (accessToken: string) =>
    apiClient.get<MyProfile>('/me', accessToken),

  onboard: (payload: OnboardPayload, accessToken: string) =>
    apiClient.post<OnboardResult>('/onboarding', payload, accessToken),

  createTeam: (name: string, ageClass: number, accessToken: string) =>
    apiClient.post<Team>('/admin/teams', { name, ageClass }, accessToken),

  createExternalTeam: (name: string, externalClubName: string, ageClass: number, accessToken: string) =>
    apiClient.post<Team>('/admin/external-teams', { name, externalClubName, ageClass }, accessToken),

  listTeams: (accessToken: string) =>
    apiClient.get<Team[]>('/admin/teams', accessToken),

  deleteTeam: (teamId: string, accessToken: string) =>
    apiClient.delete<void>(`/admin/teams/${encodeURIComponent(teamId)}`, accessToken),

  listMembers: (accessToken: string) =>
    apiClient.get<MemberWithUser[]>('/admin/members', accessToken),

  inviteMember: (email: string, role: UserRole, name: string | undefined, accessToken: string) =>
    apiClient.post<Membership>('/admin/members', { email, role, name }, accessToken),

  updateMember: (membershipId: string, name: string, accessToken: string) =>
    apiClient.patch<User>(`/admin/members/${membershipId}`, { name }, accessToken),

  removeMember: (membershipId: string, accessToken: string) =>
    apiClient.delete<void>(`/admin/members/${membershipId}`, accessToken),
};
