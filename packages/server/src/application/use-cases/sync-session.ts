import type { SessionRepository } from '../../domain/ports/session.repository.js';
import type { MembershipRepository } from '../../domain/ports/user.repository.js';
import type { PracticeSession } from '@pet/shared';
import type { SyncSessionInput } from '@pet/shared';
import { hasPermission } from '@pet/shared';

import type { EntitlementService } from '../services/entitlement.service.js';

export interface SyncSessionDeps {
  sessionRepository: SessionRepository;
  membershipRepository: MembershipRepository;
  entitlementService: EntitlementService;
}

export interface SyncSessionContext {
  userId: string;
  tenantId: string;
}

export class SyncSessionUseCase {
  constructor(private readonly deps: SyncSessionDeps) {}

  async execute(input: SyncSessionInput, ctx: SyncSessionContext): Promise<PracticeSession> {
    const membership = await this.deps.membershipRepository.findByUserAndTenant(
      ctx.userId,
      ctx.tenantId,
    );

    if (!membership) {
      throw new UnauthorizedError('User is not a member of this tenant');
    }

    if (!hasPermission(membership.role, 'sessions:track')) {
      throw new UnauthorizedError('Role is not allowed to track sessions');
    }

    // club_admin may track for any team in the tenant; everyone else must be
    // assigned to the team they are tracking for.
    if (membership.role !== 'club_admin') {
      const teamIds = await this.deps.membershipRepository.getTeamIds(membership.id);
      if (!teamIds.includes(input.teamId)) {
        throw new UnauthorizedError('User is not assigned to this team');
      }
    }

    const existing = await this.deps.sessionRepository.findById(input.id, ctx.tenantId);

    // Re-syncing an already-stored session is free (idempotent metering); only a
    // brand-new session consumes the tenant's monthly Cloud Sync allowance.
    if (!existing) {
      await this.deps.entitlementService.assertCanSync(ctx.tenantId);
    }

    const now = new Date().toISOString();

    const session: PracticeSession = {
      id: input.id,
      tenantId: ctx.tenantId,
      teamId: input.teamId,
      createdBy: ctx.userId,
      practiceInfo: input.practiceInfo,
      drills: input.drills,
      status: 'completed',
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    await this.deps.sessionRepository.save(session);
    return session;
  }
}

export class UnauthorizedError extends Error {
  readonly statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}
