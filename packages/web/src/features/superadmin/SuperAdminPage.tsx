import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Trash2, Plus, UserPlus } from 'lucide-react';
import { Button } from '../../shared/components/ui/button.js';
import { Input } from '../../shared/components/ui/input.js';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/components/ui/card.js';
import { Label } from '../../shared/components/ui/label.js';
import { useAuthStore } from '../auth/stores/auth.store.js';
import { superAdminApi, type CreateTenantInput } from './api/superadmin.api.js';
import { ApiClientError } from '../../shared/lib/api-client.js';
import type { Tenant } from '@pet/shared';

export function SuperAdminPage() {
  const { t } = useTranslation('pet');
  const accessToken = useAuthStore((s) => s.accessToken);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create tenant form
  const [createForm, setCreateForm] = useState<CreateTenantInput>({ tenantName: '', teamName: '', adminEmail: '' });
  const [creating, setCreating] = useState(false);

  // Add admin: keyed by tenantId
  const [addAdminEmail, setAddAdminEmail] = useState<Record<string, string>>({});
  const [addAdminLoading, setAddAdminLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!accessToken) return;
    superAdminApi.listTenants(accessToken)
      .then(setTenants)
      .catch((err) => {
        if (err instanceof ApiClientError && err.statusCode === 403) setForbidden(true);
        else setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [accessToken]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setCreating(true);
    setError(null);
    try {
      await superAdminApi.createTenant(createForm, accessToken);
      setCreateForm({ tenantName: '', teamName: '', adminEmail: '' });
      const updated = await superAdminApi.listTenants(accessToken);
      setTenants(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('superadmin.errorCreate'));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (tenantId: string) => {
    if (!accessToken || !confirm(t('superadmin.confirmDelete'))) return;
    try {
      await superAdminApi.deleteTenant(tenantId, accessToken);
      setTenants((prev) => prev.filter((tnt) => tnt.id !== tenantId));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('superadmin.errorDelete'));
    }
  };

  const handleAddAdmin = async (tenantId: string) => {
    const email = addAdminEmail[tenantId]?.trim();
    if (!accessToken || !email) return;
    setAddAdminLoading((prev) => ({ ...prev, [tenantId]: true }));
    setError(null);
    try {
      await superAdminApi.addClubAdmin(tenantId, email, accessToken);
      setAddAdminEmail((prev) => ({ ...prev, [tenantId]: '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('superadmin.errorAdd'));
    } finally {
      setAddAdminLoading((prev) => ({ ...prev, [tenantId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">{t('superadmin.forbidden')}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold">{t('superadmin.title')}</h1>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
      )}

      {/* Create tenant */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('superadmin.createTenant')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="tenantName">{t('superadmin.clubNameLabel')}</Label>
              <Input
                id="tenantName"
                placeholder={t('superadmin.clubNamePlaceholder')}
                value={createForm.tenantName}
                onChange={(e) => setCreateForm((f) => ({ ...f, tenantName: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="teamName">{t('superadmin.firstTeamLabel')}</Label>
              <Input
                id="teamName"
                placeholder={t('superadmin.firstTeamPlaceholder')}
                value={createForm.teamName}
                onChange={(e) => setCreateForm((f) => ({ ...f, teamName: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="adminEmail">{t('superadmin.adminEmailLabel')}</Label>
              <Input
                id="adminEmail"
                type="email"
                placeholder={t('superadmin.adminEmailPlaceholder')}
                value={createForm.adminEmail}
                onChange={(e) => setCreateForm((f) => ({ ...f, adminEmail: e.target.value }))}
                required
              />
            </div>
            <div className="sm:col-span-3">
              <Button type="submit" disabled={creating} size="sm">
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                {t('superadmin.createTenantButton')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tenant list */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t('superadmin.tenants')} ({tenants.length})
        </h2>
        {tenants.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('superadmin.noTenants')}</p>
        )}
        {tenants.map((tenant) => (
          <Card key={tenant.id}>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{tenant.name}</p>
                  <p className="text-xs text-muted-foreground">{tenant.slug} · {tenant.plan}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(tenant.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Add club admin */}
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder={t('superadmin.addAdminPlaceholder')}
                  className="text-sm h-8"
                  value={addAdminEmail[tenant.id] ?? ''}
                  onChange={(e) => setAddAdminEmail((prev) => ({ ...prev, [tenant.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddAdmin(tenant.id)}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2"
                  disabled={addAdminLoading[tenant.id]}
                  onClick={() => handleAddAdmin(tenant.id)}
                >
                  {addAdminLoading[tenant.id]
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <UserPlus className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
