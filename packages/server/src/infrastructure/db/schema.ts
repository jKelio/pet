import {
  pgTable, uuid, text, integer, smallint, timestamp, date,
  jsonb, uniqueIndex, index, pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const tenantPlanEnum = pgEnum('tenant_plan', ['free', 'pro', 'premium']);
export const userRoleEnum = pgEnum('user_role', ['admin', 'member']);
export const sessionStatusEnum = pgEnum('session_status', ['draft', 'in_progress', 'completed']);
export const teamKindEnum = pgEnum('team_kind', ['own', 'external']);

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
  ageClass: smallint('age_class'),
  kind: teamKindEnum('kind').notNull().default('own'),
  /** Name of the club this team belongs to. Only set for kind='external'. */
  externalClubName: text('external_club_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('teams_tenant_id_idx').on(t.tenantId),
  uniqueIndex('teams_tenant_age_class_name_unique').on(t.tenantId, t.ageClass, t.name).where(sql`${t.ageClass} IS NOT NULL`),
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

// ─── Practice Sessions ────────────────────────────────────────────────────────

export const practiceSessions = pgTable('practice_sessions', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  /** Null when the authoring user account was deleted (superadmin user removal). */
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  date: date('date'),
  coachName: text('coach_name').notNull().default(''),
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

// ─── Knowledge Library ────────────────────────────────────────────────────────
// Global, Pracmetrics-curated knowledge entries, scoped by sport (not by tenant).
// Holds editorial text (`content`), not external URLs. Every AI analysis is grounded
// on the full set of entries for the relevant sport. Managed only by super-admins.

export const libraryEntries = pgTable('library_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  sport: text('sport').notNull().default('ice_hockey'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('library_entries_sport_idx').on(t.sport),
]);

// ─── PDF Export Ledger ────────────────────────────────────────────────────────
// Records which distinct sessions a tenant exported as a PDF Report in a given
// calendar month. Used to dedupe (re-downloads are free) and to enforce the
// monthly PDF Report allowance. The rendered PDF itself is never stored.
// See docs/adr/0008 and docs/adr/0009.

export const pdfExports = pgTable('pdf_exports', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  /** Session the Report was rendered for. Not an FK: free/local sessions never exist server-side. */
  sessionId: uuid('session_id').notNull(),
  /** Calendar month bucket, `YYYY-MM` (UTC), the unit the monthly allowance resets on. */
  period: text('period').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  // One row per distinct session per month → idempotent metering.
  uniqueIndex('pdf_exports_tenant_session_period_unique').on(t.tenantId, t.sessionId, t.period),
  // Count usage for a tenant within a period.
  index('pdf_exports_tenant_period_idx').on(t.tenantId, t.period),
]);

// ─── Session Recommendations ──────────────────────────────────────────────────

export const sessionRecommendations = pgTable('session_recommendations', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => practiceSessions.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  document: jsonb('document').notNull(),
  sourceUrls: text('source_urls').array().notNull().default(sql`ARRAY[]::text[]`),
  model: text('model').notNull(),
  /** Null when the authoring user account was deleted (superadmin user removal). */
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('session_recommendations_session_id_unique').on(t.sessionId),
  index('session_recommendations_tenant_id_idx').on(t.tenantId),
]);
