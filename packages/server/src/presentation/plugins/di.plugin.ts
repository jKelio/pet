import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { createDbClient } from '../../infrastructure/db/client.js';
import { PgUserRepository, PgMembershipRepository } from '../../infrastructure/repositories/pg-user.repository.js';
import { PgTeamRepository, PgTenantRepository } from '../../infrastructure/repositories/pg-team.repository.js';
import { PgSessionRepository } from '../../infrastructure/repositories/pg-session.repository.js';
import { SmtpEmailSender } from '../../infrastructure/services/smtp-email.sender.js';
import { JoseTokenService } from '../../infrastructure/services/jose-token.service.js';
import { AuthService } from '../../domain/services/auth.service.js';
import { SendMagicLinkUseCase } from '../../application/use-cases/send-magic-link.js';
import { VerifyMagicLinkUseCase } from '../../application/use-cases/verify-magic-link.js';
import { SyncSessionUseCase } from '../../application/use-cases/sync-session.js';
import { GetMyProfileUseCase } from '../../application/use-cases/get-my-profile.js';
import { OnboardTenantUseCase } from '../../application/use-cases/onboard-tenant.js';
import { CreateTeamUseCase } from '../../application/use-cases/create-team.js';
import { RefreshSessionUseCase } from '../../application/use-cases/refresh-session.js';
import { ListMembersUseCase } from '../../application/use-cases/list-members.js';
import { InviteMemberUseCase } from '../../application/use-cases/invite-member.js';
import { RemoveMemberUseCase } from '../../application/use-cases/remove-member.js';
import { SuperAdminListTenantsUseCase } from '../../application/use-cases/superadmin-list-tenants.js';
import { SuperAdminDeleteTenantUseCase } from '../../application/use-cases/superadmin-delete-tenant.js';
import { SuperAdminAddClubAdminUseCase } from '../../application/use-cases/superadmin-add-club-admin.js';
import { GetMyTenantsUseCase } from '../../application/use-cases/get-my-tenants.js';
import { SwitchTenantUseCase } from '../../application/use-cases/switch-tenant.js';

export interface AppConfig {
  databaseUrl: string;
  jwtSecret: string;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user?: string;
    pass?: string;
    from: string;
  };
  appBaseUrl: string;
  isProduction: boolean;
  superAdminEmails: string[];
}

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig;
    useCases: {
      sendMagicLink: SendMagicLinkUseCase;
      verifyMagicLink: VerifyMagicLinkUseCase;
      syncSession: SyncSessionUseCase;
      getMyProfile: GetMyProfileUseCase;
      onboardTenant: OnboardTenantUseCase;
      createTeam: CreateTeamUseCase;
      refreshSession: RefreshSessionUseCase;
      listMembers: ListMembersUseCase;
      inviteMember: InviteMemberUseCase;
      removeMember: RemoveMemberUseCase;
      superAdminListTenants: SuperAdminListTenantsUseCase;
      superAdminDeleteTenant: SuperAdminDeleteTenantUseCase;
      superAdminAddClubAdmin: SuperAdminAddClubAdminUseCase;
      getMyTenants: GetMyTenantsUseCase;
      switchTenant: SwitchTenantUseCase;
    };
    repos: {
      session: PgSessionRepository;
      user: PgUserRepository;
      membership: PgMembershipRepository;
      team: PgTeamRepository;
      tenant: PgTenantRepository;
    };
    tokenService: JoseTokenService;
  }
}

const diPlugin: FastifyPluginAsync<AppConfig> = async (fastify, config) => {
  const db = createDbClient(config.databaseUrl);
  const tokenService = new JoseTokenService(config.jwtSecret);
  const emailSender = new SmtpEmailSender(config.smtp);
  const authService = new AuthService();

  // Repositories
  const userRepository = new PgUserRepository(db);
  const membershipRepository = new PgMembershipRepository(db);
  const sessionRepository = new PgSessionRepository(db);
  const teamRepository = new PgTeamRepository(db);
  const tenantRepository = new PgTenantRepository(db);

  // Use Cases
  const sendMagicLink = new SendMagicLinkUseCase({
    userRepository,
    emailSender,
    authService,
    appBaseUrl: config.appBaseUrl,
    superAdminEmails: config.superAdminEmails,
  });

  const verifyMagicLink = new VerifyMagicLinkUseCase({
    userRepository,
    membershipRepository,
    authService,
    tokenIssuer: tokenService,
  });

  const syncSession = new SyncSessionUseCase({
    sessionRepository,
    membershipRepository,
  });

  const getMyProfile = new GetMyProfileUseCase({
    userRepository,
    tenantRepository,
    teamRepository,
    membershipRepository,
  });

  const onboardTenant = new OnboardTenantUseCase({
    tenantRepository,
    teamRepository,
    membershipRepository,
  });

  const createTeam = new CreateTeamUseCase({
    teamRepository,
    membershipRepository,
  });

  const refreshSession = new RefreshSessionUseCase({
    tokenService,
    userRepository,
    membershipRepository,
  });

  const superAdminListTenants = new SuperAdminListTenantsUseCase({ tenantRepository });
  const superAdminDeleteTenant = new SuperAdminDeleteTenantUseCase({ tenantRepository });
  const superAdminAddClubAdmin = new SuperAdminAddClubAdminUseCase({ userRepository, membershipRepository, tenantRepository });
  const getMyTenants = new GetMyTenantsUseCase({ membershipRepository, tenantRepository });
  const switchTenant = new SwitchTenantUseCase({ userRepository, membershipRepository, tokenIssuer: tokenService });

  const listMembers = new ListMembersUseCase({ userRepository, membershipRepository });
  const inviteMember = new InviteMemberUseCase({
    userRepository,
    membershipRepository,
    tenantRepository,
    emailSender,
    authService,
    appBaseUrl: config.appBaseUrl,
  });
  const removeMember = new RemoveMemberUseCase({ membershipRepository });

  fastify.decorate('config', config);
  fastify.decorate('tokenService', tokenService);
  fastify.decorate('useCases', {
    sendMagicLink,
    verifyMagicLink,
    syncSession,
    getMyProfile,
    onboardTenant,
    createTeam,
    refreshSession,
    listMembers,
    inviteMember,
    removeMember,
    superAdminListTenants,
    superAdminDeleteTenant,
    superAdminAddClubAdmin,
    getMyTenants,
    switchTenant,
  });
  fastify.decorate('repos', {
    session: sessionRepository,
    user: userRepository,
    membership: membershipRepository,
    team: teamRepository,
    tenant: tenantRepository,
  });
};

export default fp(diPlugin, { name: 'di' });
