import { resolveEntitlements, currentPeriod } from '@pet/shared';
import type { EntitlementSnapshot } from '@pet/shared';
import type { TenantRepository } from '../../domain/ports/user.repository.js';
import type { UsageRepository } from '../../domain/ports/usage.repository.js';

/** The club must move to a higher plan to perform this action (feature off, or capacity reached). */
export class UpgradeRequiredError extends Error {
  readonly statusCode = 403;
  readonly code = 'UPGRADE_REQUIRED';
  constructor(message: string, readonly feature: string) {
    super(message);
    this.name = 'UpgradeRequiredError';
  }
}

/** The feature is on the plan, but this month's allowance is spent. */
export class QuotaExceededError extends Error {
  readonly statusCode = 429;
  readonly code = 'QUOTA_EXCEEDED';
  constructor(message: string, readonly feature: string) {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

export class EntitlementTenantNotFoundError extends Error {
  readonly statusCode = 403;
  readonly code = 'NO_TENANT';
  constructor() {
    super('Tenant not found');
    this.name = 'EntitlementTenantNotFoundError';
  }
}

/** True for the gated-action errors that map directly to an HTTP response envelope. */
export function isEntitlementError(e: unknown): e is UpgradeRequiredError | QuotaExceededError {
  return e instanceof UpgradeRequiredError || e instanceof QuotaExceededError;
}

export interface EntitlementServiceDeps {
  tenantRepository: TenantRepository;
  usageRepository: UsageRepository;
}

/**
 * Resolves a tenant's plan + current usage into an entitlement snapshot, and
 * asserts individual gated actions. Capacity over-limit and disabled-on-plan
 * features raise `UpgradeRequiredError` (403); a spent monthly allowance raises
 * `QuotaExceededError` (429). See docs/adr/0008-tenant-plan-entitlement-gating.md.
 */
export class EntitlementService {
  constructor(private readonly deps: EntitlementServiceDeps) {}

  async getSnapshot(tenantId: string, now: Date = new Date()): Promise<EntitlementSnapshot> {
    const tenant = await this.deps.tenantRepository.findById(tenantId);
    if (!tenant) throw new EntitlementTenantNotFoundError();
    const usage = await this.deps.usageRepository.getUsage(tenantId, currentPeriod(now));
    return resolveEntitlements(tenant.plan, usage);
  }

  // ── Capacity features: over-limit ⇒ upgrade to a higher tier ──

  async assertCanInviteMember(tenantId: string): Promise<EntitlementSnapshot> {
    const snapshot = await this.getSnapshot(tenantId);
    if (!snapshot.seats.allowed) {
      throw new UpgradeRequiredError(
        `Your plan is limited to ${snapshot.seats.limit} member(s). Upgrade to add more.`,
        'seats',
      );
    }
    return snapshot;
  }

  async assertCanCreateTeam(tenantId: string): Promise<EntitlementSnapshot> {
    const snapshot = await this.getSnapshot(tenantId);
    if (!snapshot.teams.allowed) {
      throw new UpgradeRequiredError(
        `Your plan is limited to ${snapshot.teams.limit} team(s). Upgrade to add more.`,
        'teams',
      );
    }
    return snapshot;
  }

  // ── Boolean feature ──

  async assertCanUseAi(tenantId: string): Promise<EntitlementSnapshot> {
    const snapshot = await this.getSnapshot(tenantId);
    if (!snapshot.ai.allowed) {
      throw new UpgradeRequiredError('AI analysis requires a Pro or Premium plan.', 'ai');
    }
    return snapshot;
  }

  // ── Consumption features: disabled-on-plan ⇒ upgrade; allowance spent ⇒ quota ──

  async assertCanSync(tenantId: string): Promise<EntitlementSnapshot> {
    const snapshot = await this.getSnapshot(tenantId);
    if (snapshot.sync.allowed) return snapshot;
    if (snapshot.sync.limit === 0) {
      throw new UpgradeRequiredError('Cloud sync requires a Pro or Premium plan.', 'sync');
    }
    throw new QuotaExceededError(
      `You have used all ${snapshot.sync.limit} cloud syncs this month.`,
      'sync',
    );
  }

  /**
   * Asserts a *new* PDF Report may be generated. A re-export of a session already
   * recorded this period is free and must bypass this check (handled by the caller
   * against the PDF ledger).
   */
  async assertCanExportPdf(tenantId: string): Promise<EntitlementSnapshot> {
    const snapshot = await this.getSnapshot(tenantId);
    if (snapshot.pdf.allowed) return snapshot;
    if (snapshot.pdf.limit === 0) {
      throw new UpgradeRequiredError('PDF export is not available on your plan.', 'pdf');
    }
    throw new QuotaExceededError(
      `You have used all ${snapshot.pdf.limit} PDF exports this month.`,
      'pdf',
    );
  }
}
