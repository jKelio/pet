import type { SessionRepository } from '../../domain/ports/session.repository.js';
import type { MembershipRepository } from '../../domain/ports/user.repository.js';
import type { PracticeSession } from '@pet/shared';
import { hasPermission } from '@pet/shared';
import { NotFoundError } from './delete-session.js';

export interface GetSessionDeps {
  sessionRepository: SessionRepository;
  membershipRepository: MembershipRepository;
}

export interface GetSessionContext {
  userId: string;
  tenantId: string;
}

/**
 * Fetch a single session, enforcing the view scope. Roles with
 * `sessions:view:all` (club_admin, analyst) may read any session of the tenant;
 * a coach may only read sessions of teams they are assigned to. A session
 * outside the caller's scope is reported as Not Found so its existence is not
 * leaked.
 */
export class GetSessionUseCase {
  constructor(private readonly deps: GetSessionDeps) {}

  async execute(id: string, ctx: GetSessionContext): Promise<PracticeSession> {
    const session = await this.deps.sessionRepository.findById(id, ctx.tenantId);
    if (!session) {
      throw new NotFoundError('Session not found');
    }

    const membership = await this.deps.membershipRepository.findByUserAndTenant(
      ctx.userId,
      ctx.tenantId,
    );
    if (!membership) {
      throw new NotFoundError('Session not found');
    }

    if (!hasPermission(membership.role, 'sessions:view:all')) {
      const teamIds = await this.deps.membershipRepository.getTeamIds(membership.id);
      if (!teamIds.includes(session.teamId)) {
        throw new NotFoundError('Session not found');
      }
    }

    return session;
  }
}
