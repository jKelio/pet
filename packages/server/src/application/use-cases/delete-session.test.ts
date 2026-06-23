import { describe, test, expect, mock } from 'bun:test';
import { DeleteSessionUseCase, ForbiddenError, NotFoundError } from './delete-session.js';
import type { SessionRepository } from '../../domain/ports/session.repository.js';
import type { MembershipRepository } from '../../domain/ports/user.repository.js';
import type { PracticeSession } from '@pet/shared';

const CTX = { userId: 'user-1', tenantId: 'tenant-1' };

const SESSION: PracticeSession = {
  id: 'session-1',
  tenantId: 'tenant-1',
  teamId: 'team-1',
  createdBy: 'user-1',
  practiceInfo: {
    clubName: 'EHC Test',
    teamName: 'U16 A',
    date: '2026-01-01',
    coachName: 'Test',
    athletesNumber: 20,
    coachesNumber: 2,
    totalTime: 60,
    trackedPlayerName: '',
    drillsNumber: 0,
    wasteTime: { totalTime: 0, timeSegments: [] },
  },
  drills: [],
  status: 'completed',
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
};

function makeSessionRepo(existing: PracticeSession | null): SessionRepository {
  return {
    findById: mock(async () => existing),
    findByTeam: mock(async () => []),
    save: mock(async () => {}),
    delete: mock(async () => {}),
  } as unknown as SessionRepository;
}

function makeMembershipRepo(role: 'member' | 'admin' | null, userId = 'user-1'): MembershipRepository {
  return {
    findById: mock(async () => null),
    findByUserAndTenant: mock(async () => (role ? { id: 'mem-1', userId, tenantId: 'tenant-1', role } : null)),
    findByTenant: mock(async () => []),
    save: mock(async () => {}),
    delete: mock(async () => {}),
  } as unknown as MembershipRepository;
}

describe('DeleteSessionUseCase', () => {
  test('deletes when the caller is the creator', async () => {
    const sessionRepo = makeSessionRepo(SESSION);
    const useCase = new DeleteSessionUseCase({
      sessionRepository: sessionRepo,
      membershipRepository: makeMembershipRepo('member'),
    });

    await useCase.execute('session-1', CTX);

    expect(sessionRepo.delete).toHaveBeenCalledTimes(1);
  });

  test('deletes when the caller is an admin (not the creator)', async () => {
    const sessionRepo = makeSessionRepo({ ...SESSION, createdBy: 'someone-else' });
    const useCase = new DeleteSessionUseCase({
      sessionRepository: sessionRepo,
      membershipRepository: makeMembershipRepo('admin', 'user-1'),
    });

    await useCase.execute('session-1', CTX);

    expect(sessionRepo.delete).toHaveBeenCalledTimes(1);
  });

  test('throws ForbiddenError for a non-creator non-admin member', async () => {
    const sessionRepo = makeSessionRepo({ ...SESSION, createdBy: 'someone-else' });
    const useCase = new DeleteSessionUseCase({
      sessionRepository: sessionRepo,
      membershipRepository: makeMembershipRepo('member', 'user-1'),
    });

    expect(useCase.execute('session-1', CTX)).rejects.toBeInstanceOf(ForbiddenError);
    expect(sessionRepo.delete).not.toHaveBeenCalled();
  });

  test('throws NotFoundError when the session does not exist', async () => {
    const sessionRepo = makeSessionRepo(null);
    const useCase = new DeleteSessionUseCase({
      sessionRepository: sessionRepo,
      membershipRepository: makeMembershipRepo('admin'),
    });

    expect(useCase.execute('missing', CTX)).rejects.toBeInstanceOf(NotFoundError);
  });
});
