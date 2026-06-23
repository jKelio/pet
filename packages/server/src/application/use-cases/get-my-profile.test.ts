import { describe, test, expect, mock } from 'bun:test';
import { GetMyProfileUseCase } from './get-my-profile.js';
import type {
  UserRepository,
  TenantRepository,
  TeamRepository,
  MembershipRepository,
} from '../../domain/ports/user.repository.js';
import type { EntitlementService } from '../services/entitlement.service.js';
import type { Team, UserRole } from '@pet/shared';

function team(id: string, kind: 'own' | 'external'): Team {
  return {
    id,
    tenantId: 'tenant-1',
    name: id,
    kind,
    externalClubName: kind === 'external' ? 'EHC Rival' : null,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

const ALL_TEAMS = [team('own-1', 'own'), team('own-2', 'own'), team('ext-1', 'external'), team('ext-2', 'external')];

function makeUseCase(opts: { role: UserRole; assignedIds: string[] }) {
  const userRepository = {
    findById: mock(async () => ({ id: 'user-1', email: 'coach@test.com', name: 'Coach' })),
  } as unknown as UserRepository;
  const tenantRepository = {
    findById: mock(async () => ({ id: 'tenant-1', name: 'Federation', plan: 'premium' })),
  } as unknown as TenantRepository;
  const teamRepository = {
    findByTenant: mock(async () => ALL_TEAMS),
  } as unknown as TeamRepository;
  const membershipRepository = {
    findByUserAndTenant: mock(async () => ({ id: 'mem-1', userId: 'user-1', tenantId: 'tenant-1', role: opts.role })),
    getTeamIds: mock(async () => opts.assignedIds),
  } as unknown as MembershipRepository;
  const entitlementService = {
    getSnapshot: mock(async () => null),
  } as unknown as EntitlementService;

  return new GetMyProfileUseCase({
    userRepository,
    tenantRepository,
    teamRepository,
    membershipRepository,
    entitlementService,
    superAdminEmails: [],
  });
}

describe('GetMyProfileUseCase', () => {
  test('coach sees assigned own Teams plus EVERY External Team (open roster)', async () => {
    const useCase = makeUseCase({ role: 'coach', assignedIds: ['own-1'] });

    const { teams } = await useCase.execute('user-1', 'tenant-1');
    const ids = teams.map((t) => t.id).sort();

    // assigned own team + both external teams, but NOT the unassigned own-2
    expect(ids).toEqual(['ext-1', 'ext-2', 'own-1']);
  });

  test('analyst with no roster still sees all External Teams', async () => {
    const useCase = makeUseCase({ role: 'analyst', assignedIds: [] });

    const { teams } = await useCase.execute('user-1', 'tenant-1');

    expect(teams.map((t) => t.id).sort()).toEqual(['ext-1', 'ext-2']);
  });

  test('club_admin sees all teams', async () => {
    const useCase = makeUseCase({ role: 'club_admin', assignedIds: [] });

    const { teams } = await useCase.execute('user-1', 'tenant-1');

    expect(teams).toHaveLength(4);
  });
});
