import React from 'react';
import { createRoot } from 'react-dom/client';
import {Auth0Provider} from "@auth0/auth0-react";
import './i18n';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import reportWebVitals from './reportWebVitals';
import { domain as auth0Domain, clientId, callbackUri } from "./auth.config";

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
      <Auth0Provider
          domain={auth0Domain}
          clientId={clientId}
          authorizationParams={{
              redirect_uri: callbackUri
          }}
          // For using Auth0-React with Ionic on Android and iOS,
          // it's important to use refresh tokens without the fallback
          useRefreshTokens={true}
          useRefreshTokensFallback={false}
      >
          <App />
      </Auth0Provider>
  </React.StrictMode>
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorkerRegistration.unregister();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
