import { isPlatform } from "@ionic/react";

export const domain = "petty.eu.auth0.com";
export const clientId = "ufGkLQUR6G6LhjeWK0D4aNyBaJhKg6i7";
const appId = "io.ionic.starter";

// Use `auth0Domain` in string interpolation below so that it doesn't
// get replaced by the quickstart auto-packager
const auth0Domain = domain;
export const iosOrAndroid = isPlatform('ios') || isPlatform('android');

export const callbackUri = iosOrAndroid
  ? `${appId}://${auth0Domain}/capacitor/${appId}/callback`
  : 'http://localhost:8100';
