import type { UserRole } from './types.js';

// ─── Permission Definitions ───────────────────────────────────────────────────

export type Permission =
  | 'users:manage'
  | 'roles:manage'
  | 'teams:manage'
  | 'sessions:create'
  | 'sessions:track'
  | 'sessions:view:own_team'
  | 'sessions:view:all'
  | 'sessions:delete:own'
  | 'sessions:delete:any'
  | 'reports:export'
  | 'club:settings';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  club_admin: [
    'users:manage',
    'roles:manage',
    'teams:manage',
    'sessions:create',
    'sessions:track',
    'sessions:view:own_team',
    'sessions:view:all',
    'sessions:delete:own',
    'sessions:delete:any',
    'reports:export',
    'club:settings',
  ],
  coach: [
    'sessions:create',
    'sessions:track',
    'sessions:view:own_team',
    'sessions:delete:own',
    'reports:export',
  ],
  assistant: [
    'sessions:track',
    'sessions:view:own_team',
  ],
  analyst: [
    'sessions:view:all',
    'reports:export',
  ],
  viewer: [
    'sessions:view:own_team',
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function getPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function canManageUsers(role: UserRole): boolean {
  return hasPermission(role, 'users:manage');
}

export function canCreateSession(role: UserRole): boolean {
  return hasPermission(role, 'sessions:create');
}

export function canTrackSession(role: UserRole): boolean {
  return hasPermission(role, 'sessions:track');
}

export function canViewAllSessions(role: UserRole): boolean {
  return hasPermission(role, 'sessions:view:all');
}

export function canExportReports(role: UserRole): boolean {
  return hasPermission(role, 'reports:export');
}

export function canDeleteSession(role: UserRole, isOwner: boolean): boolean {
  if (hasPermission(role, 'sessions:delete:any')) return true;
  return isOwner && hasPermission(role, 'sessions:delete:own');
}
