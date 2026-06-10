import { z } from 'zod';

// ─── Primitive Schemas ────────────────────────────────────────────────────────

export const EmailSchema = z
  .string()
  .email('Invalid email address')
  .toLowerCase()
  .trim();

export const UUIDSchema = z.string().uuid();

// ─── Auth Schemas ─────────────────────────────────────────────────────────────

export const SendMagicLinkSchema = z.object({
  email: EmailSchema,
});

export const VerifyMagicLinkSchema = z.object({
  token: z.string().min(1).max(512),
});

// ─── Tracking Data Schemas ────────────────────────────────────────────────────

export const TimeSegmentSchema = z.object({
  startTime: z.number().int().nonnegative(),
  endTime: z.number().int().nonnegative().nullable(),
  duration: z.number().int().nonnegative(),
});

export const TimerDataSchema = z.object({
  totalTime: z.number().int().nonnegative(),
  timeSegments: z.array(TimeSegmentSchema),
});

export const CounterDataSchema = z.object({
  count: z.number().int().nonnegative(),
  timestamps: z.array(z.number().int().positive()),
});

export const ActionButtonSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['timer', 'counter']),
  enabled: z.boolean(),
});

export const DrillTagSchema = z.enum([
  'station', 'drill', 'technique', 'tactic',
  'smallareagame', 'skating', 'passing', 'shot',
  'puckhandling', 'battlechecking',
]);

export const DrillSchema = z.object({
  id: z.number().int().positive(),
  tags: z.array(DrillTagSchema),
  actionButtons: z.array(ActionButtonSchema),
  timerData: z.record(z.string(), TimerDataSchema),
  counterData: z.record(z.string(), CounterDataSchema),
  wasteTime: TimerDataSchema,
});

export const PracticeInfoSchema = z.object({
  clubName: z.string().trim(),
  teamName: z.string().trim(),
  teamId: UUIDSchema.optional(),
  date: z.string().datetime(),
  coachName: z.string().trim(),
  athletesNumber: z.number().int().nonnegative(),
  coachesNumber: z.number().int().nonnegative(),
  totalTime: z.number().int().nonnegative(),
  trackedPlayerName: z.string().trim(),
  drillsNumber: z.number().int().nonnegative(),
  sessionType: z.enum(['planned', 'open']).optional(),
  wasteTime: TimerDataSchema,
});

// ─── Session Sync Schema ──────────────────────────────────────────────────────

export const SyncSessionSchema = z.object({
  id: UUIDSchema,
  teamId: UUIDSchema,
  practiceInfo: PracticeInfoSchema,
  drills: z.array(DrillSchema),
});

// ─── Admin Schemas ────────────────────────────────────────────────────────────

export const InviteUserSchema = z.object({
  email: EmailSchema,
  name: z.string().trim().max(100).optional(),
  role: z.enum(['club_admin', 'coach', 'analyst']),
  teamIds: z.array(UUIDSchema).optional(),
});

export const CreateTeamSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const UpdateMemberSchema = z.object({
  name: z.string().trim().max(100),
});

// ─── Source Schemas ───────────────────────────────────────────────────────────

export const CreateSourceSchema = z.object({
  url: z.string().url().max(2048),
  title: z.string().trim().min(1).max(200),
});

export const UpdateSourceSchema = z.object({
  url: z.string().url().max(2048).optional(),
  title: z.string().trim().min(1).max(200).optional(),
});

// ─── Recommendation Schemas ───────────────────────────────────────────────────

export const GenerateRecommendationSchema = z.object({
  sourceIds: z.array(UUIDSchema).min(1).max(5),
  language: z.enum(['en', 'de', 'ru']).default('en'),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type SendMagicLinkInput = z.infer<typeof SendMagicLinkSchema>;
export type VerifyMagicLinkInput = z.infer<typeof VerifyMagicLinkSchema>;
export type SyncSessionInput = z.infer<typeof SyncSessionSchema>;
export type InviteUserInput = z.infer<typeof InviteUserSchema>;
export type CreateTeamInput = z.infer<typeof CreateTeamSchema>;
export type UpdateMemberInput = z.infer<typeof UpdateMemberSchema>;
export type CreateSourceInput = z.infer<typeof CreateSourceSchema>;
export type UpdateSourceInput = z.infer<typeof UpdateSourceSchema>;
export type GenerateRecommendationInput = z.infer<typeof GenerateRecommendationSchema>;
