import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import fp from 'fastify-plugin';
import diPlugin from './plugins/di.plugin.js';
import authMiddlewarePlugin from './middleware/auth.middleware.js';
import { registerAuthRoutes } from './routes/auth.routes.js';
import { registerSessionRoutes } from './routes/session.routes.js';
import { registerAdminRoutes } from './routes/admin.routes.js';

function getConfig() {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'APP_BASE_URL', 'SMTP_FROM'];
  for (const key of required) {
    if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
  }

  return {
    databaseUrl: process.env.DATABASE_URL!,
    jwtSecret: process.env.JWT_SECRET!,
    smtp: {
      host: process.env.SMTP_HOST ?? 'localhost',
      port: parseInt(process.env.SMTP_PORT ?? '1025', 10),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || undefined,
      pass: process.env.SMTP_PASS || undefined,
      from: process.env.SMTP_FROM!,
    },
    appBaseUrl: process.env.APP_BASE_URL!,
    isProduction: process.env.NODE_ENV === 'production',
    port: parseInt(process.env.PORT ?? '3000', 10),
    host: process.env.HOST ?? '0.0.0.0',
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    refreshTokenCookieName: 'pet_refresh_token',
  };
}

async function build() {
  const config = getConfig();

  const fastify = Fastify({
    logger: {
      level: config.isProduction ? 'info' : 'debug',
    },
  });

  // CORS
  await fastify.register(cors, {
    origin: config.corsOrigin,
    credentials: true,
  });

  // Cookies
  await fastify.register(cookie);

  // Rate limiting — applied globally; magic-link route has a stricter override
  await fastify.register(rateLimit, {
    global: true,
    max: 60,
    timeWindow: '1 minute',
  });

  // Dependency Injection
  await fastify.register(diPlugin, config);

  // Auth middleware decorator
  await fastify.register(fp(authMiddlewarePlugin), { tokenService: fastify.tokenService });

  // Routes
  registerAuthRoutes(fastify, {
    sendMagicLink: fastify.useCases.sendMagicLink,
    verifyMagicLink: fastify.useCases.verifyMagicLink,
    refreshSession: fastify.useCases.refreshSession,
    refreshTokenCookieName: config.refreshTokenCookieName,
    isProduction: config.isProduction,
  });

  registerSessionRoutes(fastify, {
    syncSession: fastify.useCases.syncSession,
    sessionRepository: fastify.repos.session,
  });

  registerAdminRoutes(fastify, {
    getMyProfile: fastify.useCases.getMyProfile,
    onboardTenant: fastify.useCases.onboardTenant,
    createTeam: fastify.useCases.createTeam,
    listMembers: fastify.useCases.listMembers,
    inviteMember: fastify.useCases.inviteMember,
    removeMember: fastify.useCases.removeMember,
    teamRepository: fastify.repos.team,
  });

  // Health check
  fastify.get('/health', async () => ({ status: 'ok' }));

  return { fastify, config };
}

async function main() {
  const { fastify, config } = await build();
  try {
    await fastify.listen({ port: config.port, host: config.host });
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}

main();
