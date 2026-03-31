import type { TenantRepository } from '../../domain/ports/user.repository.js';

export class NotFoundError extends Error {
  readonly statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class SuperAdminDeleteTenantUseCase {
  constructor(private readonly deps: { tenantRepository: TenantRepository }) {}

  async execute(tenantId: string): Promise<void> {
    const tenant = await this.deps.tenantRepository.findById(tenantId);
    if (!tenant) throw new NotFoundError('Tenant not found');
    await this.deps.tenantRepository.delete(tenantId);
  }
}
