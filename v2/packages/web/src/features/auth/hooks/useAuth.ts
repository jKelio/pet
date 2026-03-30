import { useAuthStore } from '../stores/auth.store.js';
import { authApi } from '../api/auth.api.js';
import type { Permission } from '@pet/shared';
import { hasPermission } from '@pet/shared';

export function useAuth() {
  const { user, accessToken, tenantId, isAuthenticated, setAuth, clearAuth } = useAuthStore();

  const role = useAuthStore((s) => s.user as any)?.role;

  const can = (permission: Permission): boolean => {
    if (!role) return false;
    return hasPermission(role, permission);
  };

  const logout = async () => {
    await authApi.logout().catch(() => {});
    clearAuth();
  };

  return {
    user,
    accessToken,
    tenantId,
    isAuthenticated,
    can,
    logout,
    setAuth,
  };
}
