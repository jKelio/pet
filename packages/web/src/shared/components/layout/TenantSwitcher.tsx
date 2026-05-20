import { useEffect, useState } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { Button } from '../ui/button.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu.js';
import { authApi } from '../../../features/auth/api/auth.api.js';
import { useAuthStore } from '../../../features/auth/stores/auth.store.js';
import { useAdminStore } from '../../../features/admin/stores/admin.store.js';
import type { TenantMembership } from '@pet/shared';

export function TenantSwitcher() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const setAuth = useAuthStore((s) => s.setAuth);
  const user = useAuthStore((s) => s.user);
  const currentTenantId = useAuthStore((s) => s.tenantId);
  const loadProfile = useAdminStore((s) => s.loadProfile);
  const resetAdmin = useAdminStore((s) => s.reset);
  const currentTenantName = useAdminStore((s) => s.tenant?.name);

  const [tenants, setTenants] = useState<TenantMembership[]>([]);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    authApi.getMyTenants(accessToken)
      .then((result) => { if (!cancelled) setTenants(result); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [accessToken]);

  if (tenants.length <= 1) return null;

  const handleSwitch = async (tenantId: string) => {
    if (!accessToken || !user || tenantId === currentTenantId) return;
    try {
      const { accessToken: newToken } = await authApi.switchTenant(tenantId, accessToken);
      setAuth(newToken, user, tenantId);
      resetAdmin();
      loadProfile(newToken);
    } catch {
      // silent — user stays on current tenant
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between gap-2 px-3 text-sm font-medium truncate"
        >
          <span className="truncate">{currentTenantName ?? '—'}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {tenants.map((t) => (
          <DropdownMenuItem
            key={t.tenantId}
            onSelect={() => handleSwitch(t.tenantId)}
            className={t.tenantId === currentTenantId ? 'font-semibold' : ''}
          >
            {t.tenantName}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
