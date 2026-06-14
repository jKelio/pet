import type { UserRepository, MembershipRepository, TenantRepository } from '../../domain/ports/user.repository.js';
import type { EmailSender } from '../../domain/ports/email.sender.js';
import { AuthService } from '../../domain/services/auth.service.js';
import type { Membership, UserRole } from '@pet/shared';

export interface InviteMemberDeps {
  userRepository: UserRepository;
  membershipRepository: MembershipRepository;
  tenantRepository: TenantRepository;
  emailSender: EmailSender;
  authService: AuthService;
  appBaseUrl: string;
}

export interface InviteMemberInput {
  email: string;
  name?: string;
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
        name: input.name ?? '',
        createdAt: new Date().toISOString(),
      };
      await this.deps.userRepository.save(user);
    } else if (input.name && !user.name) {
      user = { ...user, name: input.name };
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
      // role is constrained to the tenant role enum by InviteUserSchema and the
      // caller is club_admin (highest tenant role) — delegation, not escalation
      role: input.role,
    };

    await this.deps.membershipRepository.save(membership);

    if (input.teamIds?.length) {
      await Promise.all(
        input.teamIds.map((teamId) => this.deps.membershipRepository.assignTeam(membership.id, teamId)),
      );
    }

    // Send invite email with a ready-to-use magic link
    const tenant = await this.deps.tenantRepository.findById(tenantId);
    const token = this.deps.authService.generateMagicLinkToken();
    await this.deps.userRepository.saveMagicLinkToken(user.id, token.hash, token.expiresAt);
    const base = this.deps.appBaseUrl.replace(/\/$/, '');
    const magicLinkUrl = `${base}/auth/verify?token=${token.raw}`;

    await this.deps.emailSender.sendMagicLink({
      to: user.email,
      magicLinkUrl,
      userName: user.name || undefined,
      inviteContext: {
        tenantName: tenant?.name ?? 'deinem Club',
        role: input.role,
      },
    }).catch(() => {
      // Don't fail the invite if email delivery fails — membership is already created
    });

    return membership;
  }
}
