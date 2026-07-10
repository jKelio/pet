import { describe, test, expect, mock } from 'bun:test';
import { SuperAdminListUsersUseCase } from './superadmin-list-users.js';
import type {
  UserRepository,
  MembershipRepository,
  TenantRepository,
} from '../../domain/ports/user.repository.js';
import type { User, Membership, Tenant } from '@pet/shared';

type UserRow = User & { lastLoginAt: string | null };

const USERS: UserRow[] = [
  {
    id: 'user-1',
    email: 'coach@test.com',
    name: 'Coach One',
    createdAt: '2026-01-01T10:00:00.000Z',
    lastLoginAt: '2026-06-01T08:00:00.000Z',
  },
  {
    id: 'user-2',
    email: 'lonely@test.com',
    name: 'No Club',
    createdAt: '2026-02-01T10:00:00.000Z',
    lastLoginAt: null,
  },
];

const MEMBERSHIPS: Membership[] = [
  { id: 'mem-1', userId: 'user-1', tenantId: 'tenant-1', role: 'admin' },
  { id: 'mem-2', userId: 'user-1', tenantId: 'tenant-missing', role: 'member' },
];

const TENANTS: Tenant[] = [
  { id: 'tenant-1', name: 'EHC Test', slug: 'ehc-test', plan: 'free', createdAt: '2026-01-01T00:00:00.000Z' } as Tenant,
];

function makeUseCase(users: UserRow[], memberships: Membership[], tenants: Tenant[]) {
  return new SuperAdminListUsersUseCase({
    userRepository: { findAll: mock(async () => users) } as unknown as UserRepository,
    membershipRepository: { findAll: mock(async () => memberships) } as unknown as MembershipRepository,
    tenantRepository: { findAll: mock(async () => tenants) } as unknown as TenantRepository,
  });
}

describe('SuperAdminListUsersUseCase', () => {
  test('enriches users with their tenant names and roles', async () => {
    const result = await makeUseCase(USERS, MEMBERSHIPS, TENANTS).execute();

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('user-1');
    expect(result[0].lastLoginAt).toBe('2026-06-01T08:00:00.000Z');
    expect(result[0].tenants).toContainEqual({ tenantId: 'tenant-1', tenantName: 'EHC Test', role: 'admin' });
  });

  test('returns an empty tenants array for users without memberships', async () => {
    const result = await makeUseCase(USERS, MEMBERSHIPS, TENANTS).execute();

    const lonely = result.find((u) => u.id === 'user-2');
    expect(lonely?.tenants).toEqual([]);
    expect(lonely?.lastLoginAt).toBeNull();
  });

  test('falls back to an empty tenant name when the tenant row is missing', async () => {
    const result = await makeUseCase(USERS, MEMBERSHIPS, TENANTS).execute();

    const orphaned = result[0].tenants.find((m) => m.tenantId === 'tenant-missing');
    expect(orphaned).toEqual({ tenantId: 'tenant-missing', tenantName: '', role: 'member' });
  });
});
