// ─── Core Tracking Data Models ───────────────────────────────────────────────
// Ported from v1 TrackingContext.ts — framework-agnostic domain types

export interface TimeSegment {
  startTime: number;
  endTime: number | null;
  duration: number;
}

export interface TimerData {
  totalTime: number;
  timeSegments: TimeSegment[];
}

export interface CounterData {
  count: number;
  timestamps: number[];
}

export type ActionButtonType = 'timer' | 'counter';

export interface ActionButton {
  id: string;
  type: ActionButtonType;
  enabled: boolean;
}

export type DrillTag =
  | 'station' | 'drill' | 'technique' | 'tactic'
  | 'smallareagame' | 'skating' | 'passing' | 'shot'
  | 'puckhandling' | 'battlechecking';

export interface Drill {
  id: number;
  tags: DrillTag[];
  actionButtons: ActionButton[];
  timerData: Record<string, TimerData>;
  counterData: Record<string, CounterData>;
  wasteTime: TimerData;
}

export interface PracticeInfo {
  clubName: string;
  teamName: string;
  date: string;
  coachName: string;
  evaluation: number;
  athletesNumber: number;
  coachesNumber: number;
  totalTime: number;
  trackedPlayerName: string;
  drillsNumber: number;
  wasteTime: TimerData;
}

export type TrackingMode = 'practiceInfo' | 'drills' | 'timeWatcher';

export type SessionStatus = 'draft' | 'in_progress' | 'completed';

export interface PracticeSession {
  id: string;
  tenantId: string;
  teamId: string;
  createdBy: string;
  practiceInfo: PracticeInfo;
  drills: Drill[];
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
}

// ─── Auth & Identity ──────────────────────────────────────────────────────────

export type UserRole = 'club_admin' | 'coach' | 'assistant' | 'analyst' | 'viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface Membership {
  id: string;
  userId: string;
  tenantId: string;
  role: UserRole;
}

export interface TeamAssignment {
  membershipId: string;
  teamId: string;
}

// ─── Tenant & Team ────────────────────────────────────────────────────────────

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  createdAt: string;
}

export type TenantPlan = 'free' | 'pro' | 'enterprise';

export interface Team {
  id: string;
  tenantId: string;
  name: string;
  createdAt: string;
}

export interface TenantMembership {
  tenantId: string;
  tenantName: string;
  role: UserRole;
}

// ─── API Contracts ────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
}

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
}
