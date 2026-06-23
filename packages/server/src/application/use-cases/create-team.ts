import type { TeamRepository, MembershipRepository } from '../../domain/ports/user.repository.js';
import type { Team } from '@pet/shared';
import type { EntitlementService } from '../services/entitlement.service.js';

export interface CreateTeamDeps {
  teamRepository: TeamRepository;
  membershipRepository: MembershipRepository;
  entitlementService: EntitlementService;
}

export interface CreateTeamInput {
  name: string;
  kind?: 'own' | 'external';
  externalClubName?: string;
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

  async execute(input: CreateTeamInput, userId: string, tenantId: string): Promise<Team> {
    const membership = await this.deps.membershipRepository.findByUserAndTenant(userId, tenantId);
    if (!membership) {
      throw new ForbiddenError('Not a member of this tenant');
    }

    const kind = input.kind ?? 'own';

    const canCreate =
      membership.role === 'club_admin' ||
      (membership.role === 'coach' && kind === 'external');
    if (!canCreate) {
      throw new ForbiddenError('Only club admins can create own teams');
    }

    if (kind === 'external') {
      // External Teams are a Premium-only boolean feature — not gated by the own-team capacity.
      await this.deps.entitlementService.assertCanUseExternalTeams(tenantId);
    } else {
      // Own Teams count against the plan's team capacity limit.
      await this.deps.entitlementService.assertCanCreateTeam(tenantId);
    }

    const team: Team = {
      id: crypto.randomUUID(),
      tenantId,
      name: input.name.trim(),
      kind,
      externalClubName: kind === 'external' ? (input.externalClubName?.trim() ?? null) : null,
      createdAt: new Date().toISOString(),
    };

    await this.deps.teamRepository.save(team);
    await this.deps.membershipRepository.assignTeam(membership.id, team.id);
    return team;
  }
}
