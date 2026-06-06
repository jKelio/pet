import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    requireSuperAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const superAdminMiddleware: FastifyPluginAsync<{ superAdminEmails: string[] }> = async (fastify, opts) => {
  const allowlist = new Set(opts.superAdminEmails.map((e) => e.toLowerCase()));

  fastify.decorate('requireSuperAdmin', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!allowlist.has(request.userEmail.toLowerCase())) {
      return reply.code(403).send({ code: 'FORBIDDEN', message: 'SuperAdmin access required', statusCode: 403 });
    }
  });
};

export default fp(superAdminMiddleware, { name: 'superadmin-middleware', dependencies: ['auth-middleware'] });
