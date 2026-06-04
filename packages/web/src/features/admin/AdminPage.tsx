import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Users, Plus, Loader2, Trash2, UserPlus } from 'lucide-react';
import { Button } from '../../shared/components/ui/button.js';
import { Input } from '../../shared/components/ui/input.js';
import { Label } from '../../shared/components/ui/label.js';
import { Card } from '../../shared/components/ui/card.js';
import { useAuthStore } from '../auth/stores/auth.store.js';
import { useAdminStore } from './stores/admin.store.js';
import type { UserRole } from '@pet/shared';

const ROLE_KEYS: UserRole[] = ['club_admin', 'coach', 'assistant', 'analyst', 'viewer'];

function OnboardingForm({ accessToken }: { accessToken: string }) {
  const { t } = useTranslation('pet');
  const [tenantName, setTenantName] = useState('');
  const [teamName, setTeamName] = useState('');
  const { onboard, loading, error } = useAdminStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantName.trim() || !teamName.trim()) return;
    await onboard(tenantName.trim(), teamName.trim(), accessToken);
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
  const [open, setOpen] = useState(false);
  const { createTeam, loading } = useAdminStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createTeam(name.trim(), accessToken);
    setName('');
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
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('admin.teamNamePlaceholder')}
        className="h-9"
      />
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
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('coach');
  const [open, setOpen] = useState(false);
  const { inviteMember, loading } = useAdminStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    await inviteMember(email.trim(), role, accessToken);
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
        <Label htmlFor="inviteEmail" className="text-xs">{t('admin.emailLabel')}</Label>
        <Input
          id="inviteEmail"
          autoFocus
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

export function AdminPage() {
  const { t } = useTranslation('pet');
  const accessToken = useAuthStore((s) => s.accessToken);
  const { tenant, membership, teams, members, loading, error, loadProfile, loadMembers, removeMember } =
    useAdminStore();

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

  const isAdmin = membership.role === 'club_admin';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-card">
        <h1 className="text-xl font-bold">{t('admin.teamManagement')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{tenant.name}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Card className="p-4 space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{t('admin.club')}</p>
          <p className="font-medium">{tenant.name}</p>
          <p className="text-sm text-muted-foreground capitalize">{tenant.plan}</p>
        </Card>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {t('admin.teams')} ({teams.length})
            </h2>
            {isAdmin && <CreateTeamForm accessToken={accessToken} />}
          </div>

          {teams.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t('admin.noTeams')}
            </p>
          )}

          <div className="space-y-2">
            {teams.map((team) => (
              <div
                key={team.id}
                className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-3"
              >
                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium">{team.name}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
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
            {members.map(({ membership: m, user }) => (
              <div
                key={m.id}
                className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-3"
              >
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
                {isAdmin && m.userId !== membership.userId && (
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
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
