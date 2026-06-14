import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { router } from './router.js';
import { ServerWakeupProvider } from './shared/components/ServerWakeupProvider.js';
import { setupPWA } from './lib/pwa.js';
import './lib/i18n.js';
import './index.css';

setupPWA();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* Probes the backend on mount and shows a friendly overlay during the
        Render.com free-tier cold start, gating API calls until it's ready. */}
    <ServerWakeupProvider>
      <RouterProvider router={router} />
    </ServerWakeupProvider>
    <Toaster richColors position="top-right" />
  </React.StrictMode>,
);

// Remove the static index.html splash once React has painted the app, otherwise
// its full-screen overlay (z-index 9999) keeps covering the UI (e.g. the login
// screen). Two RAFs ensure the first React frame is on screen before we fade it.
const splash = document.getElementById('splash');
if (splash) {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      splash.classList.add('fade');
      setTimeout(() => splash.remove(), 280);
    }),
  );
}
