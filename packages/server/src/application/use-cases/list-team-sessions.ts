import type { SessionRepository } from '../../domain/ports/session.repository.js';
import type { MembershipRepository } from '../../domain/ports/user.repository.js';
import type { PracticeSession } from '@pet/shared';
import { hasPermission } from '@pet/shared';
import { ForbiddenError } from './delete-session.js';

export interface ListTeamSessionsDeps {
  sessionRepository: SessionRepository;
  membershipRepository: MembershipRepository;
}

export interface ListTeamSessionsContext {
  userId: string;
  tenantId: string;
}

/**
 * List the sessions of a team, enforcing the view scope:
 * roles with `sessions:view:all` (club_admin, analyst) may read any team of
 * the tenant; everyone else (coach) is restricted to teams they are assigned to.
 */
export class ListTeamSessionsUseCase {
  constructor(private readonly deps: ListTeamSessionsDeps) {}

  async execute(teamId: string, ctx: ListTeamSessionsContext): Promise<PracticeSession[]> {
    const membership = await this.deps.membershipRepository.findByUserAndTenant(
      ctx.userId,
      ctx.tenantId,
    );
    if (!membership) {
      throw new ForbiddenError('User is not a member of this tenant');
    }

    if (!hasPermission(membership.role, 'sessions:view:all')) {
      const teamIds = await this.deps.membershipRepository.getTeamIds(membership.id);
      if (!teamIds.includes(teamId)) {
        throw new ForbiddenError('Not allowed to view sessions of this team');
      }
    }

    return this.deps.sessionRepository.findByTeam(teamId, ctx.tenantId);
  }
}
