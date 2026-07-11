import type { SessionRepository } from '../../domain/ports/session.repository.js';
import type { MembershipRepository } from '../../domain/ports/user.repository.js';
import type { PracticeSession, UpdatePracticeInfoInput } from '@pet/shared';
import { ForbiddenError, NotFoundError } from './delete-session.js';

export interface UpdateSessionPracticeInfoDeps {
  sessionRepository: SessionRepository;
  membershipRepository: MembershipRepository;
}

export interface UpdateSessionPracticeInfoContext {
  userId: string;
  tenantId: string;
}

/**
 * Correct a synced session's practice metadata after the fact. Allowed for the
 * session's creator or an admin of the tenant. Only descriptive fields are
 * touched — team assignment, drills and tracked timing data stay as recorded.
 */
export class UpdateSessionPracticeInfoUseCase {
  constructor(private readonly deps: UpdateSessionPracticeInfoDeps) {}

  async execute(
    id: string,
    input: UpdatePracticeInfoInput,
    ctx: UpdateSessionPracticeInfoContext,
  ): Promise<PracticeSession> {
    const session = await this.deps.sessionRepository.findById(id, ctx.tenantId);
    if (!session) {
      throw new NotFoundError('Session not found');
    }

    const membership = await this.deps.membershipRepository.findByUserAndTenant(
      ctx.userId,
      ctx.tenantId,
    );
    const isCreator = session.createdBy === ctx.userId;
    const isAdmin = membership?.role === 'admin';
    if (!isCreator && !isAdmin) {
      throw new ForbiddenError('Not allowed to edit this session');
    }

    const updated: PracticeSession = {
      ...session,
      practiceInfo: { ...session.practiceInfo, ...input },
      updatedAt: new Date().toISOString(),
    };

    await this.deps.sessionRepository.save(updated);
    return updated;
  }
}
