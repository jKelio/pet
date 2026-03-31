import type { User, Membership, Team, Tenant, UserRole } from '@pet/shared';

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByMagicLinkToken(tokenHash: string): Promise<(User & { tokenExpiresAt: Date }) | null>;
  save(user: User): Promise<void>;
  saveMagicLinkToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  clearMagicLinkToken(userId: string): Promise<void>;
  updateLastLogin(userId: string): Promise<void>;
}

export interface TenantRepository {
  findById(id: string): Promise<Tenant | null>;
  findBySlug(slug: string): Promise<Tenant | null>;
  save(tenant: Tenant): Promise<void>;
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
  getTeamIds(membershipId: string): Promise<string[]>;
}
