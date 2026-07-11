import type { TeamRepository, MembershipRepository } from '../../domain/ports/user.repository.js';
import type { SessionRepository } from '../../domain/ports/session.repository.js';

export interface DeleteTeamDeps {
  teamRepository: TeamRepository;
  membershipRepository: MembershipRepository;
  sessionRepository: SessionRepository;
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

export class ConflictError extends Error {
  readonly statusCode = 409;
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

/**
 * Delete a team from the tenant (admin only). Blocked when the team still has
 * practice sessions recorded against it — practice_sessions.team_id is a
 * restrict-on-delete FK, and a coach's tracked history must never silently
 * disappear as a side effect of a roster cleanup.
 */
export class DeleteTeamUseCase {
  constructor(private readonly deps: DeleteTeamDeps) {}

  async execute(teamId: string, callerId: string, tenantId: string): Promise<void> {
    const membership = await this.deps.membershipRepository.findByUserAndTenant(callerId, tenantId);
    if (!membership || membership.role !== 'admin') {
      throw new ForbiddenError('Only admins can delete teams');
    }

    const team = await this.deps.teamRepository.findById(teamId, tenantId);
    if (!team) {
      throw new NotFoundError('Team not found');
    }

    const { items } = await this.deps.sessionRepository.findByTeam(teamId, tenantId, { limit: 1 });
    if (items.length > 0) {
      throw new ConflictError('Cannot delete a team with recorded practice sessions');
    }

    await this.deps.teamRepository.delete(teamId, tenantId);
  }
}
