import { apiClient } from '../../../shared/lib/api-client.js';
import type { Team, Tenant, Membership, User, UserRole } from '@pet/shared';

export interface MyProfile {
  user: User;
  membership: Membership | null;
  tenant: Tenant | null;
  teams: Team[];
}

export interface OnboardPayload {
  tenantName: string;
  teamName: string;
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

  createTeam: (name: string, accessToken: string) =>
    apiClient.post<Team>('/admin/teams', { name }, accessToken),

  listTeams: (accessToken: string) =>
    apiClient.get<Team[]>('/admin/teams', accessToken),

  listMembers: (accessToken: string) =>
    apiClient.get<MemberWithUser[]>('/admin/members', accessToken),

  inviteMember: (email: string, role: UserRole, accessToken: string) =>
    apiClient.post<Membership>('/admin/members', { email, role }, accessToken),

  removeMember: (membershipId: string, accessToken: string) =>
    apiClient.delete<void>(`/admin/members/${membershipId}`, accessToken),
};
