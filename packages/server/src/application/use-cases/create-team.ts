import type { TeamRepository, MembershipRepository } from '../../domain/ports/user.repository.js';
import type { Team } from '@pet/shared';
import type { EntitlementService } from '../services/entitlement.service.js';

export interface CreateTeamDeps {
  teamRepository: TeamRepository;
  membershipRepository: MembershipRepository;
  entitlementService: EntitlementService;
}

export class ForbiddenError extends Error {
  readonly statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class CreateTeamUseCase {
  constructor(private readonly deps: CreateTeamDeps) {}

  async execute(name: string, userId: string, tenantId: string): Promise<Team> {
    const membership = await this.deps.membershipRepository.findByUserAndTenant(userId, tenantId);
    if (!membership || membership.role !== 'club_admin') {
      throw new ForbiddenError('Only club admins can create teams');
    }

    // Enforce the plan's team limit before creating another team.
    await this.deps.entitlementService.assertCanCreateTeam(tenantId);

    const team: Team = {
      id: crypto.randomUUID(),
      tenantId,
      name: name.trim(),
      createdAt: new Date().toISOString(),
    };

    await this.deps.teamRepository.save(team);
    await this.deps.membershipRepository.assignTeam(membership.id, team.id);
    return team;
  }
}
