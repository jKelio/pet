import { eq, and } from 'drizzle-orm';
import type { DbClient } from '../db/client.js';
import { tenants, teams } from '../db/schema.js';
import type { TenantRepository, TeamRepository } from '../../domain/ports/user.repository.js';
import type { Tenant, Team } from '@pet/shared';

export class PgTeamRepository implements TeamRepository {
  constructor(private readonly db: DbClient) {}

  async findById(id: string, tenantId: string): Promise<Team | null> {
    const [row] = await this.db
      .select()
      .from(teams)
      .where(and(eq(teams.id, id), eq(teams.tenantId, tenantId)))
      .limit(1);
    return row ? this.toTeam(row) : null;
  }

  async findByTenant(tenantId: string): Promise<Team[]> {
    const rows = await this.db.select().from(teams).where(eq(teams.tenantId, tenantId));
    return rows.map((r) => this.toTeam(r));
  }

  async save(team: Team): Promise<void> {
    await this.db
      .insert(teams)
      .values({ id: team.id, tenantId: team.tenantId, name: team.name })
      .onConflictDoUpdate({ target: teams.id, set: { name: team.name } });
  }

  private toTeam(row: typeof teams.$inferSelect): Team {
    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      createdAt: row.createdAt.toISOString(),
    };
  }
}

export class PgTenantRepository implements TenantRepository {
  constructor(private readonly db: DbClient) {}

  async findById(id: string): Promise<Tenant | null> {
    const [row] = await this.db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    return row ? this.toTenant(row) : null;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    const [row] = await this.db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
    return row ? this.toTenant(row) : null;
  }

  async save(tenant: Tenant): Promise<void> {
    await this.db
      .insert(tenants)
      .values({ id: tenant.id, name: tenant.name, slug: tenant.slug, plan: tenant.plan })
      .onConflictDoUpdate({ target: tenants.id, set: { name: tenant.name, slug: tenant.slug } });
  }

  private toTenant(row: typeof tenants.$inferSelect): Tenant {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      plan: row.plan,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
