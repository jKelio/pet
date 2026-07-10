import { describe, test, expect, mock } from 'bun:test';
import { ListTeamSessionsUseCase, InvalidCursorError, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './list-team-sessions.js';
import { ForbiddenError } from './delete-session.js';
import type { SessionRepository, SessionPageResult, SessionCursor } from '../../domain/ports/session.repository.js';
import type { MembershipRepository } from '../../domain/ports/user.repository.js';

const CTX = { userId: 'user-1', tenantId: 'tenant-1' };

const CURSOR: SessionCursor = {
  date: '2026-03-01',
  createdAt: '2026-03-01T18:00:00.000Z',
  id: 'session-20',
};

function makeSessionRepo(result: SessionPageResult): SessionRepository {
  return {
    findById: mock(async () => null),
    findByTeam: mock(async () => result),
    save: mock(async () => {}),
    delete: mock(async () => {}),
  } as unknown as SessionRepository;
}

function makeMembershipRepo(isMember: boolean): MembershipRepository {
  return {
    findById: mock(async () => null),
    findByUserAndTenant: mock(async () =>
      isMember ? { id: 'mem-1', userId: 'user-1', tenantId: 'tenant-1', role: 'member' } : null,
    ),
    findByTenant: mock(async () => []),
    save: mock(async () => {}),
    delete: mock(async () => {}),
  } as unknown as MembershipRepository;
}

describe('ListTeamSessionsUseCase', () => {
  test('throws ForbiddenError when the caller is not a tenant member', async () => {
    const useCase = new ListTeamSessionsUseCase({
      sessionRepository: makeSessionRepo({ items: [], nextCursor: null }),
      membershipRepository: makeMembershipRepo(false),
    });

    expect(useCase.execute('team-1', CTX)).rejects.toBeInstanceOf(ForbiddenError);
  });

  test('uses the default page size and passes no cursor on the first page', async () => {
    const sessionRepo = makeSessionRepo({ items: [], nextCursor: null });
    const useCase = new ListTeamSessionsUseCase({
      sessionRepository: sessionRepo,
      membershipRepository: makeMembershipRepo(true),
    });

    const page = await useCase.execute('team-1', CTX);

    expect(page).toEqual({ items: [], nextCursor: null });
    expect(sessionRepo.findByTeam).toHaveBeenCalledWith('team-1', 'tenant-1', {
      limit: DEFAULT_PAGE_SIZE,
      before: undefined,
    });
  });

  test('clamps the limit to MAX_PAGE_SIZE', async () => {
    const sessionRepo = makeSessionRepo({ items: [], nextCursor: null });
    const useCase = new ListTeamSessionsUseCase({
      sessionRepository: sessionRepo,
      membershipRepository: makeMembershipRepo(true),
    });

    await useCase.execute('team-1', CTX, { limit: 10_000 });

    expect(sessionRepo.findByTeam).toHaveBeenCalledWith('team-1', 'tenant-1', {
      limit: MAX_PAGE_SIZE,
      before: undefined,
    });
  });

  test('round-trips the cursor: encoded nextCursor decodes back to the repository cursor', async () => {
    const firstRepo = makeSessionRepo({ items: [], nextCursor: CURSOR });
    const membershipRepo = makeMembershipRepo(true);
    const firstPage = await new ListTeamSessionsUseCase({
      sessionRepository: firstRepo,
      membershipRepository: membershipRepo,
    }).execute('team-1', CTX);

    expect(firstPage.nextCursor).not.toBeNull();

    const secondRepo = makeSessionRepo({ items: [], nextCursor: null });
    await new ListTeamSessionsUseCase({
      sessionRepository: secondRepo,
      membershipRepository: membershipRepo,
    }).execute('team-1', CTX, { limit: 20, cursor: firstPage.nextCursor! });

    expect(secondRepo.findByTeam).toHaveBeenCalledWith('team-1', 'tenant-1', {
      limit: 20,
      before: CURSOR,
    });
  });

  test('supports a null date in the cursor (sessions without a practice date)', async () => {
    const firstRepo = makeSessionRepo({ items: [], nextCursor: { ...CURSOR, date: null } });
    const membershipRepo = makeMembershipRepo(true);
    const firstPage = await new ListTeamSessionsUseCase({
      sessionRepository: firstRepo,
      membershipRepository: membershipRepo,
    }).execute('team-1', CTX);

    const secondRepo = makeSessionRepo({ items: [], nextCursor: null });
    await new ListTeamSessionsUseCase({
      sessionRepository: secondRepo,
      membershipRepository: membershipRepo,
    }).execute('team-1', CTX, { cursor: firstPage.nextCursor! });

    expect(secondRepo.findByTeam).toHaveBeenCalledWith('team-1', 'tenant-1', {
      limit: DEFAULT_PAGE_SIZE,
      before: { ...CURSOR, date: null },
    });
  });

  test.each(['not-base64url!!!', Buffer.from('"just a string"').toString('base64url'), Buffer.from('{}').toString('base64url')])(
    'throws InvalidCursorError for malformed cursor %#',
    async (cursor) => {
      const useCase = new ListTeamSessionsUseCase({
        sessionRepository: makeSessionRepo({ items: [], nextCursor: null }),
        membershipRepository: makeMembershipRepo(true),
      });

      expect(useCase.execute('team-1', CTX, { cursor })).rejects.toBeInstanceOf(InvalidCursorError);
    },
  );
});
