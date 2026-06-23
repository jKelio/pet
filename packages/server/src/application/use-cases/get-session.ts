import type { SessionRepository } from '../../domain/ports/session.repository.js';
import type { MembershipRepository } from '../../domain/ports/user.repository.js';
import type { PracticeSession } from '@pet/shared';
import { NotFoundError } from './delete-session.js';

export interface GetSessionDeps {
  sessionRepository: SessionRepository;
  membershipRepository: MembershipRepository;
}

export interface GetSessionContext {
  userId: string;
  tenantId: string;
}

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

    return session;
  }
}
