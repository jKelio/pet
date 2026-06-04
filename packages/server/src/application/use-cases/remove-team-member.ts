import type { MembershipRepository, TeamRepository } from '../../domain/ports/user.repository.js';

export interface RemoveTeamMemberDeps {
  membershipRepository: MembershipRepository;
  teamRepository: TeamRepository;
}

export class ForbiddenError extends Error {
  readonly statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  readonly statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class RemoveTeamMemberUseCase {
  constructor(private readonly deps: RemoveTeamMemberDeps) {}

  async execute(teamId: string, membershipId: string, callerId: string, tenantId: string): Promise<void> {
    const callerMembership = await this.deps.membershipRepository.findByUserAndTenant(callerId, tenantId);
    if (!callerMembership || callerMembership.role !== 'club_admin') {
      throw new ForbiddenError('Only club admins can manage team assignments');
    }

    const team = await this.deps.teamRepository.findById(teamId, tenantId);
    if (!team) {
      throw new NotFoundError('Team not found');
    }

    const membership = await this.deps.membershipRepository.findById(membershipId);
    if (!membership || membership.tenantId !== tenantId) {
      throw new NotFoundError('Member not found');
    }

    await this.deps.membershipRepository.unassignTeam(membershipId, teamId);
  }
}
