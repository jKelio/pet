import type { User, Membership, Team, Tenant } from '@pet/shared';

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  /**
   * Atomically clears the magic-link token and returns the matching user.
   * Returns null if no user holds this token — guarantees single use even
   * under concurrent verification attempts.
   */
  consumeMagicLinkToken(tokenHash: string): Promise<(User & { tokenExpiresAt: Date }) | null>;
  save(user: User): Promise<void>;
  saveMagicLinkToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  updateLastLogin(userId: string): Promise<void>;
}

export interface TenantRepository {
  findById(id: string): Promise<Tenant | null>;
  findBySlug(slug: string): Promise<Tenant | null>;
  findAll(): Promise<Tenant[]>;
  save(tenant: Tenant): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface TeamRepository {
  findById(id: string, tenantId: string): Promise<Team | null>;
  findByTenant(tenantId: string): Promise<Team[]>;
  save(team: Team): Promise<void>;
}

export interface MembershipRepository {
  findById(id: string): Promise<Membership | null>;
  findByUser(userId: string): Promise<Membership[]>;
  findByUserAndTenant(userId: string, tenantId: string): Promise<Membership | null>;
  findByTenant(tenantId: string): Promise<Membership[]>;
  save(membership: Membership): Promise<void>;
  delete(id: string): Promise<void>;
  assignTeam(membershipId: string, teamId: string): Promise<void>;
  unassignTeam(membershipId: string, teamId: string): Promise<void>;
  getTeamIds(membershipId: string): Promise<string[]>;
}
