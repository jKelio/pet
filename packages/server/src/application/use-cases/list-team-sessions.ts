import type { SessionRepository } from '../../domain/ports/session.repository.js';
import type { MembershipRepository } from '../../domain/ports/user.repository.js';
import type { PracticeSession } from '@pet/shared';
import { ForbiddenError } from './delete-session.js';

export interface ListTeamSessionsDeps {
  sessionRepository: SessionRepository;
  membershipRepository: MembershipRepository;
}

export interface ListTeamSessionsContext {
  userId: string;
  tenantId: string;
}

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

    return this.deps.sessionRepository.findByTeam(teamId, ctx.tenantId);
  }
}
