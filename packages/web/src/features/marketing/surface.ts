import type { CSSProperties } from 'react';

/*
 * Fixed dark marketing surface shared by the public pages (ADR 0018).
 * Deliberately independent of the app theme: colors are hardcoded to the
 * splash-screen palette (#03101f → #0d1c39) instead of the bg-background /
 * text-foreground tokens, so the pages look identical regardless of the
 * visitor's prefers-color-scheme. The logo CSS variables are pinned to their
 * dark-theme values for the same reason — on a light-preference device the
 * global :root values would render the mark navy-on-navy.
 */
export const SURFACE_STYLE: CSSProperties & Record<string, string> = {
  backgroundColor: '#03101f',
  backgroundImage: 'radial-gradient(1100px 700px at 50% -10%, #0d1c39, #03101f 60%)',
  color: '#cfd8e6',
  fontFamily: "'Saira', sans-serif",
  '--logo-mark-from': 'hsl(0 0% 100%)',
  '--logo-mark-to': 'hsl(216 25% 81%)',
  '--logo-word-from': 'hsl(0 0% 100%)',
  '--logo-word-to': 'hsl(213 25% 86%)',
};

/** Background-only subset used as Suspense fallback so lazy chunks load without a light flash. */
export const SURFACE_FALLBACK_STYLE: CSSProperties = {
  backgroundColor: '#03101f',
  backgroundImage: 'radial-gradient(1100px 700px at 50% -10%, #0d1c39, #03101f 60%)',
};

export const HEADLINE_STYLE: CSSProperties = {
  fontFamily: "'Saira Semi Condensed', sans-serif",
  textTransform: 'uppercase',
};

export const MONO_STYLE: CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
};
