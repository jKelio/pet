import { describe, test, expect, mock } from 'bun:test';
import { UpdateMemberUseCase, ForbiddenError, NotFoundError } from './update-member.js';
import type { UserRepository, MembershipRepository } from '../../domain/ports/user.repository.js';
import type { User } from '@pet/shared';

const USER: User = {
  id: 'user-2',
  email: 'member@test.com',
  name: 'Old Name',
  createdAt: '2026-01-01T10:00:00.000Z',
};

function makeUserRepo(existing: User | null): UserRepository {
  return {
    findById: mock(async () => existing),
    findByEmail: mock(async () => null),
    consumeMagicLinkToken: mock(async () => null),
    save: mock(async () => {}),
    saveMagicLinkToken: mock(async () => {}),
    updateLastLogin: mock(async () => {}),
  } as unknown as UserRepository;
}

function makeMembershipRepo(
  callerRole: 'member' | 'admin' | null,
  target: { id: string; userId: string; tenantId: string } | null,
): MembershipRepository {
  return {
    findById: mock(async () => (target ? { ...target, role: 'member' as const } : null)),
    findByUser: mock(async () => []),
    findByUserAndTenant: mock(async () =>
      callerRole ? { id: 'mem-caller', userId: 'user-1', tenantId: 'tenant-1', role: callerRole } : null,
    ),
    findByTenant: mock(async () => []),
    save: mock(async () => {}),
    delete: mock(async () => {}),
  } as unknown as MembershipRepository;
}

const TARGET = { id: 'mem-2', userId: 'user-2', tenantId: 'tenant-1' };

describe('UpdateMemberUseCase', () => {
  test('updates the user name when the caller is an admin', async () => {
    const userRepo = makeUserRepo(USER);
    const useCase = new UpdateMemberUseCase({
      userRepository: userRepo,
      membershipRepository: makeMembershipRepo('admin', TARGET),
    });

    const result = await useCase.execute('mem-2', 'New Name', 'user-1', 'tenant-1');

    expect(result.name).toBe('New Name');
    expect(userRepo.save).toHaveBeenCalledTimes(1);
  });

  test('throws ForbiddenError when the caller is not an admin', async () => {
    const userRepo = makeUserRepo(USER);
    const useCase = new UpdateMemberUseCase({
      userRepository: userRepo,
      membershipRepository: makeMembershipRepo('member', TARGET),
    });

    expect(useCase.execute('mem-2', 'New Name', 'user-1', 'tenant-1')).rejects.toBeInstanceOf(ForbiddenError);
    expect(userRepo.save).not.toHaveBeenCalled();
  });

  test('throws NotFoundError when the target membership belongs to another tenant', async () => {
    const userRepo = makeUserRepo(USER);
    const useCase = new UpdateMemberUseCase({
      userRepository: userRepo,
      membershipRepository: makeMembershipRepo('admin', { ...TARGET, tenantId: 'other-tenant' }),
    });

    expect(useCase.execute('mem-2', 'New Name', 'user-1', 'tenant-1')).rejects.toBeInstanceOf(NotFoundError);
    expect(userRepo.save).not.toHaveBeenCalled();
  });

  test('throws NotFoundError when the target membership does not exist', async () => {
    const userRepo = makeUserRepo(USER);
    const useCase = new UpdateMemberUseCase({
      userRepository: userRepo,
      membershipRepository: makeMembershipRepo('admin', null),
    });

    expect(useCase.execute('missing', 'New Name', 'user-1', 'tenant-1')).rejects.toBeInstanceOf(NotFoundError);
  });
});
