import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { SetPlanSchema } from '@pet/shared';
import type { SuperAdminListTenantsUseCase } from '../../application/use-cases/superadmin-list-tenants.js';
import type { SuperAdminDeleteTenantUseCase } from '../../application/use-cases/superadmin-delete-tenant.js';
import { NotFoundError as DeleteNotFoundError } from '../../application/use-cases/superadmin-delete-tenant.js';
import type { SuperAdminAddClubAdminUseCase } from '../../application/use-cases/superadmin-add-club-admin.js';
import { NotFoundError as AddNotFoundError, ConflictError } from '../../application/use-cases/superadmin-add-club-admin.js';
import type { SuperAdminSetPlanUseCase } from '../../application/use-cases/superadmin-set-plan.js';
import { NotFoundError as PlanNotFoundError } from '../../application/use-cases/superadmin-set-plan.js';
import type { OnboardTenantUseCase } from '../../application/use-cases/onboard-tenant.js';

interface SuperAdminRoutesDeps {
  listTenants: SuperAdminListTenantsUseCase;
  deleteTenant: SuperAdminDeleteTenantUseCase;
  addClubAdmin: SuperAdminAddClubAdminUseCase;
  setPlan: SuperAdminSetPlanUseCase;
  onboardTenant: OnboardTenantUseCase;
}

const CreateTenantSchema = z.object({
  tenantName: z.string().trim().min(1).max(100),
  teamName: z.string().trim().min(1).max(100),
  adminEmail: z.string().email(),
});

const AddAdminSchema = z.object({
  email: z.string().email(),
});

export function registerSuperAdminRoutes(fastify: FastifyInstance, deps: SuperAdminRoutesDeps): void {
  fastify.addHook('onRequest', fastify.authenticate);
  fastify.addHook('onRequest', fastify.requireSuperAdmin);

  // GET /superadmin/tenants
  fastify.get('/superadmin/tenants', async (_request, reply) => {
    const tenants = await deps.listTenants.execute();
    return reply.send(tenants);
  });

  // POST /superadmin/tenants — create tenant + first team + initial club_admin
  fastify.post('/superadmin/tenants', async (request, reply) => {
    const result = CreateTenantSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: result.error.issues[0].message, statusCode: 400 });
    }
    const { tenantName, teamName, adminEmail } = result.data;
    const onboarding = await deps.onboardTenant.execute({ tenantName, teamName }, request.userId);
    await deps.addClubAdmin.execute(onboarding.tenant.id, adminEmail).catch(() => {
      // Tenant was created — admin email may already be the onboarding user; ignore conflict
    });
    return reply.code(201).send(onboarding);
  });

  // DELETE /superadmin/tenants/:id
  fastify.delete('/superadmin/tenants/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await deps.deleteTenant.execute(id);
      return reply.code(204).send();
    } catch (err) {
      if (err instanceof DeleteNotFoundError) {
        return reply.code(404).send({ code: 'NOT_FOUND', message: err.message, statusCode: 404 });
      }
      throw err;
    }
  });

  // PATCH /superadmin/tenants/:id/plan — set a tenant's subscription plan
  fastify.patch('/superadmin/tenants/:id/plan', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = SetPlanSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: result.error.issues[0].message, statusCode: 400 });
    }
    try {
      const tenant = await deps.setPlan.execute(id, result.data.plan);
      return reply.send(tenant);
    } catch (err) {
      if (err instanceof PlanNotFoundError) {
        return reply.code(404).send({ code: 'NOT_FOUND', message: err.message, statusCode: 404 });
      }
      throw err;
    }
  });

  // POST /superadmin/tenants/:id/admins — add a club_admin by email
  fastify.post('/superadmin/tenants/:id/admins', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = AddAdminSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: result.error.issues[0].message, statusCode: 400 });
    }
    try {
      const membership = await deps.addClubAdmin.execute(id, result.data.email);
      return reply.code(201).send(membership);
    } catch (err) {
      if (err instanceof AddNotFoundError) {
        return reply.code(404).send({ code: 'NOT_FOUND', message: err.message, statusCode: 404 });
      }
      if (err instanceof ConflictError) {
        return reply.code(409).send({ code: 'CONFLICT', message: err.message, statusCode: 409 });
      }
      throw err;
    }
  });
}
