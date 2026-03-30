import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@pet/shared';

interface AuthState {
  accessToken: string | null;
  user: User | null;
  tenantId: string | null;
  isAuthenticated: boolean;
  setAuth: (accessToken: string, user: User, tenantId?: string) => void;
  clearAuth: () => void;
  setTenantId: (tenantId: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      tenantId: null,
      isAuthenticated: false,

      setAuth: (accessToken, user, tenantId) =>
        set({ accessToken, user, tenantId: tenantId ?? null, isAuthenticated: true }),

      clearAuth: () =>
        set({ accessToken: null, user: null, tenantId: null, isAuthenticated: false }),

      setTenantId: (tenantId) => set({ tenantId }),
    }),
    {
      name: 'pet-auth',
      // Only persist the token and user — not action functions
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        tenantId: state.tenantId,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
