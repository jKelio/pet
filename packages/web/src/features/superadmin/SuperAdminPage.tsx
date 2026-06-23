import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Trash2, Plus, UserPlus } from 'lucide-react';
import { Button } from '../../shared/components/ui/button.js';
import { Input } from '../../shared/components/ui/input.js';
import { Card, CardContent } from '../../shared/components/ui/card.js';
import { Label } from '../../shared/components/ui/label.js';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../shared/components/ui/tabs.js';
import { useAuthStore } from '../auth/stores/auth.store.js';
import { superAdminApi, type CreateTenantInput } from './api/superadmin.api.js';
import { KnowledgeLibrarySection } from './components/KnowledgeLibrarySection.js';
import { ApiClientError } from '../../shared/lib/api-client.js';
import { TENANT_PLANS, type Tenant, type TenantPlan } from '@pet/shared';

const VALID_TABS = ['tenants', 'library'] as const;
type SuperAdminTab = (typeof VALID_TABS)[number];
const DEFAULT_TAB: SuperAdminTab = 'tenants';

function readHashTab(): SuperAdminTab {
  const hash = window.location.hash.replace('#', '') as SuperAdminTab;
  return VALID_TABS.includes(hash) ? hash : DEFAULT_TAB;
}

function CreateTenantForm({ accessToken, onCreated }: { accessToken: string; onCreated: () => void }) {
  const { t } = useTranslation('pet');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateTenantInput>({ tenantName: '', teamName: '', adminEmail: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await superAdminApi.createTenant(form, accessToken);
      setForm({ tenantName: '', teamName: '', adminEmail: '' });
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('superadmin.errorCreate'));
    } finally {
      setCreating(false);
    }
  };

  if (!open) {
    return (
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t('superadmin.createTenantButton')}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleCreate} className="rounded-lg border border-border p-4 space-y-3 bg-muted/30">
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor="tenantName">{t('superadmin.clubNameLabel')}</Label>
          <Input
            id="tenantName"
            autoFocus
            placeholder={t('superadmin.clubNamePlaceholder')}
            value={form.tenantName}
            onChange={(e) => setForm((f) => ({ ...f, tenantName: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="teamName">{t('superadmin.firstTeamLabel')}</Label>
          <Input
            id="teamName"
            placeholder={t('superadmin.firstTeamPlaceholder')}
            value={form.teamName}
            onChange={(e) => setForm((f) => ({ ...f, teamName: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="adminEmail">{t('superadmin.adminEmailLabel')}</Label>
          <Input
            id="adminEmail"
            type="email"
            placeholder={t('superadmin.adminEmailPlaceholder')}
            value={form.adminEmail}
            onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))}
            required
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2 justify-end">
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          {t('superadmin.cancel')}
        </Button>
        <Button type="submit" size="sm" disabled={creating}>
          {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {t('superadmin.createTenantButton')}
        </Button>
      </div>
    </form>
  );
}

export function SuperAdminPage() {
  const { t } = useTranslation('pet');
  const accessToken = useAuthStore((s) => s.accessToken);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SuperAdminTab>(readHashTab);

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

  const handleTabChange = (value: string) => {
    const tab = value as SuperAdminTab;
    setActiveTab(tab);
    window.location.hash = tab;
  };

  const reloadTenants = async () => {
    if (!accessToken) return;
    try {
      setTenants(await superAdminApi.listTenants(accessToken));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('superadmin.errorCreate'));
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

  const handleSetPlan = async (tenantId: string, plan: TenantPlan) => {
    if (!accessToken) return;
    setError(null);
    try {
      const updated = await superAdminApi.setPlan(tenantId, plan, accessToken);
      setTenants((prev) => prev.map((tnt) => (tnt.id === tenantId ? updated : tnt)));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('superadmin.errorSetPlan'));
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
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-card">
        <h1 className="text-xl font-bold">{t('superadmin.title')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('superadmin.subtitle')}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 mb-4">{error}</p>
        )}

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="tenants">{t('superadmin.tenants')} ({tenants.length})</TabsTrigger>
            <TabsTrigger value="library">{t('library.title')}</TabsTrigger>
          </TabsList>

          <TabsContent value="tenants">
            <div className="space-y-3">
              {accessToken && <CreateTenantForm accessToken={accessToken} onCreated={reloadTenants} />}

              {tenants.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">{t('superadmin.noTenants')}</p>
              )}

              <div className="space-y-3">
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

                      {/* Plan switcher */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground mr-1">{t('superadmin.planLabel')}</span>
                        {TENANT_PLANS.map((plan) => (
                          <Button
                            key={plan}
                            size="sm"
                            variant={tenant.plan === plan ? 'default' : 'outline'}
                            className="h-7 px-2.5 text-xs capitalize"
                            onClick={() => handleSetPlan(tenant.id, plan)}
                            disabled={tenant.plan === plan}
                          >
                            {plan}
                          </Button>
                        ))}
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
          </TabsContent>

          <TabsContent value="library">
            {accessToken && <KnowledgeLibrarySection accessToken={accessToken} />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
