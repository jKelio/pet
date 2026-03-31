import type { UserRepository, MembershipRepository } from '../../domain/ports/user.repository.js';
import type { Membership, UserRole } from '@pet/shared';

export interface InviteMemberDeps {
  userRepository: UserRepository;
  membershipRepository: MembershipRepository;
}

export interface InviteMemberInput {
  email: string;
  role: UserRole;
  teamIds?: string[];
}

export class ForbiddenError extends Error {
  readonly statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends Error {
  readonly statusCode = 409;
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class InviteMemberUseCase {
  constructor(private readonly deps: InviteMemberDeps) {}

  async execute(
    input: InviteMemberInput,
    callerId: string,
    tenantId: string,
  ): Promise<Membership> {
    // Only club_admin can invite
    const callerMembership = await this.deps.membershipRepository.findByUserAndTenant(callerId, tenantId);
    if (!callerMembership || callerMembership.role !== 'club_admin') {
      throw new ForbiddenError('Only club admins can invite members');
    }

    // Find or create user by email
    let user = await this.deps.userRepository.findByEmail(input.email);
    if (!user) {
      user = {
        id: crypto.randomUUID(),
        email: input.email,
        name: '',
        createdAt: new Date().toISOString(),
      };
      await this.deps.userRepository.save(user);
    }

    // Prevent duplicate membership
    const existing = await this.deps.membershipRepository.findByUserAndTenant(user.id, tenantId);
    if (existing) {
      throw new ConflictError('User is already a member of this tenant');
    }

    const membership: Membership = {
      id: crypto.randomUUID(),
      userId: user.id,
      tenantId,
      role: input.role,
    };

    await this.deps.membershipRepository.save(membership);

    if (input.teamIds?.length) {
      await Promise.all(
        input.teamIds.map((teamId) => this.deps.membershipRepository.assignTeam(membership.id, teamId)),
      );
    }

    return membership;
  }
}
