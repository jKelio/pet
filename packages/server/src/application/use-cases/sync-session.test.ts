import { describe, test, expect, mock } from 'bun:test';
import { SyncSessionUseCase, UnauthorizedError } from './sync-session.js';
import { UpgradeRequiredError, type EntitlementService } from '../services/entitlement.service.js';
import type { SessionRepository } from '../../domain/ports/session.repository.js';
import type { MembershipRepository, TeamRepository } from '../../domain/ports/user.repository.js';
import type { SyncSessionInput, UserRole } from '@pet/shared';

const SESSION_INPUT: SyncSessionInput = {
  id: 'session-1',
  teamId: 'team-1',
  practiceInfo: {
    clubName: 'EHC Test',
    teamName: 'U16 A',
    date: '2026-01-01',
    coachName: 'Test',
    athletesNumber: 20,
    coachesNumber: 2,
    totalTime: 60,
    trackedPlayerName: '',
    drillsNumber: 3,
    wasteTime: { totalTime: 0, timeSegments: [] },
  },
  drills: [],
};

const CTX = { userId: 'user-1', tenantId: 'tenant-1' };

function makeMembershipRepo(membership: { id: string; userId: string; role: UserRole } | null): MembershipRepository {
  return {
    findById: mock(async () => null),
    findByUserAndTenant: mock(async () => membership),
    findByTenant: mock(async () => []),
    save: mock(async () => {}),
    delete: mock(async () => {}),
  } as unknown as MembershipRepository;
}

function makeSessionRepo(existing: null = null): SessionRepository {
  return {
    findById: mock(async () => existing),
    save: mock(async () => {}),
    findByTeam: mock(async () => []),
  } as unknown as SessionRepository;
}

function makeTeamRepo(): TeamRepository {
  return {
    findById: mock(async () => null),
    findByTenant: mock(async () => []),
    save: mock(async () => {}),
  } as unknown as TeamRepository;
}

function makeEntitlement(allow = true): EntitlementService {
  return {
    assertCanSync: mock(async () => {
      if (!allow) throw new UpgradeRequiredError('Cloud sync requires a Pro or Premium plan.', 'sync');
    }),
    assertCanUseExternalTeams: mock(async () => {}),
  } as unknown as EntitlementService;
}

describe('SyncSessionUseCase', () => {
  test('saves and returns the session for a member', async () => {
    const sessionRepo = makeSessionRepo();
    const useCase = new SyncSessionUseCase({
      sessionRepository: sessionRepo,
      membershipRepository: makeMembershipRepo({ id: 'mem-1', userId: 'user-1', role: 'member' }),
      teamRepository: makeTeamRepo(),
      entitlementService: makeEntitlement(),
    });

    const result = await useCase.execute(SESSION_INPUT, CTX);

    expect(result.id).toBe('session-1');
    expect(result.teamId).toBe('team-1');
    expect(result.tenantId).toBe('tenant-1');
    expect(result.createdBy).toBe('user-1');
    expect(result.status).toBe('completed');
    expect(sessionRepo.save).toHaveBeenCalledTimes(1);
  });

  test('throws UnauthorizedError when user is not a tenant member', async () => {
    const useCase = new SyncSessionUseCase({
      sessionRepository: makeSessionRepo(),
      membershipRepository: makeMembershipRepo(null),
      teamRepository: makeTeamRepo(),
      entitlementService: makeEntitlement(),
    });

    expect(useCase.execute(SESSION_INPUT, CTX)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  test('admin can also track sessions', async () => {
    const sessionRepo = makeSessionRepo();
    const useCase = new SyncSessionUseCase({
      sessionRepository: sessionRepo,
      membershipRepository: makeMembershipRepo({ id: 'mem-1', userId: 'user-1', role: 'admin' }),
      teamRepository: makeTeamRepo(),
      entitlementService: makeEntitlement(),
    });

    const result = await useCase.execute(SESSION_INPUT, CTX);

    expect(result.teamId).toBe('team-1');
    expect(sessionRepo.save).toHaveBeenCalledTimes(1);
  });

  test('preserves createdAt from existing session on re-sync', async () => {
    const existingCreatedAt = '2026-01-01T10:00:00.000Z';
    const sessionRepo = {
      findById: mock(async () => ({
        id: 'session-1',
        tenantId: 'tenant-1',
        teamId: 'team-1',
        createdBy: 'user-1',
        practiceInfo: SESSION_INPUT.practiceInfo,
        drills: [],
        status: 'completed' as const,
        createdAt: existingCreatedAt,
        updatedAt: existingCreatedAt,
      })),
      save: mock(async () => {}),
      findByTeam: mock(async () => []),
    } as unknown as SessionRepository;

    const useCase = new SyncSessionUseCase({
      sessionRepository: sessionRepo,
      membershipRepository: makeMembershipRepo({ id: 'mem-1', userId: 'user-1', role: 'member' }),
      teamRepository: makeTeamRepo(),
      entitlementService: makeEntitlement(),
    });
    const result = await useCase.execute(SESSION_INPUT, CTX);

    expect(result.createdAt).toBe(existingCreatedAt);
  });

  test('blocks a NEW session sync when entitlement denies it', async () => {
    const sessionRepo = makeSessionRepo();
    const useCase = new SyncSessionUseCase({
      sessionRepository: sessionRepo,
      membershipRepository: makeMembershipRepo({ id: 'mem-1', userId: 'user-1', role: 'member' }),
      teamRepository: makeTeamRepo(),
      entitlementService: makeEntitlement(false),
    });

    expect(useCase.execute(SESSION_INPUT, CTX)).rejects.toBeInstanceOf(UpgradeRequiredError);
    expect(sessionRepo.save).not.toHaveBeenCalled();
  });

  test('re-syncing an existing session bypasses the entitlement check (idempotent)', async () => {
    const sessionRepo = {
      findById: mock(async () => ({
        id: 'session-1',
        tenantId: 'tenant-1',
        teamId: 'team-1',
        createdBy: 'user-1',
        practiceInfo: SESSION_INPUT.practiceInfo,
        drills: [],
        status: 'completed' as const,
        createdAt: '2026-01-01T10:00:00.000Z',
        updatedAt: '2026-01-01T10:00:00.000Z',
      })),
      save: mock(async () => {}),
      findByTeam: mock(async () => []),
    } as unknown as SessionRepository;
    const entitlement = makeEntitlement(false);
    const useCase = new SyncSessionUseCase({
      sessionRepository: sessionRepo,
      membershipRepository: makeMembershipRepo({ id: 'mem-1', userId: 'user-1', role: 'member' }),
      teamRepository: makeTeamRepo(),
      entitlementService: entitlement,
    });

    const result = await useCase.execute(SESSION_INPUT, CTX);

    expect(result.id).toBe('session-1');
    expect(sessionRepo.save).toHaveBeenCalledTimes(1);
    expect(entitlement.assertCanSync).not.toHaveBeenCalled();
  });
});
