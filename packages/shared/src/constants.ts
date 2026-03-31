/** Magic link token expiry in milliseconds (15 minutes) */
export const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;

/** Access token expiry (7 days) */
export const ACCESS_TOKEN_TTL = '7d';

/** Refresh token expiry (30 days) */
export const REFRESH_TOKEN_TTL = '30d';

/** Timer tick interval in milliseconds */
export const TIMER_TICK_MS = 100;

/** Minimum touch target size in pixels */
export const MIN_TOUCH_TARGET_PX = 44;

/** Available action button definitions */
export const DEFAULT_ACTION_BUTTONS = [
  { id: 'explanation', type: 'timer' as const, enabled: true },
  { id: 'demonstration', type: 'timer' as const, enabled: true },
  { id: 'feedbackteam', type: 'timer' as const, enabled: true },
  { id: 'timemoving', type: 'timer' as const, enabled: true },
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
  wasteTime: '#808080',
  repetition: '#E91E63',
  feedbackplayers: '#9C27B0',
  shots: '#F44336',
  passes: '#4CAF50',
};

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
