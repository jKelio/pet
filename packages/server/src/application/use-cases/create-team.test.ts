import { describe, test, expect, mock } from 'bun:test';
import { CreateTeamUseCase, ForbiddenError } from './create-team.js';
import type { EntitlementService } from '../services/entitlement.service.js';
import type { MembershipRepository, TeamRepository } from '../../domain/ports/user.repository.js';
import type { UserRole } from '@pet/shared';

function makeMembershipRepo(membership: { id: string; userId: string; role: UserRole } | null): MembershipRepository {
  return {
    findById: mock(async () => null),
    findByUserAndTenant: mock(async () => membership),
    findByTenant: mock(async () => []),
    save: mock(async () => {}),
    delete: mock(async () => {}),
  } as unknown as MembershipRepository;
}

function makeTeamRepo(): TeamRepository {
  return {
    findById: mock(async () => null),
    findByTenant: mock(async () => []),
    save: mock(async () => {}),
  } as unknown as TeamRepository;
}

function makeEntitlement(): EntitlementService {
  return {
    assertCanCreateTeam: mock(async () => {}),
    assertCanUseExternalTeams: mock(async () => {}),
  } as unknown as EntitlementService;
}

describe('CreateTeamUseCase', () => {
  test('admin can create an own team', async () => {
    const teamRepo = makeTeamRepo();
    const useCase = new CreateTeamUseCase({
      teamRepository: teamRepo,
      membershipRepository: makeMembershipRepo({ id: 'mem-1', userId: 'user-1', role: 'admin' }),
      entitlementService: makeEntitlement(),
    });

    const team = await useCase.execute({ name: 'U16' }, 'user-1', 'tenant-1');

    expect(team.kind).toBe('own');
    expect(team.externalClubName).toBeNull();
    expect(teamRepo.save).toHaveBeenCalledTimes(1);
  });

  test('admin can create an External Team', async () => {
    const teamRepo = makeTeamRepo();
    const useCase = new CreateTeamUseCase({
      teamRepository: teamRepo,
      membershipRepository: makeMembershipRepo({ id: 'mem-1', userId: 'user-1', role: 'admin' }),
      entitlementService: makeEntitlement(),
    });

    const team = await useCase.execute(
      { name: 'U16', kind: 'external', externalClubName: 'EHC Rival' },
      'user-1',
      'tenant-1',
    );

    expect(team.kind).toBe('external');
    expect(team.externalClubName).toBe('EHC Rival');
    expect(teamRepo.save).toHaveBeenCalledTimes(1);
  });

  test('member may NOT create teams (admin-curated only)', async () => {
    const teamRepo = makeTeamRepo();
    const useCase = new CreateTeamUseCase({
      teamRepository: teamRepo,
      membershipRepository: makeMembershipRepo({ id: 'mem-1', userId: 'user-1', role: 'member' }),
      entitlementService: makeEntitlement(),
    });

    expect(
      useCase.execute({ name: 'U16', kind: 'external', externalClubName: 'EHC Rival' }, 'user-1', 'tenant-1'),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(teamRepo.save).not.toHaveBeenCalled();
  });

  test('member may NOT create an own team', async () => {
    const useCase = new CreateTeamUseCase({
      teamRepository: makeTeamRepo(),
      membershipRepository: makeMembershipRepo({ id: 'mem-1', userId: 'user-1', role: 'member' }),
      entitlementService: makeEntitlement(),
    });

    expect(useCase.execute({ name: 'U16' }, 'user-1', 'tenant-1')).rejects.toBeInstanceOf(ForbiddenError);
  });

  test('throws ForbiddenError when caller is not a tenant member', async () => {
    const useCase = new CreateTeamUseCase({
      teamRepository: makeTeamRepo(),
      membershipRepository: makeMembershipRepo(null),
      entitlementService: makeEntitlement(),
    });

    expect(useCase.execute({ name: 'U16' }, 'user-1', 'tenant-1')).rejects.toBeInstanceOf(ForbiddenError);
  });
});
