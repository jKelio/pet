import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Team, Tenant, Membership, User, UserRole, EntitlementSnapshot } from '@pet/shared';
import { adminApi, type MemberWithUser } from '../api/admin.api.js';
import { useAuthStore } from '../../auth/stores/auth.store.js';
import i18n from '../../../lib/i18n.js';

// Resolves a localized fallback message for the active language (used outside React).
const tr = (key: string) => i18n.t(key, { ns: 'pet' });

interface AdminState {
  user: User | null;
  membership: Membership | null;
  tenant: Tenant | null;
  teams: Team[];
  members: MemberWithUser[];
  entitlements: EntitlementSnapshot | null;
  isSuperAdmin: boolean;
  loading: boolean;
  /** True once loadProfile has resolved at least once (success or failure). */
  loaded: boolean;
  error: string | null;

  loadProfile: (accessToken: string) => Promise<void>;
  onboard: (tenantName: string, teamName: string, accessToken: string) => Promise<void>;
  createTeam: (name: string, accessToken: string) => Promise<void>;
  createExternalTeam: (name: string, externalClubName: string, accessToken: string) => Promise<void>;
  loadMembers: (accessToken: string) => Promise<void>;
  inviteMember: (email: string, role: UserRole, name: string | undefined, teamIds: string[] | undefined, accessToken: string) => Promise<void>;
  updateMemberName: (membershipId: string, name: string, accessToken: string) => Promise<void>;
  removeMember: (membershipId: string, accessToken: string) => Promise<void>;
  assignTeamMember: (teamId: string, membershipId: string, accessToken: string) => Promise<void>;
  removeTeamMember: (teamId: string, membershipId: string, accessToken: string) => Promise<void>;
  reset: () => void;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      user: null,
      membership: null,
      tenant: null,
      teams: [],
      members: [],
      entitlements: null,
      isSuperAdmin: false,
      loading: false,
      loaded: false,
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
            entitlements: profile.entitlements,
            isSuperAdmin: profile.isSuperAdmin,
            loading: false,
            loaded: true,
          });
        } catch (err) {
          set({ loading: false, loaded: true, error: err instanceof Error ? err.message : tr('admin.errorLoad') });
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
          // Refresh the access token so it includes the new tenantId for session sync
          const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
          if (res.ok) {
            const { accessToken: newToken } = await res.json() as { accessToken: string };
            const authStore = useAuthStore.getState();
            if (authStore.user) {
              authStore.setAuth(newToken, authStore.user, result.membership.tenantId);
            }
          }
        } catch (err) {
          set({ loading: false, error: err instanceof Error ? err.message : tr('admin.errorSetup') });
          throw err;
        }
      },

      createTeam: async (name, accessToken) => {
        set({ loading: true, error: null });
        try {
          const team = await adminApi.createTeam(name, accessToken);
          set((s) => ({ teams: [...s.teams, team], loading: false }));
        } catch (err) {
          set({ loading: false, error: err instanceof Error ? err.message : tr('admin.errorCreate') });
          throw err;
        }
      },

      createExternalTeam: async (name, externalClubName, accessToken) => {
        set({ loading: true, error: null });
        try {
          const team = await adminApi.createExternalTeam(name, externalClubName, accessToken);
          set((s) => ({ teams: [...s.teams, team], loading: false }));
        } catch (err) {
          set({ loading: false, error: err instanceof Error ? err.message : tr('admin.errorCreate') });
          throw err;
        }
      },

      loadMembers: async (accessToken) => {
        set({ loading: true, error: null });
        try {
          const members = await adminApi.listMembers(accessToken);
          set({ members, loading: false });
        } catch (err) {
          set({ loading: false, error: err instanceof Error ? err.message : tr('admin.errorLoad') });
        }
      },

      inviteMember: async (email, role, name, teamIds, accessToken) => {
        set({ loading: true, error: null });
        try {
          await adminApi.inviteMember(email, role, name, teamIds, accessToken);
          const members = await adminApi.listMembers(accessToken);
          set({ members, loading: false });
        } catch (err) {
          set({ loading: false, error: err instanceof Error ? err.message : tr('admin.errorInvite') });
          throw err;
        }
      },

      updateMemberName: async (membershipId, name, accessToken) => {
        set({ error: null });
        try {
          const user = await adminApi.updateMember(membershipId, name, accessToken);
          set((s) => ({
            members: s.members.map((m) =>
              m.membership.id === membershipId ? { ...m, user } : m,
            ),
          }));
        } catch (err) {
          set({ error: err instanceof Error ? err.message : tr('admin.errorUpdate') });
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
          set({ loading: false, error: err instanceof Error ? err.message : tr('admin.errorRemove') });
          throw err;
        }
      },

      assignTeamMember: async (teamId, membershipId, accessToken) => {
        set({ error: null });
        try {
          await adminApi.assignTeamMember(teamId, membershipId, accessToken);
          set((s) => ({
            members: s.members.map((m) =>
              m.membership.id === membershipId
                ? { ...m, teamIds: [...m.teamIds, teamId] }
                : m,
            ),
          }));
        } catch (err) {
          set({ error: err instanceof Error ? err.message : tr('admin.errorAssign') });
          throw err;
        }
      },

      removeTeamMember: async (teamId, membershipId, accessToken) => {
        set({ error: null });
        try {
          await adminApi.removeTeamMember(teamId, membershipId, accessToken);
          set((s) => ({
            members: s.members.map((m) =>
              m.membership.id === membershipId
                ? { ...m, teamIds: m.teamIds.filter((id) => id !== teamId) }
                : m,
            ),
          }));
        } catch (err) {
          set({ error: err instanceof Error ? err.message : tr('admin.errorRemove') });
          throw err;
        }
      },

      reset: () =>
        set({ user: null, membership: null, tenant: null, teams: [], members: [], entitlements: null, isSuperAdmin: false, loading: false, loaded: false, error: null }),
    }),
    {
      name: 'pet-admin',
      partialize: (state) => ({
        user: state.user,
        membership: state.membership,
        tenant: state.tenant,
        teams: state.teams,
        isSuperAdmin: state.isSuperAdmin,
        loaded: state.loaded,
      }),
    },
  ),
);
