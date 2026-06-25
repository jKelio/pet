import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { CreateTeamSchema, CreateExternalTeamSchema, InviteUserSchema, UpdateMemberSchema } from '@pet/shared';
import type { GetMyProfileUseCase } from '../../application/use-cases/get-my-profile.js';
import type { OnboardTenantUseCase } from '../../application/use-cases/onboard-tenant.js';
import type { CreateTeamUseCase } from '../../application/use-cases/create-team.js';
import { ForbiddenError } from '../../application/use-cases/create-team.js';
import type { ListMembersUseCase } from '../../application/use-cases/list-members.js';
import type { InviteMemberUseCase } from '../../application/use-cases/invite-member.js';
import {
  ForbiddenError as InviteForbiddenError,
  ConflictError,
} from '../../application/use-cases/invite-member.js';
import type { RemoveMemberUseCase } from '../../application/use-cases/remove-member.js';
import {
  ForbiddenError as RemoveForbiddenError,
  NotFoundError,
} from '../../application/use-cases/remove-member.js';
import type { UpdateMemberUseCase } from '../../application/use-cases/update-member.js';
import {
  ForbiddenError as UpdateForbiddenError,
  NotFoundError as UpdateNotFoundError,
} from '../../application/use-cases/update-member.js';
import type { TeamRepository } from '../../domain/ports/user.repository.js';
import { isEntitlementError } from '../../application/services/entitlement.service.js';

const OnboardSchema = z.object({
  tenantName: z.string().trim().min(1).max(100),
  teamName: z.string().trim().min(1).max(100),
});

interface AdminRoutesDeps {
  getMyProfile: GetMyProfileUseCase;
  onboardTenant: OnboardTenantUseCase;
  createTeam: CreateTeamUseCase;
  listMembers: ListMembersUseCase;
  inviteMember: InviteMemberUseCase;
  removeMember: RemoveMemberUseCase;
  updateMember: UpdateMemberUseCase;
  teamRepository: TeamRepository;
}

