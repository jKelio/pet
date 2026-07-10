import { describe, test, expect, mock } from 'bun:test';
import { SuperAdminDeleteUserUseCase, NotFoundError, ForbiddenError } from './superadmin-delete-user.js';
import type { UserRepository } from '../../domain/ports/user.repository.js';
import type { User } from '@pet/shared';

function makeUserRepo(existing: User | null): UserRepository {
  return {
    findById: mock(async () => existing),
    delete: mock(async () => {}),
  } as unknown as UserRepository;
}

const USER: User = {
  id: 'user-1',
  email: 'Coach@Test.com',
  name: 'Coach',
  createdAt: '2026-01-01T10:00:00.000Z',
};

describe('SuperAdminDeleteUserUseCase', () => {
  test('deletes a regular user', async () => {
    const userRepo = makeUserRepo(USER);
    const useCase = new SuperAdminDeleteUserUseCase({
      userRepository: userRepo,
      superAdminEmails: ['admin@pracmetrics.com'],
    });

    await useCase.execute('user-1');

    expect(userRepo.delete).toHaveBeenCalledWith('user-1');
  });

  test('throws NotFoundError when the user does not exist', async () => {
    const userRepo = makeUserRepo(null);
    const useCase = new SuperAdminDeleteUserUseCase({
      userRepository: userRepo,
      superAdminEmails: [],
    });

    expect(useCase.execute('missing')).rejects.toBeInstanceOf(NotFoundError);
    expect(userRepo.delete).not.toHaveBeenCalled();
  });

  test('throws ForbiddenError for super-admin accounts (case-insensitive)', async () => {
    const userRepo = makeUserRepo(USER);
    const useCase = new SuperAdminDeleteUserUseCase({
      userRepository: userRepo,
      superAdminEmails: ['COACH@test.com'],
    });

    expect(useCase.execute('user-1')).rejects.toBeInstanceOf(ForbiddenError);
    expect(userRepo.delete).not.toHaveBeenCalled();
  });
});
