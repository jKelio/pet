import type { MembershipRepository, TenantRepository } from '../../domain/ports/user.repository.js';
import type { TenantMembership } from '@pet/shared';

export interface GetMyTenantsDeps {
  membershipRepository: MembershipRepository;
  tenantRepository: TenantRepository;
}

export class GetMyTenantsUseCase {
  constructor(private readonly deps: GetMyTenantsDeps) {}

  async execute(userId: string): Promise<TenantMembership[]> {
    const memberships = await this.deps.membershipRepository.findByUser(userId);

    const results = await Promise.all(
      memberships.map(async (m) => {
        const tenant = await this.deps.tenantRepository.findById(m.tenantId);
        if (!tenant) return null;
        return { tenantId: m.tenantId, tenantName: tenant.name, role: m.role } satisfies TenantMembership;
      }),
    );

    return results.filter((r): r is TenantMembership => r !== null);
  }
}
