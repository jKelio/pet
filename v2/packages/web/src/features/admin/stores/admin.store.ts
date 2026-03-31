import { create } from 'zustand';
import type { Team, Tenant, Membership, User, UserRole } from '@pet/shared';
import { adminApi, type MemberWithUser } from '../api/admin.api.js';

interface AdminState {
  user: User | null;
  membership: Membership | null;
  tenant: Tenant | null;
  teams: Team[];
  members: MemberWithUser[];
  loading: boolean;
  error: string | null;

  loadProfile: (accessToken: string) => Promise<void>;
  onboard: (tenantName: string, teamName: string, accessToken: string) => Promise<void>;
  createTeam: (name: string, accessToken: string) => Promise<void>;
  loadMembers: (accessToken: string) => Promise<void>;
  inviteMember: (email: string, role: UserRole, accessToken: string) => Promise<void>;
  removeMember: (membershipId: string, accessToken: string) => Promise<void>;
  reset: () => void;
}

export const useAdminStore = create<AdminState>()((set, get) => ({
  user: null,
  membership: null,
  tenant: null,
  teams: [],
  members: [],
  loading: false,
  error: null,

  loadProfile: async (accessToken) => {
    set({ loading: true, error: null });
    try {
      const profile = await adminApi.getMyProfile(accessToken);
      set({
        user: profile.user,
        membership: profile.membership,
        tenant: profile.tenant,
        teams: profile.teams,
        loading: false,
      });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Fehler beim Laden' });
    }
  },

  onboard: async (tenantName, teamName, accessToken) => {
    set({ loading: true, error: null });
    try {
      const result = await adminApi.onboard({ tenantName, teamName }, accessToken);
      set({
        tenant: result.tenant,
        membership: result.membership,
        teams: [result.team],
        loading: false,
      });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Fehler beim Einrichten' });
      throw err;
    }
  },

  createTeam: async (name, accessToken) => {
    set({ loading: true, error: null });
    try {
      const team = await adminApi.createTeam(name, accessToken);
      set((s) => ({ teams: [...s.teams, team], loading: false }));
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Fehler beim Erstellen' });
      throw err;
    }
  },

  loadMembers: async (accessToken) => {
    set({ loading: true, error: null });
    try {
      const members = await adminApi.listMembers(accessToken);
      set({ members, loading: false });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Fehler beim Laden' });
    }
  },

  inviteMember: async (email, role, accessToken) => {
    set({ loading: true, error: null });
    try {
      await adminApi.inviteMember(email, role, accessToken);
      // Refresh member list
      const members = await adminApi.listMembers(accessToken);
      set({ members, loading: false });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Fehler beim Einladen' });
      throw err;
    }
  },

  removeMember: async (membershipId, accessToken) => {
    set({ loading: true, error: null });
    try {
      await adminApi.removeMember(membershipId, accessToken);
      set((s) => ({
        members: s.members.filter((m) => m.membership.id !== membershipId),
        loading: false,
      }));
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Fehler beim Entfernen' });
      throw err;
    }
  },

  reset: () =>
    set({ user: null, membership: null, tenant: null, teams: [], members: [], loading: false, error: null }),
}));
