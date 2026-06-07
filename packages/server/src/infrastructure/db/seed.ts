import { createDbClient } from './client.js';
import { tenants, teams, users, memberships, teamAssignments, practiceSessions, drills } from './schema.js';
import { eq } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('Missing DATABASE_URL');

const db = createDbClient(DATABASE_URL);

// ─── Tenant + Team ────────────────────────────────────────────────────────────

const [tenant] = await db.insert(tenants).values({
  name: 'EHC Demo Club',
  slug: 'ehc-demo',
  plan: 'pro',
}).onConflictDoNothing().returning()
  ?? await db.select().from(tenants).where(eq(tenants.slug, 'ehc-demo')).limit(1);

const [team] = await db.insert(teams).values({
  tenantId: tenant.id,
  name: 'U18 A',
}).onConflictDoNothing().returning()
  ?? await db.select().from(teams).where(eq(teams.tenantId, tenant.id)).limit(1);

// ─── Users ────────────────────────────────────────────────────────────────────

const [adminUser] = await db.insert(users).values({
  email: 'admin@demo.local',
  name: 'Admin Demo',
}).onConflictDoNothing().returning()
  ?? await db.select().from(users).where(eq(users.email, 'admin@demo.local')).limit(1);

const [coachUser] = await db.insert(users).values({
  email: 'coach@demo.local',
  name: 'Max Mustermann',
}).onConflictDoNothing().returning()
  ?? await db.select().from(users).where(eq(users.email, 'coach@demo.local')).limit(1);

// ─── Memberships ──────────────────────────────────────────────────────────────

const [adminMembership] = await db.insert(memberships).values({
  userId: adminUser.id,
  tenantId: tenant.id,
  role: 'club_admin',
}).onConflictDoNothing().returning()
  ?? await db.select().from(memberships).where(eq(memberships.userId, adminUser.id)).limit(1);

const [coachMembership] = await db.insert(memberships).values({
  userId: coachUser.id,
  tenantId: tenant.id,
  role: 'coach',
}).onConflictDoNothing().returning()
  ?? await db.select().from(memberships).where(eq(memberships.userId, coachUser.id)).limit(1);

// ─── Team Assignments ─────────────────────────────────────────────────────────

await db.insert(teamAssignments).values([
  { membershipId: adminMembership.id, teamId: team.id },
  { membershipId: coachMembership.id, teamId: team.id },
]).onConflictDoNothing();

// ─── Practice Session (nur anlegen wenn noch keine existiert) ─────────────────

const existingSessions = await db.select().from(practiceSessions)
  .where(eq(practiceSessions.tenantId, tenant.id)).limit(1);

if (existingSessions.length === 0) {
  const [session] = await db.insert(practiceSessions).values({
    id: crypto.randomUUID(),
    tenantId: tenant.id,
    teamId: team.id,
    createdBy: coachUser.id,
    date: '2026-03-28',
    coachName: 'Max Mustermann',
    athletesCount: 18,
    coachesCount: 2,
    totalTimeMinutes: 90,
    trackedPlayerName: 'Lukas Meier',
    gapTimeData: { totalTime: 420, timeSegments: [{ start: 0, end: 420 }] },
    status: 'completed',
  }).returning();

  await db.insert(drills).values([
    {
      sessionId: session.id,
      sequenceNumber: 1,
      tags: ['warmup', 'skating'],
      timerData: { totalTime: 600, laps: [] },
      counterData: { count: 0 },
      wasteTimeData: { totalTime: 30, timeSegments: [{ start: 0, end: 30 }] },
      actionButtons: [],
    },
    {
      sessionId: session.id,
      sequenceNumber: 2,
      tags: ['passing', 'puck-handling'],
      timerData: { totalTime: 900, laps: [] },
      counterData: { count: 12 },
      wasteTimeData: { totalTime: 60, timeSegments: [{ start: 0, end: 60 }] },
      actionButtons: [],
    },
    {
      sessionId: session.id,
      sequenceNumber: 3,
      tags: ['shooting', 'power-play'],
      timerData: { totalTime: 1200, laps: [] },
      counterData: { count: 8 },
      wasteTimeData: { totalTime: 90, timeSegments: [{ start: 0, end: 90 }] },
      actionButtons: [],
    },
  ]);

  console.log(`  Session: ${session.id} (${session.status})`);
  console.log(`  Drills:  3`);
} else {
  console.log('  Session: already exists, skipped');
}

console.log('Seed completed:');
console.log(`  Tenant:  ${tenant.name} (${tenant.slug})`);
console.log(`  Team:    ${team.name}`);
console.log(`  Users:   ${adminUser.email}, ${coachUser.email}`);

process.exit(0);
