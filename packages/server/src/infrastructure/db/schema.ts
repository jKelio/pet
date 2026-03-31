import {
  pgTable, uuid, text, integer, timestamp, date,
  jsonb, uniqueIndex, index, pgEnum,
} from 'drizzle-orm/pg-core';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const tenantPlanEnum = pgEnum('tenant_plan', ['free', 'pro', 'enterprise']);
export const userRoleEnum = pgEnum('user_role', ['club_admin', 'coach', 'assistant', 'analyst', 'viewer']);
export const sessionStatusEnum = pgEnum('session_status', ['draft', 'in_progress', 'completed']);

// ─── Tenants ──────────────────────────────────────────────────────────────────

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  plan: tenantPlanEnum('plan').notNull().default('free'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Teams ────────────────────────────────────────────────────────────────────

export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('teams_tenant_id_idx').on(t.tenantId),
]);

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull().default(''),
  magicLinkTokenHash: text('magic_link_token_hash'),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Memberships ──────────────────────────────────────────────────────────────

export const memberships = pgTable('memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  role: userRoleEnum('role').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('memberships_user_tenant_unique').on(t.userId, t.tenantId),
  index('memberships_tenant_id_idx').on(t.tenantId),
]);

// ─── Team Assignments ─────────────────────────────────────────────────────────

export const teamAssignments = pgTable('team_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  membershipId: uuid('membership_id').notNull().references(() => memberships.id, { onDelete: 'cascade' }),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
}, (t) => [
  uniqueIndex('team_assignments_unique').on(t.membershipId, t.teamId),
]);

// ─── Practice Sessions ────────────────────────────────────────────────────────

export const practiceSessions = pgTable('practice_sessions', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  date: date('date'),
  coachName: text('coach_name').notNull().default(''),
  evaluation: integer('evaluation').notNull().default(0),
  athletesCount: integer('athletes_count').notNull().default(0),
  coachesCount: integer('coaches_count').notNull().default(0),
  totalTimeMinutes: integer('total_time_minutes').notNull().default(0),
  trackedPlayerName: text('tracked_player_name').notNull().default(''),
  gapTimeData: jsonb('gap_time_data').notNull().default({ totalTime: 0, timeSegments: [] }),
  status: sessionStatusEnum('status').notNull().default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('sessions_tenant_id_idx').on(t.tenantId),
  index('sessions_team_id_idx').on(t.teamId),
  index('sessions_created_by_idx').on(t.createdBy),
]);

// ─── Drills ───────────────────────────────────────────────────────────────────

export const drills = pgTable('drills', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => practiceSessions.id, { onDelete: 'cascade' }),
  sequenceNumber: integer('sequence_number').notNull(),
  tags: text('tags').array().notNull().default([]),
  timerData: jsonb('timer_data').notNull().default({}),
  counterData: jsonb('counter_data').notNull().default({}),
  wasteTimeData: jsonb('waste_time_data').notNull().default({ totalTime: 0, timeSegments: [] }),
  actionButtons: jsonb('action_buttons').notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('drills_session_id_idx').on(t.sessionId),
]);
