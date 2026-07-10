import type { FastifyRequest, FastifyReply, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import type { JoseTokenService } from '../../infrastructure/services/jose-token.service.js';
import type { UserRepository } from '../../domain/ports/user.repository.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    userId: string;
    userEmail: string;
    tenantId: string | undefined;
  }
}

const authMiddleware: FastifyPluginAsync<{
  tokenService: JoseTokenService;
  userRepository: UserRepository;
}> = async (fastify, opts) => {
  fastify.decorateRequest('userId', '');
  fastify.decorateRequest('userEmail', '');
  fastify.decorateRequest('tenantId', undefined);

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Missing Bearer token', statusCode: 401 });
    }

    const token = authHeader.slice(7);
    let verified;
    try {
      verified = await opts.tokenService.verify(token);
    } catch {
      return reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Invalid or expired token', statusCode: 401 });
    }

    if (verified.type !== 'access') {
      return reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Invalid token type', statusCode: 401 });
    }

    // Tokens are stateless, so a deleted user's access token stays formally
    // valid — reject it here so removal locks the account out immediately.
    const user = await opts.userRepository.findById(verified.userId);
    if (!user) {
      return reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Invalid or expired token', statusCode: 401 });
    }

    request.userId = verified.userId;
    request.userEmail = verified.email;
    request.tenantId = verified.tenantId;
  });
};

export default fp(authMiddleware, { name: 'auth-middleware' });
