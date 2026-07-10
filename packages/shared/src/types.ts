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

export type SessionType = 'planned' | 'open';

export interface PracticeInfo {
  clubName: string;
  teamName: string;
  /** Id of the registered Team this session belongs to, when teamName resolves to one. Used to route the sync. */
  teamId?: string;
  /** Age class of the registered Team (U7–U21). Stored at selection time so the results page doesn't depend on a live store lookup. */
  teamAgeClass?: number | null;
  date: string;
  coachName: string;
  athletesNumber: number;
  coachesNumber: number;
  /** Planned/actual total practice duration, in minutes (not ms — unlike TimerData.totalTime). */
  totalTime: number;
  trackedPlayerName: string;
  drillsNumber: number;
  sessionType?: SessionType;
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

export type UserRole = 'admin' | 'member';

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

// ─── Tenant & Team ────────────────────────────────────────────────────────────

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  createdAt: string;
}

export type TenantPlan = (typeof import('./constants.js').TENANT_PLANS)[number];

export type TeamKind = 'own' | 'external';

export interface Team {
  id: string;
  tenantId: string;
  name: string;
  /** Integer 7–21, rendered as "U{n}". Null for teams created before this field was introduced. */
  ageClass: number | null;
  kind: TeamKind;
  /** Name of the club this team belongs to. Only set when kind='external'. */
  externalClubName: string | null;
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

// ─── Knowledge Library ──────────────────────────────────────────────────────────
// Pracmetrics-curated, sport-scoped knowledge base. Every AI analysis is grounded
// on the full set of entries for the tenant's sport (currently fixed to ice hockey).
// Unlike the former per-tenant "sources", entries hold curated editorial TEXT — not
// external URLs — so they are stable, uniform across tenants, and centrally managed.

export type Sport = (typeof import('./constants.js').SPORTS)[number];

export interface LibraryEntry {
  id: string;
  title: string;
  /** Curated editorial knowledge text fed into the AI analysis as grounding context. */
  content: string;
  sport: Sport;
  createdAt: string;
  updatedAt: string;
}

// ─── Recommendations ──────────────────────────────────────────────────────────

export interface TeiScores {
  activity: number;      // 0–40
  coaching: number;      // 0–20
  repetitions: number;   // 0–20
  organisation: number;  // 0–20
  total: number;         // 0–100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface RecommendationDocument {
  summary: string;
  /** May be absent in records generated before this field was introduced. */
  strengths?: string[];
  /** May be absent in records generated before this field was introduced. */
  concerns?: string[];
  /** May be absent in records generated before this field was introduced. */
  recommendations?: string[];
  /** May be absent in records generated before this field was introduced. */
  tei?: TeiScores;
  /** Legacy field: no longer produced. Retained as optional for historical records. */
  sourceReferences?: string[];
}

export interface Recommendation {
  id: string;
  sessionId: string;
  tenantId: string;
  document: RecommendationDocument;
  sourceUrls: string[];
  model: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type RecommendationProgressStatus = 'fetching' | 'generating' | 'ready' | 'error';

export interface RecommendationProgressEvent {
  status: RecommendationProgressStatus;
  recommendation?: Recommendation;
  error?: string;
}
