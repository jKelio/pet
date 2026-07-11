import { describe, test, expect, mock } from 'bun:test';
import { UpdateSessionPracticeInfoUseCase } from './update-session-practice-info.js';
import { ForbiddenError, NotFoundError } from './delete-session.js';
import type { SessionRepository } from '../../domain/ports/session.repository.js';
import type { MembershipRepository } from '../../domain/ports/user.repository.js';
import type { PracticeSession, UpdatePracticeInfoInput } from '@pet/shared';

const CTX = { userId: 'user-1', tenantId: 'tenant-1' };

const SESSION: PracticeSession = {
  id: 'session-1',
  tenantId: 'tenant-1',
  teamId: 'team-1',
  createdBy: 'user-1',
  practiceInfo: {
    clubName: 'EHC Test',
    teamName: 'U16 A',
    date: '2026-01-01T10:00:00.000Z',
    coachName: 'Old Coach',
    athletesNumber: 20,
    coachesNumber: 2,
    totalTime: 60,
    trackedPlayerName: '',
    drillsNumber: 3,
    wasteTime: { totalTime: 5000, timeSegments: [] },
  },
  drills: [],
  status: 'completed',
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
};

const INPUT: UpdatePracticeInfoInput = {
  date: '2026-01-02T10:00:00.000Z',
  coachName: 'New Coach',
  trackedPlayerName: 'Player 9',
  athletesNumber: 18,
  coachesNumber: 3,
  totalTime: 75,
};

function makeSessionRepo(existing: PracticeSession | null): SessionRepository {
  return {
    findById: mock(async () => existing),
    findByTeam: mock(async () => ({ items: [], nextCursor: null })),
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

describe('UpdateSessionPracticeInfoUseCase', () => {
  test('updates metadata when the caller is the creator', async () => {
    const sessionRepo = makeSessionRepo(SESSION);
    const useCase = new UpdateSessionPracticeInfoUseCase({
      sessionRepository: sessionRepo,
      membershipRepository: makeMembershipRepo('member'),
    });

    const result = await useCase.execute('session-1', INPUT, CTX);

    expect(sessionRepo.save).toHaveBeenCalledTimes(1);
    expect(result.practiceInfo.coachName).toBe('New Coach');
    expect(result.practiceInfo.totalTime).toBe(75);
  });

  test('preserves non-editable practiceInfo fields and session identity', async () => {
    const sessionRepo = makeSessionRepo(SESSION);
    const useCase = new UpdateSessionPracticeInfoUseCase({
      sessionRepository: sessionRepo,
      membershipRepository: makeMembershipRepo('member'),
    });

    const result = await useCase.execute('session-1', INPUT, CTX);

    expect(result.practiceInfo.clubName).toBe('EHC Test');
    expect(result.practiceInfo.teamName).toBe('U16 A');
    expect(result.practiceInfo.drillsNumber).toBe(3);
    expect(result.practiceInfo.wasteTime.totalTime).toBe(5000);
    expect(result.teamId).toBe('team-1');
    expect(result.createdBy).toBe('user-1');
    expect(result.createdAt).toBe(SESSION.createdAt);
  });

  test('updates when the caller is an admin (not the creator)', async () => {
    const sessionRepo = makeSessionRepo({ ...SESSION, createdBy: 'someone-else' });
    const useCase = new UpdateSessionPracticeInfoUseCase({
      sessionRepository: sessionRepo,
      membershipRepository: makeMembershipRepo('admin', 'user-1'),
    });

    const result = await useCase.execute('session-1', INPUT, CTX);

    expect(sessionRepo.save).toHaveBeenCalledTimes(1);
    expect(result.createdBy).toBe('someone-else');
  });

  test('throws ForbiddenError for a non-creator non-admin member', async () => {
    const sessionRepo = makeSessionRepo({ ...SESSION, createdBy: 'someone-else' });
    const useCase = new UpdateSessionPracticeInfoUseCase({
      sessionRepository: sessionRepo,
      membershipRepository: makeMembershipRepo('member', 'user-1'),
    });

    expect(useCase.execute('session-1', INPUT, CTX)).rejects.toBeInstanceOf(ForbiddenError);
    expect(sessionRepo.save).not.toHaveBeenCalled();
  });

  test('throws NotFoundError when the session does not exist', async () => {
    const sessionRepo = makeSessionRepo(null);
    const useCase = new UpdateSessionPracticeInfoUseCase({
      sessionRepository: sessionRepo,
      membershipRepository: makeMembershipRepo('admin'),
    });

    expect(useCase.execute('missing', INPUT, CTX)).rejects.toBeInstanceOf(NotFoundError);
  });
});
