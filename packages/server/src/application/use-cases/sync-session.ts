import type { SessionRepository } from '../../domain/ports/session.repository.js';
import type { MembershipRepository, TeamRepository } from '../../domain/ports/user.repository.js';
import type { PracticeSession } from '@pet/shared';
import type { SyncSessionInput } from '@pet/shared';
import { hasPermission } from '@pet/shared';

import type { EntitlementService } from '../services/entitlement.service.js';

export interface SyncSessionDeps {
  sessionRepository: SessionRepository;
  membershipRepository: MembershipRepository;
  teamRepository: TeamRepository;
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

    const team = await this.deps.teamRepository.findById(input.teamId, ctx.tenantId);

    // club_admin may track for any team; coaches on External Teams need no roster
    // assignment (all tenant coaches may observe any External Team's sessions).
    if (membership.role !== 'club_admin' && team?.kind !== 'external') {
      const teamIds = await this.deps.membershipRepository.getTeamIds(membership.id);
      if (!teamIds.includes(input.teamId)) {
        throw new UnauthorizedError('User is not assigned to this team');
      }
    }

    // Syncing to an External Team requires Premium, checked before metering.
    if (team?.kind === 'external') {
      await this.deps.entitlementService.assertCanUseExternalTeams(ctx.tenantId);
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
