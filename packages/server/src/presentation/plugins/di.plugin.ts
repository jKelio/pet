import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { createDbClient } from '../../infrastructure/db/client.js';
import { PgUserRepository, PgMembershipRepository } from '../../infrastructure/repositories/pg-user.repository.js';
import { PgTeamRepository, PgTenantRepository } from '../../infrastructure/repositories/pg-team.repository.js';
import { PgSessionRepository } from '../../infrastructure/repositories/pg-session.repository.js';
import { SmtpEmailSender } from '../../infrastructure/services/smtp-email.sender.js';
import { ResendEmailSender } from '../../infrastructure/services/resend-email.sender.js';
import { JoseTokenService } from '../../infrastructure/services/jose-token.service.js';
import { AuthService } from '../../domain/services/auth.service.js';
import { SendMagicLinkUseCase } from '../../application/use-cases/send-magic-link.js';
import { VerifyMagicLinkUseCase } from '../../application/use-cases/verify-magic-link.js';
import { SyncSessionUseCase } from '../../application/use-cases/sync-session.js';
import { DeleteSessionUseCase } from '../../application/use-cases/delete-session.js';
import { ListTeamSessionsUseCase } from '../../application/use-cases/list-team-sessions.js';
import { GetSessionUseCase } from '../../application/use-cases/get-session.js';
import { GetMyProfileUseCase } from '../../application/use-cases/get-my-profile.js';
import { OnboardTenantUseCase } from '../../application/use-cases/onboard-tenant.js';
import { CreateTeamUseCase } from '../../application/use-cases/create-team.js';
import { DeleteTeamUseCase } from '../../application/use-cases/delete-team.js';
import { RefreshSessionUseCase } from '../../application/use-cases/refresh-session.js';
import { ListMembersUseCase } from '../../application/use-cases/list-members.js';
import { InviteMemberUseCase } from '../../application/use-cases/invite-member.js';
import { RemoveMemberUseCase } from '../../application/use-cases/remove-member.js';
import { UpdateMemberUseCase } from '../../application/use-cases/update-member.js';
import { SuperAdminListTenantsUseCase } from '../../application/use-cases/superadmin-list-tenants.js';
import { SuperAdminDeleteTenantUseCase } from '../../application/use-cases/superadmin-delete-tenant.js';
import { SuperAdminAddClubAdminUseCase } from '../../application/use-cases/superadmin-add-club-admin.js';
import { SuperAdminSetPlanUseCase } from '../../application/use-cases/superadmin-set-plan.js';
import { SuperAdminListUsersUseCase } from '../../application/use-cases/superadmin-list-users.js';
import { SuperAdminDeleteUserUseCase } from '../../application/use-cases/superadmin-delete-user.js';
import { GetMyTenantsUseCase } from '../../application/use-cases/get-my-tenants.js';
import { SwitchTenantUseCase } from '../../application/use-cases/switch-tenant.js';
import { ListLibraryEntriesUseCase } from '../../application/use-cases/list-library-entries.js';
import { CreateLibraryEntryUseCase } from '../../application/use-cases/create-library-entry.js';
import { UpdateLibraryEntryUseCase } from '../../application/use-cases/update-library-entry.js';
import { DeleteLibraryEntryUseCase } from '../../application/use-cases/delete-library-entry.js';
import { GenerateRecommendationUseCase } from '../../application/use-cases/generate-recommendation.js';
import { GetRecommendationUseCase } from '../../application/use-cases/get-recommendation.js';
import { PgLibraryRepository } from '../../infrastructure/repositories/pg-library.repository.js';
import { PgRecommendationRepository } from '../../infrastructure/repositories/pg-recommendation.repository.js';
import { PgUsageRepository } from '../../infrastructure/repositories/pg-usage.repository.js';
import { PgPdfExportRepository } from '../../infrastructure/repositories/pg-pdf-export.repository.js';
import { ReactPdfRenderer } from '../../infrastructure/services/react-pdf.renderer.js';
import { EntitlementService } from '../../application/services/entitlement.service.js';
import { GeneratePdfReportUseCase } from '../../application/use-cases/generate-pdf-report.js';
import { GeminiRecommendationGenerator } from '../../infrastructure/services/gemini-recommendation.generator.js';
import { NoOpRecommendationGenerator } from '../../infrastructure/services/noop-recommendation.generator.js';

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
  resendApiKey?: string;
  appBaseUrl: string;
  isProduction: boolean;
  superAdminEmails: string[];
  geminiApiKey?: string;
  geminiModel: string;
  githubPat?: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig;
    useCases: {
      sendMagicLink: SendMagicLinkUseCase;
      verifyMagicLink: VerifyMagicLinkUseCase;
      syncSession: SyncSessionUseCase;
      deleteSession: DeleteSessionUseCase;
      listTeamSessions: ListTeamSessionsUseCase;
      getSession: GetSessionUseCase;
      getMyProfile: GetMyProfileUseCase;
      onboardTenant: OnboardTenantUseCase;
      createTeam: CreateTeamUseCase;
      deleteTeam: DeleteTeamUseCase;
      refreshSession: RefreshSessionUseCase;
      listMembers: ListMembersUseCase;
      inviteMember: InviteMemberUseCase;
      removeMember: RemoveMemberUseCase;
      updateMember: UpdateMemberUseCase;
      superAdminListTenants: SuperAdminListTenantsUseCase;
      superAdminDeleteTenant: SuperAdminDeleteTenantUseCase;
      superAdminAddClubAdmin: SuperAdminAddClubAdminUseCase;
      superAdminSetPlan: SuperAdminSetPlanUseCase;
      superAdminListUsers: SuperAdminListUsersUseCase;
      superAdminDeleteUser: SuperAdminDeleteUserUseCase;
      getMyTenants: GetMyTenantsUseCase;
      switchTenant: SwitchTenantUseCase;
      listLibraryEntries: ListLibraryEntriesUseCase;
      createLibraryEntry: CreateLibraryEntryUseCase;
      updateLibraryEntry: UpdateLibraryEntryUseCase;
      deleteLibraryEntry: DeleteLibraryEntryUseCase;
      generateRecommendation: GenerateRecommendationUseCase;
      getRecommendation: GetRecommendationUseCase;
      generatePdfReport: GeneratePdfReportUseCase;
    };
    repos: {
      session: PgSessionRepository;
      user: PgUserRepository;
      membership: PgMembershipRepository;
      team: PgTeamRepository;
      tenant: PgTenantRepository;
    };
    tokenService: JoseTokenService;
    geminiEnabled: boolean;
    services: {
      entitlement: EntitlementService;
      pdfRenderer: ReactPdfRenderer;
    };
  }
}

