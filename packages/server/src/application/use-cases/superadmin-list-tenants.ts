import type { TenantRepository } from '../../domain/ports/user.repository.js';
import type { Tenant } from '@pet/shared';

export class SuperAdminListTenantsUseCase {
  constructor(private readonly deps: { tenantRepository: TenantRepository }) {}

  async execute(): Promise<Tenant[]> {
    return this.deps.tenantRepository.findAll();
  }
}
