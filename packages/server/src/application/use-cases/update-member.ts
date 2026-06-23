import type { UserRepository, MembershipRepository } from '../../domain/ports/user.repository.js';
import type { User } from '@pet/shared';

export interface UpdateMemberDeps {
  userRepository: UserRepository;
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

export class UpdateMemberUseCase {
  constructor(private readonly deps: UpdateMemberDeps) {}

  async execute(membershipId: string, name: string, callerId: string, tenantId: string): Promise<User> {
    const callerMembership = await this.deps.membershipRepository.findByUserAndTenant(callerId, tenantId);
    if (!callerMembership || callerMembership.role !== 'admin') {
      throw new ForbiddenError('Only admins can edit members');
    }

    const target = await this.deps.membershipRepository.findById(membershipId);
    if (!target || target.tenantId !== tenantId) {
      throw new NotFoundError();
    }

    const user = await this.deps.userRepository.findById(target.userId);
    if (!user) {
      throw new NotFoundError();
    }

    const updated: User = { ...user, name };
    await this.deps.userRepository.save(updated);
    return updated;
  }
}
