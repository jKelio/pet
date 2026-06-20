import type { TenantUsage } from '@pet/shared';

export interface UsageRepository {
  /**
   * Current capacity usage (seats, teams) and this-period consumption
   * (synced sessions, PDF Reports) for a tenant. `period` is a `YYYY-MM` key.
   */
  getUsage(tenantId: string, period: string): Promise<TenantUsage>;
}
