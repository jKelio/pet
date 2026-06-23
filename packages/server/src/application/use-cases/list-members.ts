import type { UserRepository, MembershipRepository } from '../../domain/ports/user.repository.js';
import type { User, Membership } from '@pet/shared';

export interface ListMembersDeps {
  userRepository: UserRepository;
  membershipRepository: MembershipRepository;
}

export interface MemberWithUser {
  membership: Membership;
  user: User;
}

export class ListMembersUseCase {
  constructor(private readonly deps: ListMembersDeps) {}

  async execute(tenantId: string): Promise<MemberWithUser[]> {
    const memberships = await this.deps.membershipRepository.findByTenant(tenantId);

    const results = await Promise.all(
      memberships.map(async (membership) => {
        const user = await this.deps.userRepository.findById(membership.userId);
        if (!user) return null;
        return { membership, user };
      }),
    );

    return results.filter((r): r is MemberWithUser => r !== null);
  }
}
