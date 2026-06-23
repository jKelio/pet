import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Users, Plus, Loader2, Trash2, UserPlus, X, Pencil, Check, Globe } from 'lucide-react';
import { Button } from '../../shared/components/ui/button.js';
import { Input } from '../../shared/components/ui/input.js';
import { Label } from '../../shared/components/ui/label.js';
import { Card } from '../../shared/components/ui/card.js';
import { useAuthStore } from '../auth/stores/auth.store.js';
import { useAdminStore } from './stores/admin.store.js';
import type { UserRole } from '@pet/shared';
import type { MemberWithUser } from './api/admin.api.js';

const ROLE_KEYS: UserRole[] = ['admin', 'member'];

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

function CreateExternalTeamForm({ accessToken }: { accessToken: string }) {
  const { t } = useTranslation('pet');
  const [name, setName] = useState('');
  const [clubName, setClubName] = useState('');
  const [open, setOpen] = useState(false);
  const { createExternalTeam, loading } = useAdminStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !clubName.trim()) return;
    await createExternalTeam(name.trim(), clubName.trim(), accessToken);
    setName('');
    setClubName('');
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

export function AdminPage() {
  const { t } = useTranslation('pet');
  const accessToken = useAuthStore((s) => s.accessToken);
  const { tenant, membership, teams, members, loading, error, loadProfile, loadMembers, entitlements } =
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

  const isAdmin = membership.role === 'admin';
  const ownTeams = teams.filter((t) => t.kind === 'own');
  const externalTeams = teams.filter((t) => t.kind === 'external');
  const canUseExternalTeams = entitlements?.externalTeams.allowed ?? false;

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
              {t('admin.teams')} ({ownTeams.length})
            </h2>
            {isAdmin && <CreateTeamForm accessToken={accessToken} />}
          </div>

          {ownTeams.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t('admin.noTeams')}
            </p>
          )}

          <div className="space-y-2">
            {ownTeams.map((team) => (
              <div key={team.id} className="rounded-lg border border-border bg-card px-4 py-3">
                <span className="font-medium text-sm">{team.name}</span>
              </div>
            ))}
          </div>
        </section>

        {(canUseExternalTeams || externalTeams.length > 0) && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="h-4 w-4" />
                {t('admin.externalTeams')} ({externalTeams.length})
              </h2>
              {isAdmin && canUseExternalTeams && <CreateExternalTeamForm accessToken={accessToken} />}
            </div>

            {externalTeams.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t('admin.noExternalTeams')}
              </p>
            )}

            <div className="space-y-2">
              {externalTeams.map((team) => (
                <div key={team.id} className="rounded-lg border border-border bg-card px-4 py-3">
                  <span className="font-medium text-sm">{team.name}</span>
                  {team.externalClubName && (
                    <span className="block text-xs text-muted-foreground">{team.externalClubName}</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

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
        </section>
      </div>
    </div>
  );
}
