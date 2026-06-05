import { describe, test, expect, mock } from 'bun:test';
import { SyncSessionUseCase, UnauthorizedError } from './sync-session.js';
import type { SessionRepository } from '../../domain/ports/session.repository.js';
import type { MembershipRepository } from '../../domain/ports/user.repository.js';
import type { SyncSessionInput, UserRole } from '@pet/shared';

const SESSION_INPUT: SyncSessionInput = {
  id: 'session-1',
  teamId: 'team-1',
  practiceInfo: {
    clubName: 'EHC Test',
    teamName: 'U16 A',
    date: '2026-01-01',
    coachName: 'Coach Test',
    evaluation: 4,
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

function makeMembershipRepo(opts: {
  membership: { id: string; userId: string; role: UserRole } | null;
  teamIds: string[];
}): MembershipRepository {
  return {
    findById: mock(async () => null),
    findByUserAndTenant: mock(async () => opts.membership),
    findByTenant: mock(async () => []),
    save: mock(async () => {}),
    delete: mock(async () => {}),
    assignTeam: mock(async () => {}),
    getTeamIds: mock(async () => opts.teamIds),
  } as unknown as MembershipRepository;
}

function makeSessionRepo(existing: null = null): SessionRepository {
  return {
    findById: mock(async () => existing),
    save: mock(async () => {}),
    findByTeam: mock(async () => []),
  } as unknown as SessionRepository;
}

describe('SyncSessionUseCase', () => {
  test('saves and returns the session when user is a member of the team', async () => {
    const membershipRepo = makeMembershipRepo({
      membership: { id: 'mem-1', userId: 'user-1', role: 'coach' },
      teamIds: ['team-1'],
    });
    const sessionRepo = makeSessionRepo();
    const useCase = new SyncSessionUseCase({ sessionRepository: sessionRepo, membershipRepository: membershipRepo });

    const result = await useCase.execute(SESSION_INPUT, CTX);

    expect(result.id).toBe('session-1');
    expect(result.teamId).toBe('team-1');
    expect(result.tenantId).toBe('tenant-1');
    expect(result.createdBy).toBe('user-1');
    expect(result.status).toBe('completed');
    expect(sessionRepo.save).toHaveBeenCalledTimes(1);
  });

  test('throws UnauthorizedError when user is not a tenant member', async () => {
    const membershipRepo = makeMembershipRepo({ membership: null, teamIds: [] });
    const sessionRepo = makeSessionRepo();
    const useCase = new SyncSessionUseCase({ sessionRepository: sessionRepo, membershipRepository: membershipRepo });

    expect(useCase.execute(SESSION_INPUT, CTX)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  test('throws UnauthorizedError when user is not assigned to the team', async () => {
    const membershipRepo = makeMembershipRepo({
      membership: { id: 'mem-1', userId: 'user-1', role: 'coach' },
      teamIds: ['team-99'], // different team
    });
    const sessionRepo = makeSessionRepo();
    const useCase = new SyncSessionUseCase({ sessionRepository: sessionRepo, membershipRepository: membershipRepo });

    expect(useCase.execute(SESSION_INPUT, CTX)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  test('throws UnauthorizedError when role may not track (analyst)', async () => {
    const membershipRepo = makeMembershipRepo({
      membership: { id: 'mem-1', userId: 'user-1', role: 'analyst' },
      teamIds: ['team-1'],
    });
    const sessionRepo = makeSessionRepo();
    const useCase = new SyncSessionUseCase({ sessionRepository: sessionRepo, membershipRepository: membershipRepo });

    expect(useCase.execute(SESSION_INPUT, CTX)).rejects.toBeInstanceOf(UnauthorizedError);
    expect(sessionRepo.save).not.toHaveBeenCalled();
  });

  test('club_admin may track for a team it is not assigned to', async () => {
    const membershipRepo = makeMembershipRepo({
      membership: { id: 'mem-1', userId: 'user-1', role: 'club_admin' },
      teamIds: [], // not on any roster
    });
    const sessionRepo = makeSessionRepo();
    const useCase = new SyncSessionUseCase({ sessionRepository: sessionRepo, membershipRepository: membershipRepo });

    const result = await useCase.execute(SESSION_INPUT, CTX);

    expect(result.teamId).toBe('team-1');
    expect(sessionRepo.save).toHaveBeenCalledTimes(1);
    // team-assignment lookup must be skipped for club_admin
    expect(membershipRepo.getTeamIds).not.toHaveBeenCalled();
  });

  test('preserves createdAt from existing session on re-sync', async () => {
    const existingCreatedAt = '2026-01-01T10:00:00.000Z';
    const membershipRepo = makeMembershipRepo({
      membership: { id: 'mem-1', userId: 'user-1', role: 'coach' },
      teamIds: ['team-1'],
    });
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

    const useCase = new SyncSessionUseCase({ sessionRepository: sessionRepo, membershipRepository: membershipRepo });
    const result = await useCase.execute(SESSION_INPUT, CTX);

    expect(result.createdAt).toBe(existingCreatedAt);
  });
});
