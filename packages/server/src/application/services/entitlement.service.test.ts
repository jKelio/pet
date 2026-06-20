import { describe, it, expect } from 'bun:test';
import type { Tenant, TenantPlan, TenantUsage } from '@pet/shared';
import type { TenantRepository } from '../../domain/ports/user.repository.js';
import type { UsageRepository } from '../../domain/ports/usage.repository.js';
import {
  EntitlementService,
  UpgradeRequiredError,
  QuotaExceededError,
  EntitlementTenantNotFoundError,
} from './entitlement.service.js';

const TENANT_ID = 'tenant-1';

function makeService(plan: TenantPlan | null, usage: Partial<TenantUsage> = {}) {
  const tenantRepository: TenantRepository = {
    async findById(id) {
      if (plan === null) return null;
      return { id, name: 'Club', slug: 'club', plan, createdAt: new Date().toISOString() } as Tenant;
    },
    findBySlug: async () => null,
    findAll: async () => [],
    save: async () => {},
    updatePlan: async () => null,
    delete: async () => {},
  };
  const usageRepository: UsageRepository = {
    async getUsage() {
      return { seats: 0, teams: 0, syncThisPeriod: 0, pdfThisPeriod: 0, ...usage };
    },
  };
  return new EntitlementService({ tenantRepository, usageRepository });
}

describe('getSnapshot', () => {
  it('resolves plan + usage', async () => {
    const svc = makeService('pro', { syncThisPeriod: 3 });
    const snapshot = await svc.getSnapshot(TENANT_ID);
    expect(snapshot.plan).toBe('pro');
    expect(snapshot.sync).toEqual({ limit: 10, used: 3, remaining: 7, allowed: true });
  });

  it('throws when the tenant is gone', async () => {
    const svc = makeService(null);
    await expect(svc.getSnapshot(TENANT_ID)).rejects.toBeInstanceOf(EntitlementTenantNotFoundError);
  });
});

describe('assertCanSync', () => {
  it('blocks free with UPGRADE_REQUIRED (sync disabled on plan)', async () => {
    const svc = makeService('free');
    await expect(svc.assertCanSync(TENANT_ID)).rejects.toBeInstanceOf(UpgradeRequiredError);
  });

  it('blocks pro that spent its 10 syncs with QUOTA_EXCEEDED', async () => {
    const svc = makeService('pro', { syncThisPeriod: 10 });
    await expect(svc.assertCanSync(TENANT_ID)).rejects.toBeInstanceOf(QuotaExceededError);
  });

  it('allows pro under the cap', async () => {
    const svc = makeService('pro', { syncThisPeriod: 9 });
    await expect(svc.assertCanSync(TENANT_ID)).resolves.toBeDefined();
  });
});

describe('assertCanUseAi', () => {
  it('blocks free with UPGRADE_REQUIRED', async () => {
    const svc = makeService('free');
    await expect(svc.assertCanUseAi(TENANT_ID)).rejects.toBeInstanceOf(UpgradeRequiredError);
  });

  it('allows premium', async () => {
    const svc = makeService('premium');
    await expect(svc.assertCanUseAi(TENANT_ID)).resolves.toBeDefined();
  });
});

describe('assertCanExportPdf', () => {
  it('allows free under the 2/month cap', async () => {
    const svc = makeService('free', { pdfThisPeriod: 1 });
    await expect(svc.assertCanExportPdf(TENANT_ID)).resolves.toBeDefined();
  });

  it('blocks free at the cap with QUOTA_EXCEEDED', async () => {
    const svc = makeService('free', { pdfThisPeriod: 2 });
    await expect(svc.assertCanExportPdf(TENANT_ID)).rejects.toBeInstanceOf(QuotaExceededError);
  });
});

describe('capacity checks', () => {
  it('assertCanInviteMember blocks free at 1 seat with UPGRADE_REQUIRED', async () => {
    const svc = makeService('free', { seats: 1 });
    await expect(svc.assertCanInviteMember(TENANT_ID)).rejects.toBeInstanceOf(UpgradeRequiredError);
  });

  it('assertCanCreateTeam blocks free at 1 team with UPGRADE_REQUIRED', async () => {
    const svc = makeService('free', { teams: 1 });
    await expect(svc.assertCanCreateTeam(TENANT_ID)).rejects.toBeInstanceOf(UpgradeRequiredError);
  });

  it('assertCanCreateTeam allows premium at any count', async () => {
    const svc = makeService('premium', { teams: 5000 });
    await expect(svc.assertCanCreateTeam(TENANT_ID)).resolves.toBeDefined();
  });
});
