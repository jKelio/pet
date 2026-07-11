import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Users, Plus, Loader2, Trash2, UserPlus, X, Pencil, Check, Infinity, Lock } from 'lucide-react';
import { Button } from '../../shared/components/ui/button.js';
import { Input } from '../../shared/components/ui/input.js';
import { Label } from '../../shared/components/ui/label.js';
import { Card } from '../../shared/components/ui/card.js';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../shared/components/ui/tabs.js';
import { useAuthStore } from '../auth/stores/auth.store.js';
import { useAdminStore } from './stores/admin.store.js';
import type { TenantPlan, UserRole, FeatureEntitlement } from '@pet/shared';
import type { MemberWithUser } from './api/admin.api.js';

const ROLE_KEYS: UserRole[] = ['admin', 'member'];

const VALID_TABS = ['teams', 'members', 'plan'] as const;
type AdminTab = (typeof VALID_TABS)[number];
const DEFAULT_TAB: AdminTab = 'teams';

function readHashTab(): AdminTab {
  const hash = window.location.hash.replace('#', '') as AdminTab;
  return VALID_TABS.includes(hash) ? hash : DEFAULT_TAB;
}

const PLAN_BADGE_CLASSES: Record<TenantPlan, string> = {
  free: 'bg-muted text-muted-foreground',
  pro: 'bg-primary/10 text-primary',
  premium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

function PlanBadge({ plan }: { plan: TenantPlan }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PLAN_BADGE_CLASSES[plan]}`}>
      {plan}
    </span>
  );
}

function OnboardingForm({ accessToken }: { accessToken: string }) {
  const { t } = useTranslation('pet');
  const [tenantName, setTenantName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [ageClass, setAgeClass] = useState('');
  const { onboard, loading, error } = useAdminStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const age = parseInt(ageClass, 10);
    if (!tenantName.trim() || !teamName.trim() || !ageClass || age < 7 || age > 21) return;
    await onboard(tenantName.trim(), teamName.trim(), age, accessToken);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <Building2 className="h-10 w-10 mx-auto text-primary" />
          <h2 className="text-xl font-bold">{t('admin.setupClubTitle')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('admin.setupClubDescription')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tenantName">{t('admin.clubNameLabel')}</Label>
            <Input
              id="tenantName"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder={t('admin.clubNamePlaceholder')}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="teamName">{t('admin.firstTeamLabel')}</Label>
            <Input
              id="teamName"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder={t('admin.firstTeamPlaceholder')}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="onboardAgeClass">{t('admin.ageClassLabel')}</Label>
            <Input
              id="onboardAgeClass"
              type="number"
              min={7}
              max={21}
              value={ageClass}
              onChange={(e) => setAgeClass(e.target.value)}
              placeholder={t('admin.ageClassPlaceholder')}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('admin.createClub')}
          </Button>
        </form>
      </div>
    </div>
  );
}

function CreateTeamForm({ accessToken }: { accessToken: string }) {
  const { t } = useTranslation('pet');
  const [name, setName] = useState('');
  const [ageClass, setAgeClass] = useState('');
  const [open, setOpen] = useState(false);
  const { createTeam, loading } = useAdminStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const age = parseInt(ageClass, 10);
    if (!name.trim() || !ageClass || age < 7 || age > 21) return;
    await createTeam(name.trim(), age, accessToken);
    setName('');
    setAgeClass('');
    setOpen(false);
  };

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1.5 h-4 w-4" />
        {t('admin.addTeam')}
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end">
      <div className="space-y-1">
        <Label htmlFor="ageClass" className="text-xs">{t('admin.ageClassLabel')}</Label>
        <Input
          id="ageClass"
          autoFocus
          type="number"
          min={7}
          max={21}
          value={ageClass}
          onChange={(e) => setAgeClass(e.target.value)}
          placeholder={t('admin.ageClassPlaceholder')}
          className="h-9 w-24"
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="teamNameOwn" className="text-xs">{t('admin.teamNameLabel')}</Label>
        <Input
          id="teamNameOwn"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('admin.teamNamePlaceholder')}
          className="h-9 w-36"
          required
        />
      </div>
      <Button type="submit" size="sm" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('admin.create')}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
        {t('admin.cancel')}
      </Button>
    </form>
  );
}

function CreateExternalTeamForm({ accessToken }: { accessToken: string }) {
  const { t } = useTranslation('pet');
  const [name, setName] = useState('');
  const [clubName, setClubName] = useState('');
  const [ageClass, setAgeClass] = useState('');
  const [open, setOpen] = useState(false);
  const { createExternalTeam, loading } = useAdminStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const age = parseInt(ageClass, 10);
    if (!name.trim() || !clubName.trim() || !ageClass || age < 7 || age > 21) return;
    await createExternalTeam(name.trim(), clubName.trim(), age, accessToken);
    setName('');
    setClubName('');
    setAgeClass('');
    setOpen(false);
  };

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1.5 h-4 w-4" />
        {t('admin.addExternalTeam')}
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end">
      <div className="space-y-1">
        <Label htmlFor="extClubName" className="text-xs">{t('admin.externalClubNameLabel')}</Label>
        <Input
          id="extClubName"
          autoFocus
          value={clubName}
          onChange={(e) => setClubName(e.target.value)}
          placeholder={t('admin.externalClubNamePlaceholder')}
          className="h-9 w-44"
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="extAgeClass" className="text-xs">{t('admin.ageClassLabel')}</Label>
        <Input
          id="extAgeClass"
          type="number"
          min={7}
          max={21}
          value={ageClass}
          onChange={(e) => setAgeClass(e.target.value)}
          placeholder={t('admin.ageClassPlaceholder')}
          className="h-9 w-24"
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="extTeamName" className="text-xs">{t('admin.teamNameLabel')}</Label>
        <Input
          id="extTeamName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('admin.teamNamePlaceholder')}
          className="h-9 w-32"
          required
        />
      </div>
      <Button type="submit" size="sm" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('admin.create')}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
        {t('admin.cancel')}
      </Button>
    </form>
  );
}

function InviteMemberForm({ accessToken }: { accessToken: string }) {
  const { t } = useTranslation('pet');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [open, setOpen] = useState(false);
  const { inviteMember, loading } = useAdminStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    await inviteMember(email.trim(), role, name.trim() || undefined, accessToken);
    setName('');
    setEmail('');
    setOpen(false);
  };

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <UserPlus className="mr-1.5 h-4 w-4" />
        {t('admin.inviteMember')}
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end">
      <div className="space-y-1">
        <Label htmlFor="inviteName" className="text-xs">{t('admin.nameLabel')}</Label>
        <Input
          id="inviteName"
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('admin.namePlaceholder')}
          className="h-9 w-40"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="inviteEmail" className="text-xs">{t('admin.emailLabel')}</Label>
        <Input
          id="inviteEmail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          className="h-9 w-52"
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="inviteRole" className="text-xs">{t('admin.roleLabel')}</Label>
        <select
          id="inviteRole"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {ROLE_KEYS.map((r) => (
            <option key={r} value={r}>{t(`roles.${r}`)}</option>
          ))}
        </select>
      </div>
      <Button type="submit" size="sm" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('admin.invite')}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
        {t('admin.cancel')}
      </Button>
    </form>
  );
}

function MemberRow({
  member,
  isAdmin,
  isSelf,
  accessToken,
}: {
  member: MemberWithUser;
  isAdmin: boolean;
  isSelf: boolean;
  accessToken: string;
}) {
  const { t } = useTranslation('pet');
  const { updateMemberName, removeMember } = useAdminStore();
  const { membership: m, user } = member;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setName(user.name);
    setEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateMemberName(m.id, name.trim(), accessToken);
      setEditing(false);
    } catch {
      // error surfaced via store; keep the form open so the edit isn't lost
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <form
        onSubmit={handleSave}
        className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-2"
      >
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('admin.namePlaceholder')}
          className="h-9 flex-1"
        />
        <Button type="submit" size="icon" variant="ghost" className="shrink-0" disabled={saving} title={t('admin.save')}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="shrink-0"
          onClick={() => setEditing(false)}
          title={t('admin.cancel')}
        >
          <X className="h-4 w-4" />
        </Button>
      </form>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">
          {user.name || user.email}
        </p>
        {user.name && (
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        )}
      </div>
      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
        {t(`roles.${m.role}`)}
      </span>
      {isAdmin && (
        <Button
          size="icon"
          variant="ghost"
          className="shrink-0"
          onClick={startEdit}
          title={t('admin.editName')}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      {isAdmin && !isSelf && (
        <Button
          size="icon"
          variant="ghost"
          className="text-destructive hover:text-destructive shrink-0"
          onClick={() => removeMember(m.id, accessToken)}
          title={t('admin.removeMember')}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

function QuotaRow({ label, entitlement }: { label: string; entitlement: FeatureEntitlement }) {
  const { t } = useTranslation('pet');
  const { limit, used } = entitlement;

  if (limit === null) {
    return (
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <Infinity className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  if (limit === 0) {
    return (
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          {t('admin.disabled')}
        </span>
      </div>
    );
  }

  const pct = Math.min(100, (used / limit) * 100);
  const nearLimit = pct >= 80;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{used} / {limit}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${nearLimit ? 'bg-destructive' : 'bg-primary'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function BooleanRow({ label, allowed }: { label: string; allowed: boolean }) {
  const { t } = useTranslation('pet');
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`text-xs px-2 py-0.5 rounded-full ${
          allowed ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
        }`}
      >
        {allowed ? t('admin.included') : t('admin.notIncluded')}
      </span>
    </div>
  );
}

function PlanUsageCard() {
  const { t } = useTranslation('pet');
  const entitlements = useAdminStore((s) => s.entitlements);

  if (!entitlements) return null;

  const { seats, teams, sync, pdf, ai, externalTeams } = entitlements;

  return (
    <Card className="p-4 space-y-3">
      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
        {t('admin.planUsage')}
      </p>
      <QuotaRow label={t('admin.seats')} entitlement={seats} />
      <QuotaRow label={t('admin.teams')} entitlement={teams} />
      <QuotaRow label={t('admin.syncThisMonth')} entitlement={sync} />
      <QuotaRow label={t('admin.pdfThisMonth')} entitlement={pdf} />
      <BooleanRow label={t('admin.aiRecommendations')} allowed={ai.allowed} />
      <BooleanRow label={t('admin.externalTeams')} allowed={externalTeams.allowed} />
    </Card>
  );
}

function DeleteTeamButton({ teamId, accessToken }: { teamId: string; accessToken: string }) {
  const { t } = useTranslation('pet');
  const deleteTeam = useAdminStore((s) => s.deleteTeam);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(t('admin.confirmDeleteTeam'))) return;
    setDeleting(true);
    try {
      await deleteTeam(teamId, accessToken);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Button
      size="icon"
      variant="ghost"
      className="text-destructive hover:text-destructive shrink-0 ml-auto"
      onClick={handleDelete}
      disabled={deleting}
      title={t('admin.deleteTeam')}
    >
      {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </Button>
  );
}

export function AdminPage() {
  const { t } = useTranslation('pet');
  const accessToken = useAuthStore((s) => s.accessToken);
  const { tenant, membership, teams, members, loading, error, loadProfile, loadMembers, entitlements } =
    useAdminStore();

  const [activeTab, setActiveTab] = useState<AdminTab>(readHashTab);

  const handleTabChange = (value: string) => {
    const tab = value as AdminTab;
    setActiveTab(tab);
    window.location.hash = tab;
  };

  useEffect(() => {
    if (accessToken) {
      loadProfile(accessToken);
    }
  }, [accessToken, loadProfile]);

  useEffect(() => {
    if (accessToken && membership) {
      loadMembers(accessToken);
    }
  }, [accessToken, membership, loadMembers]);

  if (!accessToken) return null;

  if (loading && !tenant) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!membership || !tenant) {
    return <OnboardingForm accessToken={accessToken} />;
  }

  const isAdmin = membership.role === 'admin';
  const ownTeams = teams.filter((t) => t.kind === 'own');
  const externalTeams = teams.filter((t) => t.kind === 'external');
  const canUseExternalTeams = entitlements?.externalTeams.allowed ?? false;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-card">
        <h1 className="text-xl font-bold">{t('admin.administration')}</h1>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-sm text-muted-foreground">{tenant.name}</p>
          <PlanBadge plan={tenant.plan} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <p className="text-sm text-destructive mb-4">{error}</p>
        )}

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="teams">{t('admin.teams')}</TabsTrigger>
            <TabsTrigger value="members">{t('admin.members')}</TabsTrigger>
            <TabsTrigger value="plan">{t('admin.plan')}</TabsTrigger>
          </TabsList>

          <TabsContent value="teams">
            <Tabs defaultValue="own">
              <TabsList>
                <TabsTrigger value="own">{t('admin.ownTeamsTab')} ({ownTeams.length})</TabsTrigger>
                <TabsTrigger value="external">{t('admin.externalTeamsTab')} ({externalTeams.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="own">
                <div className="space-y-3">
                  {isAdmin && (
                    <div className="flex justify-end">
                      <CreateTeamForm accessToken={accessToken} />
                    </div>
                  )}

                  {ownTeams.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {t('admin.noTeams')}
                    </p>
                  )}

                  <div className="space-y-2">
                    {ownTeams.map((team) => (
                      <div key={team.id} className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-2">
                        {team.ageClass != null ? (
                          <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                            U{team.ageClass}
                          </span>
                        ) : (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shrink-0">
                            {t('admin.ageClassMissing')}
                          </span>
                        )}
                        <span className="font-medium text-sm">{team.name}</span>
                        {isAdmin && <DeleteTeamButton teamId={team.id} accessToken={accessToken} />}
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="external">
                {!canUseExternalTeams && externalTeams.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Lock className="h-4 w-4 shrink-0" />
                    <span>{t('admin.externalTeamsLockedNote')}</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {isAdmin && canUseExternalTeams && (
                      <div className="flex justify-end">
                        <CreateExternalTeamForm accessToken={accessToken} />
                      </div>
                    )}

                    {externalTeams.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        {t('admin.noExternalTeams')}
                      </p>
                    )}

                    <div className="space-y-2">
                      {externalTeams.map((team) => (
                        <div key={team.id} className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-2">
                          {team.ageClass != null ? (
                            <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                              U{team.ageClass}
                            </span>
                          ) : (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shrink-0">
                              {t('admin.ageClassMissing')}
                            </span>
                          )}
                          <div className="min-w-0">
                            <span className="font-medium text-sm">{team.name}</span>
                            {team.externalClubName && (
                              <span className="block text-xs text-muted-foreground">{team.externalClubName}</span>
                            )}
                          </div>
                          {isAdmin && <DeleteTeamButton teamId={team.id} accessToken={accessToken} />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="members">
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {t('admin.members')} ({members.length})
                </h2>
                {isAdmin && <InviteMemberForm accessToken={accessToken} />}
              </div>

              {members.length === 0 && !loading && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {t('admin.noMembers')}
                </p>
              )}

              <div className="space-y-2">
                {members.map((member) => (
                  <MemberRow
                    key={member.membership.id}
                    member={member}
                    isAdmin={isAdmin}
                    isSelf={member.membership.userId === membership.userId}
                    accessToken={accessToken}
                  />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="plan">
            <PlanUsageCard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
