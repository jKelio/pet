import { describe, test, expect, mock } from 'bun:test';
import { DeleteTeamUseCase, ForbiddenError, NotFoundError, ConflictError } from './delete-team.js';
import type { TeamRepository, MembershipRepository } from '../../domain/ports/user.repository.js';
import type { SessionRepository } from '../../domain/ports/session.repository.js';
import type { Team, PracticeSession } from '@pet/shared';

const CALLER_ID = 'user-1';
const TENANT_ID = 'tenant-1';

const TEAM: Team = {
  id: 'team-1',
  tenantId: TENANT_ID,
  name: 'U16 A',
  ageClass: 16,
  kind: 'own',
  externalClubName: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const SESSION: PracticeSession = {
  id: 'session-1',
  tenantId: TENANT_ID,
  teamId: 'team-1',
  createdBy: 'user-1',
  practiceInfo: {
    clubName: 'EHC Test',
    teamName: 'U16 A',
    date: '2026-01-01T00:00:00.000Z',
    coachName: '',
    athletesNumber: 0,
    coachesNumber: 0,
    totalTime: 0,
    trackedPlayerName: '',
    drillsNumber: 0,
    wasteTime: { totalTime: 0, timeSegments: [] },
  },
  drills: [],
  status: 'completed',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function makeTeamRepo(existing: Team | null): TeamRepository {
  return {
    findById: mock(async () => existing),
    findByTenant: mock(async () => (existing ? [existing] : [])),
    save: mock(async () => {}),
    delete: mock(async () => {}),
  } as unknown as TeamRepository;
}

function makeMembershipRepo(role: 'member' | 'admin' | null): MembershipRepository {
  return {
    findById: mock(async () => null),
    findByUser: mock(async () => []),
    findByUserAndTenant: mock(async () => (role ? { id: 'mem-1', userId: CALLER_ID, tenantId: TENANT_ID, role } : null)),
    findByTenant: mock(async () => []),
    findAll: mock(async () => []),
    save: mock(async () => {}),
    delete: mock(async () => {}),
  } as unknown as MembershipRepository;
}

function makeSessionRepo(sessions: PracticeSession[]): SessionRepository {
  return {
    findById: mock(async () => null),
    findByTeam: mock(async () => ({ items: sessions, nextCursor: null })),
    save: mock(async () => {}),
    delete: mock(async () => {}),
  } as unknown as SessionRepository;
}

describe('DeleteTeamUseCase', () => {
  test('deletes an empty team when the caller is an admin', async () => {
    const teamRepo = makeTeamRepo(TEAM);
    const useCase = new DeleteTeamUseCase({
      teamRepository: teamRepo,
      membershipRepository: makeMembershipRepo('admin'),
      sessionRepository: makeSessionRepo([]),
    });

    await useCase.execute('team-1', CALLER_ID, TENANT_ID);

    expect(teamRepo.delete).toHaveBeenCalledTimes(1);
    expect(teamRepo.delete).toHaveBeenCalledWith('team-1', TENANT_ID);
  });

  test('throws ForbiddenError for a non-admin member', async () => {
    const teamRepo = makeTeamRepo(TEAM);
    const useCase = new DeleteTeamUseCase({
      teamRepository: teamRepo,
      membershipRepository: makeMembershipRepo('member'),
      sessionRepository: makeSessionRepo([]),
    });

    expect(useCase.execute('team-1', CALLER_ID, TENANT_ID)).rejects.toBeInstanceOf(ForbiddenError);
    expect(teamRepo.delete).not.toHaveBeenCalled();
  });

  test('throws NotFoundError when the team does not exist in this tenant', async () => {
    const teamRepo = makeTeamRepo(null);
    const useCase = new DeleteTeamUseCase({
      teamRepository: teamRepo,
      membershipRepository: makeMembershipRepo('admin'),
      sessionRepository: makeSessionRepo([]),
    });

    expect(useCase.execute('missing', CALLER_ID, TENANT_ID)).rejects.toBeInstanceOf(NotFoundError);
  });

  test('throws ConflictError when the team still has recorded sessions', async () => {
    const teamRepo = makeTeamRepo(TEAM);
    const useCase = new DeleteTeamUseCase({
      teamRepository: teamRepo,
      membershipRepository: makeMembershipRepo('admin'),
      sessionRepository: makeSessionRepo([SESSION]),
    });

    expect(useCase.execute('team-1', CALLER_ID, TENANT_ID)).rejects.toBeInstanceOf(ConflictError);
    expect(teamRepo.delete).not.toHaveBeenCalled();
  });
});
