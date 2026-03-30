import { eq, and } from 'drizzle-orm';
import type { DbClient } from '../db/client.js';
import { users, memberships, teams, teamAssignments } from '../db/schema.js';
import type { UserRepository, MembershipRepository, TeamRepository } from '../../domain/ports/user.repository.js';
import type { User, Membership, Team } from '@pet/shared';

export class PgUserRepository implements UserRepository {
  constructor(private readonly db: DbClient) {}

  async findById(id: string): Promise<User | null> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ? this.toUser(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const [row] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return row ? this.toUser(row) : null;
  }

  async findByMagicLinkToken(tokenHash: string): Promise<(User & { tokenExpiresAt: Date }) | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.magicLinkTokenHash, tokenHash))
      .limit(1);

    if (!row || !row.tokenExpiresAt) return null;
    return { ...this.toUser(row), tokenExpiresAt: row.tokenExpiresAt };
  }

  async save(user: User): Promise<void> {
    await this.db
      .insert(users)
      .values({ id: user.id, email: user.email, name: user.name })
      .onConflictDoUpdate({
        target: users.id,
        set: { name: user.name },
      });
  }

  async saveMagicLinkToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.db
      .update(users)
      .set({ magicLinkTokenHash: tokenHash, tokenExpiresAt: expiresAt })
      .where(eq(users.id, userId));
  }

  async clearMagicLinkToken(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ magicLinkTokenHash: null, tokenExpiresAt: null })
      .where(eq(users.id, userId));
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, userId));
  }

  private toUser(row: typeof users.$inferSelect): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: row.createdAt.toISOString(),
    };
  }
}

export class PgMembershipRepository implements MembershipRepository {
  constructor(private readonly db: DbClient) {}

  async findByUserAndTenant(userId: string, tenantId: string): Promise<Membership | null> {
    const [row] = await this.db
      .select()
      .from(memberships)
      .where(and(eq(memberships.userId, userId), eq(memberships.tenantId, tenantId)))
      .limit(1);
    return row ? this.toMembership(row) : null;
  }

  async findByTenant(tenantId: string): Promise<Membership[]> {
    const rows = await this.db
      .select()
      .from(memberships)
      .where(eq(memberships.tenantId, tenantId));
    return rows.map(this.toMembership);
  }

  async save(membership: Membership): Promise<void> {
    await this.db
      .insert(memberships)
      .values({
        id: membership.id,
        userId: membership.userId,
        tenantId: membership.tenantId,
        role: membership.role,
      })
      .onConflictDoUpdate({
        target: [memberships.userId, memberships.tenantId],
        set: { role: membership.role },
      });
  }

  async assignTeam(membershipId: string, teamId: string): Promise<void> {
    await this.db
      .insert(teamAssignments)
      .values({ membershipId, teamId })
      .onConflictDoNothing();
  }

  async getTeamIds(membershipId: string): Promise<string[]> {
    const rows = await this.db
      .select({ teamId: teamAssignments.teamId })
      .from(teamAssignments)
      .where(eq(teamAssignments.membershipId, membershipId));
    return rows.map((r) => r.teamId);
  }

  private toMembership(row: typeof memberships.$inferSelect): Membership {
    return {
      id: row.id,
      userId: row.userId,
      tenantId: row.tenantId,
      role: row.role,
    };
  }
}
