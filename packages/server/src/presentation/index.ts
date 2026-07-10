import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import fp from 'fastify-plugin';
import diPlugin from './plugins/di.plugin.js';
import authMiddlewarePlugin from './middleware/auth.middleware.js';
import superAdminMiddlewarePlugin from './middleware/superadmin.middleware.js';
import { registerAuthRoutes } from './routes/auth.routes.js';
import { registerSessionRoutes } from './routes/session.routes.js';
import { registerAdminRoutes } from './routes/admin.routes.js';
import { registerSuperAdminRoutes } from './routes/superadmin.routes.js';
import { registerLibraryRoutes } from './routes/library.routes.js';
import { registerRecommendationRoutes } from './routes/recommendation.routes.js';
import { registerPdfRoutes } from './routes/pdf.routes.js';
import { registerFeedbackRoutes } from './routes/feedback.routes.js';

function getConfig() {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'APP_BASE_URL', 'SMTP_FROM'];
  for (const key of required) {
    if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
  }

  const jwtSecret = process.env.JWT_SECRET!;
  if (jwtSecret.length < 32 || jwtSecret === 'change_me_to_a_long_random_string') {
    throw new Error(
      'JWT_SECRET must be at least 32 characters and must not be the .env.example placeholder. Generate one with: openssl rand -base64 64',
    );
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
    resendApiKey: process.env.RESEND_API_KEY || undefined,
    geminiApiKey: process.env.GEMINI_API_KEY || undefined,
    geminiModel: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
    githubPat: process.env.GITHUB_PAT || undefined,
    appBaseUrl: process.env.APP_BASE_URL!,
    isProduction: process.env.NODE_ENV === 'production',
    port: parseInt(process.env.PORT ?? '3000', 10),
    host: process.env.HOST ?? '0.0.0.0',
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    refreshTokenCookieName: 'pet_refresh_token',
    superAdminEmails: (process.env.SUPER_ADMIN_EMAILS ?? '')
      .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
  };
}

async function build() {
  const config = getConfig();

  const fastify = Fastify({
    // Explicit body size cap (matches the Fastify default); sync payloads stay well below this
    bodyLimit: 1_048_576,
    logger: {
      level: config.isProduction ? 'info' : 'debug',
    },
    // Behind nginx (and Render's edge) — derive request.ip from X-Forwarded-For
    // so the rate limiter buckets per real client instead of the proxy IP.
    trustProxy: true,
  });

  // Security headers — CSP is handled by the web tier; this is a JSON API
  await fastify.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

  // CORS
  await fastify.register(cors, {
    origin: config.corsOrigin,
    credentials: true,
  });

  // Cookies
  await fastify.register(cookie);

  // Multipart (for app-feedback screenshot upload)
  await fastify.register(multipart);

  // Rate limiting — applied globally; magic-link route has a stricter override
  await fastify.register(rateLimit, {
    global: true,
    max: 60,
    timeWindow: '1 minute',
  });

  // Dependency Injection
  await fastify.register(diPlugin, config);

  // Auth middleware decorator
  await fastify.register(fp(authMiddlewarePlugin), {
    tokenService: fastify.tokenService,
    userRepository: fastify.repos.user,
  });
  await fastify.register(fp(superAdminMiddlewarePlugin), { superAdminEmails: config.superAdminEmails });

  // Routes
  registerAuthRoutes(fastify, {
    sendMagicLink: fastify.useCases.sendMagicLink,
    verifyMagicLink: fastify.useCases.verifyMagicLink,
    refreshSession: fastify.useCases.refreshSession,
    getMyTenants: fastify.useCases.getMyTenants,
    switchTenant: fastify.useCases.switchTenant,
    refreshTokenCookieName: config.refreshTokenCookieName,
    isProduction: config.isProduction,
  });

  await fastify.register(async (scope) => {
    registerSessionRoutes(scope, {
      syncSession: fastify.useCases.syncSession,
      deleteSession: fastify.useCases.deleteSession,
      listTeamSessions: fastify.useCases.listTeamSessions,
      getSession: fastify.useCases.getSession,
    });
  });

  await fastify.register(async (scope) => {
    registerAdminRoutes(scope, {
      getMyProfile: fastify.useCases.getMyProfile,
      onboardTenant: fastify.useCases.onboardTenant,
      createTeam: fastify.useCases.createTeam,
      listMembers: fastify.useCases.listMembers,
      inviteMember: fastify.useCases.inviteMember,
      removeMember: fastify.useCases.removeMember,
      updateMember: fastify.useCases.updateMember,
      teamRepository: fastify.repos.team,
    });
  });

  await fastify.register(async (scope) => {
    registerSuperAdminRoutes(scope, {
      listTenants: fastify.useCases.superAdminListTenants,
      deleteTenant: fastify.useCases.superAdminDeleteTenant,
      addClubAdmin: fastify.useCases.superAdminAddClubAdmin,
      setPlan: fastify.useCases.superAdminSetPlan,
      onboardTenant: fastify.useCases.onboardTenant,
      listUsers: fastify.useCases.superAdminListUsers,
      deleteUser: fastify.useCases.superAdminDeleteUser,
    });
  });

  await fastify.register(async (scope) => {
    registerLibraryRoutes(scope, {
      listLibraryEntries: fastify.useCases.listLibraryEntries,
      createLibraryEntry: fastify.useCases.createLibraryEntry,
      updateLibraryEntry: fastify.useCases.updateLibraryEntry,
      deleteLibraryEntry: fastify.useCases.deleteLibraryEntry,
    });
  });

  await fastify.register(async (scope) => {
    registerRecommendationRoutes(scope, {
      generateRecommendation: fastify.useCases.generateRecommendation,
      getRecommendation: fastify.useCases.getRecommendation,
      entitlement: fastify.services.entitlement,
      geminiEnabled: fastify.geminiEnabled,
      pdfRenderer: fastify.services.pdfRenderer,
    });
  });

  await fastify.register(async (scope) => {
    registerPdfRoutes(scope, {
      generatePdfReport: fastify.useCases.generatePdfReport,
    });
  });

  await fastify.register(async (scope) => {
    registerFeedbackRoutes(scope, {
      githubPat: config.githubPat,
      userRepository: fastify.repos.user,
    });
  });

  // Health check — exempt from rate limiting so wakeup pings (free-tier cold
  // start) never trip the global limiter.
  fastify.get('/health', { config: { rateLimit: false } }, async () => ({ status: 'ok' }));

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