export function registerAdminRoutes(fastify: FastifyInstance, deps: AdminRoutesDeps): void {
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /me — current user profile + tenant + teams
  fastify.get('/me', async (request, reply) => {
    const profile = await deps.getMyProfile.execute(request.userId, request.tenantId ?? null);
    return reply.send(profile);
  });

  // POST /onboarding — first-time setup: create tenant + first team
  fastify.post('/onboarding', async (request, reply) => {
    const result = OnboardSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({
        code: 'VALIDATION_ERROR',
        message: result.error.issues[0].message,
        statusCode: 400,
      });
    }
    const onboarding = await deps.onboardTenant.execute(result.data, request.userId);
    return reply.code(201).send(onboarding);
  });

  // POST /admin/teams — create a new team (admin only)
  fastify.post('/admin/teams', async (request, reply) => {
    const result = CreateTeamSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({
        code: 'VALIDATION_ERROR',
        message: result.error.issues[0].message,
        statusCode: 400,
      });
    }

    const tenantId = request.tenantId;
    if (!tenantId) {
      return reply.code(403).send({
        code: 'NO_TENANT',
        message: 'No tenant in token. Complete onboarding first.',
        statusCode: 403,
      });
    }

    try {
      const team = await deps.createTeam.execute({ name: result.data.name, ageClass: result.data.ageClass }, request.userId, tenantId);
      return reply.code(201).send(team);
    } catch (err: any) {
      if (err instanceof ForbiddenError) {
        return reply.code(403).send({ code: 'FORBIDDEN', message: err.message, statusCode: 403 });
      }
      if (isEntitlementError(err)) {
        return reply.code(err.statusCode).send({ code: err.code, message: err.message, statusCode: err.statusCode });
      }
      if (err?.code === 'TEAM_ALREADY_EXISTS') {
        return reply.code(409).send({ code: 'TEAM_ALREADY_EXISTS', message: err.message, statusCode: 409 });
      }
      throw err;
    }
  });

  // POST /admin/external-teams — create an External Team (admin + Premium only)
  fastify.post('/admin/external-teams', async (request, reply) => {
    const result = CreateExternalTeamSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({
        code: 'VALIDATION_ERROR',
        message: result.error.issues[0].message,
        statusCode: 400,
      });
    }

    const tenantId = request.tenantId;
    if (!tenantId) {
      return reply.code(403).send({
        code: 'NO_TENANT',
        message: 'No tenant in token. Complete onboarding first.',
        statusCode: 403,
      });
    }

    try {
      const team = await deps.createTeam.execute(
        { name: result.data.name, ageClass: result.data.ageClass, kind: 'external', externalClubName: result.data.externalClubName },
        request.userId,
        tenantId,
      );
      return reply.code(201).send(team);
    } catch (err: any) {
      if (err instanceof ForbiddenError) {
        return reply.code(403).send({ code: 'FORBIDDEN', message: err.message, statusCode: 403 });
      }
      if (isEntitlementError(err)) {
        return reply.code(err.statusCode).send({ code: err.code, message: err.message, statusCode: err.statusCode });
      }
      if (err?.code === 'TEAM_ALREADY_EXISTS') {
        return reply.code(409).send({ code: 'TEAM_ALREADY_EXISTS', message: err.message, statusCode: 409 });
      }
      throw err;
    }
  });

  // GET /admin/teams — list all teams for the tenant
  fastify.get('/admin/teams', async (request, reply) => {
    const tenantId = request.tenantId;
    if (!tenantId) {
      return reply.code(403).send({
        code: 'NO_TENANT',
        message: 'No tenant in token',
        statusCode: 403,
      });
    }
    const teams = await deps.teamRepository.findByTenant(tenantId);
    return reply.send(teams);
  });

  // GET /admin/members — list all members with user details
  fastify.get('/admin/members', async (request, reply) => {
    const tenantId = request.tenantId;
    if (!tenantId) {
      return reply.code(403).send({ code: 'NO_TENANT', message: 'No tenant in token', statusCode: 403 });
    }
    const members = await deps.listMembers.execute(tenantId);
    return reply.send(members);
  });

  // POST /admin/members — invite a user by email
  fastify.post('/admin/members', async (request, reply) => {
    const result = InviteUserSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({
        code: 'VALIDATION_ERROR',
        message: result.error.issues[0].message,
        statusCode: 400,
      });
    }

    const tenantId = request.tenantId;
    if (!tenantId) {
      return reply.code(403).send({ code: 'NO_TENANT', message: 'No tenant in token', statusCode: 403 });
    }

    try {
      const membership = await deps.inviteMember.execute(
        { email: result.data.email, name: result.data.name, role: result.data.role },
        request.userId,
        tenantId,
      );
      return reply.code(201).send(membership);
    } catch (err) {
      if (err instanceof InviteForbiddenError) {
        return reply.code(403).send({ code: 'FORBIDDEN', message: err.message, statusCode: 403 });
      }
      if (err instanceof ConflictError) {
        return reply.code(409).send({ code: 'CONFLICT', message: err.message, statusCode: 409 });
      }
      if (isEntitlementError(err)) {
        return reply.code(err.statusCode).send({ code: err.code, message: err.message, statusCode: err.statusCode });
      }
      throw err;
    }
  });

  // PATCH /admin/members/:id — update a member's user name
  fastify.patch('/admin/members/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = UpdateMemberSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({
        code: 'VALIDATION_ERROR',
        message: result.error.issues[0].message,
        statusCode: 400,
      });
    }

    const tenantId = request.tenantId;
    if (!tenantId) {
      return reply.code(403).send({ code: 'NO_TENANT', message: 'No tenant in token', statusCode: 403 });
    }

    try {
      const user = await deps.updateMember.execute(id, result.data.name, request.userId, tenantId);
      return reply.send(user);
    } catch (err) {
      if (err instanceof UpdateForbiddenError) {
        return reply.code(403).send({ code: 'FORBIDDEN', message: err.message, statusCode: 403 });
      }
      if (err instanceof UpdateNotFoundError) {
        return reply.code(404).send({ code: 'NOT_FOUND', message: err.message, statusCode: 404 });
      }
      throw err;
    }
  });

  // DELETE /admin/members/:id — remove a member
  fastify.delete('/admin/members/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenantId;
    if (!tenantId) {
      return reply.code(403).send({ code: 'NO_TENANT', message: 'No tenant in token', statusCode: 403 });
    }

    try {
      await deps.removeMember.execute(id, request.userId, tenantId);
      return reply.code(204).send();
    } catch (err) {
      if (err instanceof RemoveForbiddenError) {
        return reply.code(403).send({ code: 'FORBIDDEN', message: err.message, statusCode: 403 });
      }
      if (err instanceof NotFoundError) {
        return reply.code(404).send({ code: 'NOT_FOUND', message: err.message, statusCode: 404 });
      }
      throw err;
    }
  });
}
