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

    const users = await Promise.all(
      memberships.map((m) => this.deps.userRepository.findById(m.userId)),
    );

    return memberships.flatMap((membership, i) => {
      const user = users[i];
      if (!user) return [];
      return [{ membership, user }];
    });
  }
}
