import { eq, and, desc } from 'drizzle-orm';
import type { DbClient } from '../db/client.js';
import { users, memberships } from '../db/schema.js';
import type { UserRepository, MembershipRepository } from '../../domain/ports/user.repository.js';
import type { User, Membership } from '@pet/shared';

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

  async consumeMagicLinkToken(tokenHash: string): Promise<(User & { tokenExpiresAt: Date }) | null> {
    // Single UPDATE ... RETURNING so a concurrent request re-evaluates the
    // WHERE clause after the row lock is released and matches zero rows.
    // tokenExpiresAt is kept: RETURNING yields post-update values and the
    // expiry check still needs it; without the hash it grants nothing.
    const [row] = await this.db
      .update(users)
      .set({ magicLinkTokenHash: null })
      .where(eq(users.magicLinkTokenHash, tokenHash))
      .returning();

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

  async updateLastLogin(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, userId));
  }

  async findAll(): Promise<Array<User & { lastLoginAt: string | null }>> {
    const rows = await this.db.select().from(users).orderBy(desc(users.createdAt));
    return rows.map((row) => ({
      ...this.toUser(row),
      lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    }));
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id));
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

  async findById(id: string): Promise<Membership | null> {
    const [row] = await this.db
      .select()
      .from(memberships)
      .where(eq(memberships.id, id))
      .limit(1);
    return row ? this.toMembership(row) : null;
  }

  async findByUser(userId: string): Promise<Membership[]> {
    const rows = await this.db
      .select()
      .from(memberships)
      .where(eq(memberships.userId, userId));
    return rows.map(this.toMembership);
  }

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

  async findAll(): Promise<Membership[]> {
    const rows = await this.db.select().from(memberships);
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

  async delete(id: string): Promise<void> {
    await this.db.delete(memberships).where(eq(memberships.id, id));
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
