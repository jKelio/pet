import type { FastifyInstance } from 'fastify';
import type { SendMagicLinkUseCase } from '../../application/use-cases/send-magic-link.js';
import type { VerifyMagicLinkUseCase } from '../../application/use-cases/verify-magic-link.js';
import { SendMagicLinkSchema, VerifyMagicLinkSchema } from '@pet/shared';
import { InvalidTokenError, ExpiredTokenError } from '../../application/use-cases/verify-magic-link.js';

interface AuthRoutesDeps {
  sendMagicLink: SendMagicLinkUseCase;
  verifyMagicLink: VerifyMagicLinkUseCase;
  refreshTokenCookieName: string;
  isProduction: boolean;
}

export function registerAuthRoutes(fastify: FastifyInstance, deps: AuthRoutesDeps): void {
  // POST /auth/magic-link — request a magic link email
  fastify.post('/auth/magic-link', async (request, reply) => {
    const result = SendMagicLinkSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({
        code: 'VALIDATION_ERROR',
        message: result.error.issues[0].message,
        statusCode: 400,
      });
    }

    // Always return 200 to prevent email enumeration
    await deps.sendMagicLink.execute(result.data.email).catch(() => {
      // Log but don't expose errors — prevents email enumeration
      fastify.log.error('Failed to send magic link');
    });

    return reply.code(200).send({ message: 'If this email exists, a login link has been sent.' });
  });

  // POST /auth/verify — verify magic link token, issue JWT
  fastify.post('/auth/verify', async (request, reply) => {
    const result = VerifyMagicLinkSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({
        code: 'VALIDATION_ERROR',
        message: result.error.issues[0].message,
        statusCode: 400,
      });
    }

    try {
      const { accessToken, refreshToken, user } = await deps.verifyMagicLink.execute(result.data.token);

      reply.setCookie(deps.refreshTokenCookieName, refreshToken, {
        httpOnly: true,
        secure: deps.isProduction,
        sameSite: 'lax',
        path: '/auth/refresh',
        maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
      });

      return reply.code(200).send({
        accessToken,
        user: { id: user.id, email: user.email, name: user.name },
      });
    } catch (error) {
      if (error instanceof InvalidTokenError || error instanceof ExpiredTokenError) {
        return reply.code(401).send({
          code: 'INVALID_TOKEN',
          message: error.message,
          statusCode: 401,
        });
      }
      throw error;
    }
  });

  // POST /auth/logout — clear refresh token cookie
  fastify.post('/auth/logout', async (request, reply) => {
    reply.clearCookie(deps.refreshTokenCookieName, { path: '/auth/refresh' });
    return reply.code(200).send({ message: 'Logged out' });
  });
}
