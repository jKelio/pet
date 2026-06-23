import type { SessionRepository } from '../../domain/ports/session.repository.js';
import type { MembershipRepository } from '../../domain/ports/user.repository.js';

export interface DeleteSessionDeps {
  sessionRepository: SessionRepository;
  membershipRepository: MembershipRepository;
}

export interface DeleteSessionContext {
  userId: string;
  tenantId: string;
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

/**
 * Delete a synced session from the backend. Allowed for the session's creator
 * or an admin of the tenant.
 */
export class DeleteSessionUseCase {
  constructor(private readonly deps: DeleteSessionDeps) {}

  async execute(id: string, ctx: DeleteSessionContext): Promise<void> {
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
      throw new ForbiddenError('Not allowed to delete this session');
    }

    await this.deps.sessionRepository.delete(id, ctx.tenantId);
  }
}
