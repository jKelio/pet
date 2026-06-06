import type { UserRepository, MembershipRepository, TenantRepository } from '../../domain/ports/user.repository.js';
import type { Membership } from '@pet/shared';

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

export class SuperAdminAddClubAdminUseCase {
  constructor(private readonly deps: {
    userRepository: UserRepository;
    membershipRepository: MembershipRepository;
    tenantRepository: TenantRepository;
  }) {}

  async execute(tenantId: string, email: string): Promise<Membership> {
    const tenant = await this.deps.tenantRepository.findById(tenantId);
    if (!tenant) throw new NotFoundError('Tenant not found');

    let user = await this.deps.userRepository.findByEmail(email);
    if (!user) {
      user = { id: crypto.randomUUID(), email, name: '', createdAt: new Date().toISOString() };
      await this.deps.userRepository.save(user);
    }

    const existing = await this.deps.membershipRepository.findByUserAndTenant(user.id, tenantId);
    if (existing) throw new ConflictError('User is already a member of this tenant');

    const membership: Membership = {
      id: crypto.randomUUID(),
      userId: user.id,
      tenantId,
      role: 'club_admin',
    };
    await this.deps.membershipRepository.save(membership);
    return membership;
  }
}
