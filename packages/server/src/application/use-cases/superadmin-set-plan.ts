import type { TenantRepository } from '../../domain/ports/user.repository.js';
import type { Tenant, TenantPlan } from '@pet/shared';

export class NotFoundError extends Error {
  readonly statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

/**
 * Sets a tenant's subscription plan. The manual lever behind the paywall until a
 * payment provider is wired in (which will write the same field). Superadmin-only.
 * See docs/adr/0008-tenant-plan-entitlement-gating.md.
 */
export class SuperAdminSetPlanUseCase {
  constructor(private readonly deps: { tenantRepository: TenantRepository }) {}

  async execute(tenantId: string, plan: TenantPlan): Promise<Tenant> {
    const tenant = await this.deps.tenantRepository.updatePlan(tenantId, plan);
    if (!tenant) throw new NotFoundError('Tenant not found');
    return tenant;
  }
}
