import { isPlatform } from "@ionic/react";

export const domain = "petty.eu.auth0.com";
export const clientId = "ufGkLQUR6G6LhjeWK0D4aNyBaJhKg6i7";
const appId = "io.ionic.starter";

// Use `auth0Domain` in string interpolation below so that it doesn't
// get replaced by the quickstart auto-packager
const auth0Domain = domain;

// Check if running as native Capacitor app (not mobile browser)
// Use isPlatform('capacitor') which is true only in native apps
const isNativeApp = isPlatform('capacitor');
export const iosOrAndroid = isNativeApp && (isPlatform('ios') || isPlatform('android'));

// For web, extract base path from current URL (works for localhost and GitHub Pages)
const getWebCallbackUri = () => {
  if (typeof window === 'undefined') return 'http://localhost:8100';

  // Get origin + pathname up to the base path
  // e.g., https://jkelio.github.io/pet/page/language -> https://jkelio.github.io/pet
  const { origin, pathname } = window.location;

  // For GitHub Pages, extract the repo name (first path segment)
  const pathParts = pathname.split('/').filter(Boolean);
  if (pathParts.length > 0 && origin.includes('github.io')) {
    return `${origin}/${pathParts[0]}`;
  }

  // For localhost or other deployments, just use origin
  return origin;
};

export const callbackUri = iosOrAndroid
  ? `${appId}://${auth0Domain}/capacitor/${appId}/callback`
  : getWebCallbackUri();