const diPlugin: FastifyPluginAsync<AppConfig> = async (fastify, config) => {
  const db = createDbClient(config.databaseUrl);
  const tokenService = new JoseTokenService(config.jwtSecret);
  const emailSender = config.resendApiKey
    ? new ResendEmailSender(config.resendApiKey, config.smtp.from)
    : new SmtpEmailSender(config.smtp);
  const authService = new AuthService();
  const aiGenerator = config.geminiApiKey
    ? new GeminiRecommendationGenerator(config.geminiApiKey, config.geminiModel)
    : new NoOpRecommendationGenerator();

  // Repositories
  const userRepository = new PgUserRepository(db);
  const membershipRepository = new PgMembershipRepository(db);
  const sessionRepository = new PgSessionRepository(db);
  const teamRepository = new PgTeamRepository(db);
  const tenantRepository = new PgTenantRepository(db);
  const libraryRepository = new PgLibraryRepository(db);
  const recommendationRepository = new PgRecommendationRepository(db);
  const usageRepository = new PgUsageRepository(db);
  const pdfExportRepository = new PgPdfExportRepository(db);

  // Services
  const entitlementService = new EntitlementService({ tenantRepository, usageRepository });
  const pdfRenderer = new ReactPdfRenderer();

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
    teamRepository,
    entitlementService,
  });

  const deleteSession = new DeleteSessionUseCase({
    sessionRepository,
    membershipRepository,
  });

  const listTeamSessions = new ListTeamSessionsUseCase({
    sessionRepository,
    membershipRepository,
  });

  const getSession = new GetSessionUseCase({
    sessionRepository,
    membershipRepository,
  });

  const getMyProfile = new GetMyProfileUseCase({
    userRepository,
    tenantRepository,
    teamRepository,
    membershipRepository,
    entitlementService,
    superAdminEmails: config.superAdminEmails,
  });

  const onboardTenant = new OnboardTenantUseCase({
    tenantRepository,
    teamRepository,
    membershipRepository,
  });

  const createTeam = new CreateTeamUseCase({
    teamRepository,
    membershipRepository,
    entitlementService,
  });

  const deleteTeam = new DeleteTeamUseCase({
    teamRepository,
    membershipRepository,
    sessionRepository,
  });

  const refreshSession = new RefreshSessionUseCase({
    tokenService,
    userRepository,
    membershipRepository,
  });

  const superAdminListTenants = new SuperAdminListTenantsUseCase({ tenantRepository });
  const superAdminDeleteTenant = new SuperAdminDeleteTenantUseCase({ tenantRepository });
  const superAdminAddClubAdmin = new SuperAdminAddClubAdminUseCase({ userRepository, membershipRepository, tenantRepository });
  const superAdminSetPlan = new SuperAdminSetPlanUseCase({ tenantRepository });
  const superAdminListUsers = new SuperAdminListUsersUseCase({ userRepository, membershipRepository, tenantRepository });
  const superAdminDeleteUser = new SuperAdminDeleteUserUseCase({ userRepository, superAdminEmails: config.superAdminEmails });
  const getMyTenants = new GetMyTenantsUseCase({ membershipRepository, tenantRepository });
  const switchTenant = new SwitchTenantUseCase({ userRepository, membershipRepository, tokenIssuer: tokenService });

  const listMembers = new ListMembersUseCase({ userRepository, membershipRepository });
  const inviteMember = new InviteMemberUseCase({
    userRepository,
    membershipRepository,
    tenantRepository,
    emailSender,
    authService,
    entitlementService,
    appBaseUrl: config.appBaseUrl,
  });
  const removeMember = new RemoveMemberUseCase({ membershipRepository });
  const updateMember = new UpdateMemberUseCase({ userRepository, membershipRepository });

  const listLibraryEntries = new ListLibraryEntriesUseCase({ libraryRepository });
  const createLibraryEntry = new CreateLibraryEntryUseCase({ libraryRepository });
  const updateLibraryEntry = new UpdateLibraryEntryUseCase({ libraryRepository });
  const deleteLibraryEntry = new DeleteLibraryEntryUseCase({ libraryRepository });
  const generateRecommendation = new GenerateRecommendationUseCase({
    recommendationRepository,
    sessionRepository,
    libraryRepository,
    membershipRepository,
    aiGenerator,
    geminiModel: config.geminiModel,
  });
  const getRecommendation = new GetRecommendationUseCase({
    recommendationRepository,
    sessionRepository,
    membershipRepository,
  });
  const generatePdfReport = new GeneratePdfReportUseCase({
    membershipRepository,
    pdfExportRepository,
    pdfRenderer,
    entitlementService,
  });

  fastify.decorate('config', config);
  fastify.decorate('geminiEnabled', !!config.geminiApiKey);
  fastify.decorate('tokenService', tokenService);
  fastify.decorate('services', { entitlement: entitlementService, pdfRenderer });
  fastify.decorate('useCases', {
    sendMagicLink,
    verifyMagicLink,
    syncSession,
    deleteSession,
    listTeamSessions,
    getSession,
    getMyProfile,
    onboardTenant,
    createTeam,
    deleteTeam,
    refreshSession,
    listMembers,
    inviteMember,
    removeMember,
    updateMember,
    superAdminListTenants,
    superAdminDeleteTenant,
    superAdminAddClubAdmin,
    superAdminSetPlan,
    superAdminListUsers,
    superAdminDeleteUser,
    getMyTenants,
    switchTenant,
    listLibraryEntries,
    createLibraryEntry,
    updateLibraryEntry,
    deleteLibraryEntry,
    generateRecommendation,
    getRecommendation,
    generatePdfReport,
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
