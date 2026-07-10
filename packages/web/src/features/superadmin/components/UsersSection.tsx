import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Users } from 'lucide-react';
import type { SuperAdminUserDto } from '@pet/shared';
import { Button } from '../../../shared/components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card.js';
import { superAdminApi } from '../api/superadmin.api.js';

interface UsersSectionProps {
  accessToken: string;
  users: SuperAdminUserDto[];
  onUsersChange: (updater: (prev: SuperAdminUserDto[]) => SuperAdminUserDto[]) => void;
}

export function UsersSection({ accessToken, users, onUsersChange }: UsersSectionProps) {
  const { t } = useTranslation('pet');
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(user: SuperAdminUserDto) {
    if (!window.confirm(t('superadmin.confirmDeleteUser', { email: user.email }))) return;
    setError(null);
    try {
      await superAdminApi.deleteUser(user.id, accessToken);
      onUsersChange((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('superadmin.errorDeleteUser'));
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base flex items-center gap-1.5 min-w-0">
          <Users className="h-4 w-4 shrink-0" />
          {t('superadmin.usersTitle')} ({users.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {users.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">{t('superadmin.noUsers')}</p>
        )}

        {users.map((user) => (
          <div key={user.id} className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{user.name || user.email}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive shrink-0"
                onClick={() => handleDelete(user)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {user.tenants.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {user.tenants.map((membership) => (
                  <span
                    key={membership.tenantId}
                    className="text-xs rounded-full bg-muted px-2 py-0.5 text-muted-foreground"
                  >
                    {membership.tenantName} · {membership.role}
                  </span>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {t('superadmin.usersLastLogin')}:{' '}
              {user.lastLoginAt
                ? new Date(user.lastLoginAt).toLocaleDateString()
                : t('superadmin.usersNeverLoggedIn')}
              {' · '}
              {t('superadmin.usersCreated')}: {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
