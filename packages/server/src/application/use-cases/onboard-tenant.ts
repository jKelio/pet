import type {
  TenantRepository,
  TeamRepository,
  MembershipRepository,
} from '../../domain/ports/user.repository.js';
import type { Tenant, Team, Membership } from '@pet/shared';

export interface OnboardTenantDeps {
  tenantRepository: TenantRepository;
  teamRepository: TeamRepository;
  membershipRepository: MembershipRepository;
}

export interface OnboardTenantInput {
  tenantName: string;
  teamName: string;
}

export interface OnboardTenantResult {
  tenant: Tenant;
  team: Team;
  membership: Membership;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export class OnboardTenantUseCase {
  constructor(private readonly deps: OnboardTenantDeps) {}

  async execute(input: OnboardTenantInput, userId: string): Promise<OnboardTenantResult> {
    const tenantId = crypto.randomUUID();
    const teamId = crypto.randomUUID();
    const membershipId = crypto.randomUUID();
    const now = new Date().toISOString();

    const slug = `${slugify(input.tenantName)}-${Date.now()}`;

    const tenant: Tenant = {
      id: tenantId,
      name: input.tenantName.trim(),
      slug,
      plan: 'free',
      createdAt: now,
    };

    const team: Team = {
      id: teamId,
      tenantId,
      name: input.teamName.trim(),
      kind: 'own',
      externalClubName: null,
      createdAt: now,
    };

    const membership: Membership = {
      id: membershipId,
      userId,
      tenantId,
      role: 'club_admin',
    };

    await this.deps.tenantRepository.save(tenant);
    await this.deps.teamRepository.save(team);
    await this.deps.membershipRepository.save(membership);
    await this.deps.membershipRepository.assignTeam(membershipId, teamId);

    return { tenant, team, membership };
  }
}
