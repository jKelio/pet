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
    assignTeam: mock(async () => {}),
    getTeamIds: mock(async () => []),
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
  test('club_admin can create an own team', async () => {
    const teamRepo = makeTeamRepo();
    const useCase = new CreateTeamUseCase({
      teamRepository: teamRepo,
      membershipRepository: makeMembershipRepo({ id: 'mem-1', userId: 'user-1', role: 'club_admin' }),
      entitlementService: makeEntitlement(),
    });

    const team = await useCase.execute({ name: 'U16' }, 'user-1', 'tenant-1');

    expect(team.kind).toBe('own');
    expect(team.externalClubName).toBeNull();
    expect(teamRepo.save).toHaveBeenCalledTimes(1);
  });

  test('club_admin can create an External Team', async () => {
    const teamRepo = makeTeamRepo();
    const useCase = new CreateTeamUseCase({
      teamRepository: teamRepo,
      membershipRepository: makeMembershipRepo({ id: 'mem-1', userId: 'user-1', role: 'club_admin' }),
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

  test('coach may NOT create an External Team (admin-curated only)', async () => {
    const teamRepo = makeTeamRepo();
    const useCase = new CreateTeamUseCase({
      teamRepository: teamRepo,
      membershipRepository: makeMembershipRepo({ id: 'mem-1', userId: 'user-1', role: 'coach' }),
      entitlementService: makeEntitlement(),
    });

    expect(
      useCase.execute({ name: 'U16', kind: 'external', externalClubName: 'EHC Rival' }, 'user-1', 'tenant-1'),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(teamRepo.save).not.toHaveBeenCalled();
  });

  test('coach may NOT create an own team', async () => {
    const useCase = new CreateTeamUseCase({
      teamRepository: makeTeamRepo(),
      membershipRepository: makeMembershipRepo({ id: 'mem-1', userId: 'user-1', role: 'coach' }),
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
