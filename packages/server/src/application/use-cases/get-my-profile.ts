import type {
  UserRepository,
  TenantRepository,
  TeamRepository,
  MembershipRepository,
} from '../../domain/ports/user.repository.js';
import type { User, Membership, Tenant, Team } from '@pet/shared';

export interface GetMyProfileDeps {
  userRepository: UserRepository;
  tenantRepository: TenantRepository;
  teamRepository: TeamRepository;
  membershipRepository: MembershipRepository;
  superAdminEmails: string[];
}

export interface MyProfile {
  user: User;
  membership: Membership | null;
  tenant: Tenant | null;
  teams: Team[];
  isSuperAdmin: boolean;
}

export class GetMyProfileUseCase {
  private readonly superAdminAllowlist: Set<string>;

  constructor(private readonly deps: GetMyProfileDeps) {
    this.superAdminAllowlist = new Set(deps.superAdminEmails.map((e) => e.toLowerCase()));
  }

  async execute(userId: string, tenantId: string | null): Promise<MyProfile> {
    const user = await this.deps.userRepository.findById(userId);
    if (!user) throw new Error('User not found');

    const isSuperAdmin = this.superAdminAllowlist.has(user.email.toLowerCase());

    if (!tenantId) {
      return { user, membership: null, tenant: null, teams: [], isSuperAdmin };
    }

    const [membership, tenant] = await Promise.all([
      this.deps.membershipRepository.findByUserAndTenant(userId, tenantId),
      this.deps.tenantRepository.findById(tenantId),
    ]);

    if (!membership || !tenant) {
      return { user, membership: null, tenant: null, teams: [], isSuperAdmin };
    }

    const allTeams = await this.deps.teamRepository.findByTenant(tenantId);
    // club_admin sees all teams; others see only their assigned teams
    let teams: Team[];
    if (membership.role === 'club_admin') {
      teams = allTeams;
    } else {
      const assignedIds = await this.deps.membershipRepository.getTeamIds(membership.id);
      teams = allTeams.filter((t) => assignedIds.includes(t.id));
    }

    return { user, membership, tenant, teams, isSuperAdmin };
  }
}
