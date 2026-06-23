import type { MembershipRepository } from '../../domain/ports/user.repository.js';

export interface RemoveMemberDeps {
  membershipRepository: MembershipRepository;
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
  constructor() {
    super('Member not found');
    this.name = 'NotFoundError';
  }
}

export class RemoveMemberUseCase {
  constructor(private readonly deps: RemoveMemberDeps) {}

  async execute(membershipId: string, callerId: string, tenantId: string): Promise<void> {
    const callerMembership = await this.deps.membershipRepository.findByUserAndTenant(callerId, tenantId);
    if (!callerMembership || callerMembership.role !== 'admin') {
      throw new ForbiddenError('Only admins can remove members');
    }

    const target = await this.deps.membershipRepository.findById(membershipId);
    if (!target || target.tenantId !== tenantId) {
      throw new NotFoundError();
    }

    if (target.userId === callerId) {
      throw new ForbiddenError('Cannot remove yourself from the tenant');
    }

    await this.deps.membershipRepository.delete(membershipId);
  }
}
