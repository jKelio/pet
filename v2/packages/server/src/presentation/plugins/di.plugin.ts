import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { createDbClient } from '../../infrastructure/db/client.js';
import { PgUserRepository, PgMembershipRepository } from '../../infrastructure/repositories/pg-user.repository.js';
import { PgSessionRepository } from '../../infrastructure/repositories/pg-session.repository.js';
import { ResendEmailSender } from '../../infrastructure/services/resend-email.sender.js';
import { JoseTokenService } from '../../infrastructure/services/jose-token.service.js';
import { AuthService } from '../../domain/services/auth.service.js';
import { SendMagicLinkUseCase } from '../../application/use-cases/send-magic-link.js';
import { VerifyMagicLinkUseCase } from '../../application/use-cases/verify-magic-link.js';
import { SyncSessionUseCase } from '../../application/use-cases/sync-session.js';

export interface AppConfig {
  databaseUrl: string;
  jwtSecret: string;
  resendApiKey: string;
  emailFromAddress: string;
  appBaseUrl: string;
  isProduction: boolean;
}

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig;
    useCases: {
      sendMagicLink: SendMagicLinkUseCase;
      verifyMagicLink: VerifyMagicLinkUseCase;
      syncSession: SyncSessionUseCase;
    };
    repos: {
      session: PgSessionRepository;
      user: PgUserRepository;
      membership: PgMembershipRepository;
    };
    tokenService: JoseTokenService;
  }
}

const diPlugin: FastifyPluginAsync<AppConfig> = async (fastify, config) => {
  // Infrastructure
  const db = createDbClient(config.databaseUrl);
  const tokenService = new JoseTokenService(config.jwtSecret);
  const emailSender = new ResendEmailSender(config.resendApiKey, config.emailFromAddress);
  const authService = new AuthService();

  // Repositories
  const userRepository = new PgUserRepository(db);
  const membershipRepository = new PgMembershipRepository(db);
  const sessionRepository = new PgSessionRepository(db);

  // Use Cases
  const sendMagicLink = new SendMagicLinkUseCase({
    userRepository,
    emailSender,
    authService,
    appBaseUrl: config.appBaseUrl,
  });

  const verifyMagicLink = new VerifyMagicLinkUseCase({
    userRepository,
    authService,
    tokenIssuer: tokenService,
  });

  const syncSession = new SyncSessionUseCase({
    sessionRepository,
    membershipRepository,
  });

  // Decorate fastify instance for access in route handlers
  fastify.decorate('config', config);
  fastify.decorate('tokenService', tokenService);
  fastify.decorate('useCases', { sendMagicLink, verifyMagicLink, syncSession });
  fastify.decorate('repos', { session: sessionRepository, user: userRepository, membership: membershipRepository });
};

export default fp(diPlugin, { name: 'di' });
