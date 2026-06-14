import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { router } from './router.js';
import { ServerWakeupProvider } from './shared/components/ServerWakeupProvider.js';
import './lib/i18n.js';
import './index.css';

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
