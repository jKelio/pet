import type {
  UserRepository,
  MembershipRepository,
  TenantRepository,
} from '../../domain/ports/user.repository.js';
import type { SuperAdminUserDto } from '@pet/shared';

export class SuperAdminListUsersUseCase {
  constructor(
    private readonly deps: {
      userRepository: UserRepository;
      membershipRepository: MembershipRepository;
      tenantRepository: TenantRepository;
    },
  ) {}

  async execute(): Promise<SuperAdminUserDto[]> {
    const [users, memberships, tenants] = await Promise.all([
      this.deps.userRepository.findAll(),
      this.deps.membershipRepository.findAll(),
      this.deps.tenantRepository.findAll(),
    ]);

    const tenantById = new Map(tenants.map((tenant) => [tenant.id, tenant]));

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      tenants: memberships
        .filter((membership) => membership.userId === user.id)
        .map((membership) => ({
          tenantId: membership.tenantId,
          tenantName: tenantById.get(membership.tenantId)?.name ?? '',
          role: membership.role,
        })),
    }));
  }
}
