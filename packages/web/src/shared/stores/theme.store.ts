import { create } from 'zustand';

export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_PREFERENCES: ThemePreference[] = ['system', 'light', 'dark'];

/** Must match the pre-paint script in index.html. */
const STORAGE_KEY = 'pet-theme';

const THEME_COLOR: Record<'light' | 'dark', string> = {
  light: '#f7fafc',
  dark: '#03101f',
};

/* Single long-lived instance: a fresh MediaQueryList per call could be
   garbage-collected together with its change listener. */
const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');

function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && THEME_PREFERENCES.includes(stored as ThemePreference)) {
      return stored as ThemePreference;
    }
  } catch {
    // localStorage unavailable — fall through to system
  }
  return 'system';
}

function applyPreference(preference: ThemePreference): void {
  const dark = preference === 'dark' || (preference === 'system' && systemDarkQuery.matches);
  document.documentElement.classList.toggle('dark', dark);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? THEME_COLOR.dark : THEME_COLOR.light);
}

interface ThemeState {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: readStoredPreference(),
  setPreference: (preference) => {
    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // Persisting failed — the choice still applies for this session.
    }
    applyPreference(preference);
    set({ preference });
  },
}));

// Re-apply on startup: the pre-paint script in index.html normally did this
// already, but a service-worker-cached index.html may predate that script.
applyPreference(useThemeStore.getState().preference);

// While following the system, react to OS theme changes at runtime.
systemDarkQuery.addEventListener('change', () => {
  if (useThemeStore.getState().preference === 'system') applyPreference('system');
});
