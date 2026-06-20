/** Magic link token expiry in milliseconds (15 minutes) */
export const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;

/** Access token expiry (short-lived; clients silently refresh via the refresh token) */
export const ACCESS_TOKEN_TTL = '1h';

/** Refresh token expiry (30 days) */
export const REFRESH_TOKEN_TTL = '30d';

/** Timer tick interval in milliseconds */
export const TIMER_TICK_MS = 100;

/** Minimum touch target size in pixels */
export const MIN_TOUCH_TARGET_PX = 44;

/**
 * Time Moving puck-split timer ids.
 * Time Moving is the sum of these two; only one runs at a time.
 */
export const TIME_MOVING_WITH_PUCK = 'timemovingwithpuck';
export const TIME_MOVING_WITHOUT_PUCK = 'timemovingwithoutpuck';
export const PUCK_TIMER_IDS = [TIME_MOVING_WITH_PUCK, TIME_MOVING_WITHOUT_PUCK] as const;

/**
 * Counters that release the puck. Tapping one while the player is moving WITH
 * the puck switches Time Moving to "without puck".
 */
export const PUCK_RELEASE_COUNTER_IDS = ['passes', 'shots'] as const;

/** Available action button definitions */
export const DEFAULT_ACTION_BUTTONS = [
  { id: 'explanation', type: 'timer' as const, enabled: true },
  { id: 'demonstration', type: 'timer' as const, enabled: true },
  { id: 'feedbackteam', type: 'timer' as const, enabled: true },
  { id: TIME_MOVING_WITH_PUCK, type: 'timer' as const, enabled: true },
  { id: TIME_MOVING_WITHOUT_PUCK, type: 'timer' as const, enabled: true },
  { id: 'repetition', type: 'counter' as const, enabled: true },
  { id: 'feedbackplayers', type: 'counter' as const, enabled: true },
  { id: 'shots', type: 'counter' as const, enabled: true },
  { id: 'passes', type: 'counter' as const, enabled: true },
] as const;

/** Color mapping for action types in charts */
export const ACTION_COLORS: Record<string, string> = {
  explanation: '#0088FE',
  demonstration: '#00C49F',
  feedbackteam: '#FFBB28',
  changesideone: '#FF8042',
  changesidetwo: '#FF6666',
  timemoving: '#A28BFE',
  timemovingwithpuck: '#A28BFE',
  timemovingwithoutpuck: '#C9BCFE',
  wasteTime: '#808080',
  repetition: '#E91E63',
  feedbackplayers: '#9C27B0',
  shots: '#F44336',
  passes: '#4CAF50',
};

/**
 * Per-drill color palette for charts (pie/bar/timeline). Cycled by drill index;
 * also used as the fallback for action colors not present in ACTION_COLORS.
 */
export const DRILL_COLORS = [
  '#0088FE', '#FF8042', '#00C49F', '#FFBB28', '#A28BFE',
  '#FF6699', '#33CC99', '#FF6666', '#66B3FF', '#FFCC99',
] as const;

/** Subscription plans, low to high tier. Single source for the TenantPlan type and validation. */
export const TENANT_PLANS = ['free', 'pro', 'premium'] as const;

/** Available drill category tags */
export const DRILL_TAGS = [
  'station',
  'drill',
  'technique',
  'tactic',
  'smallareagame',
  'skating',
  'passing',
  'shot',
  'puckhandling',
  'battlechecking',
] as const;
