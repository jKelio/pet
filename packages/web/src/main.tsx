import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { router } from './router.js';
import { WakeupGate } from './shared/components/WakeupGate.js';
import './lib/i18n.js';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WakeupGate>
      <RouterProvider router={router} />
    </WakeupGate>
    <Toaster richColors position="top-right" />
  </React.StrictMode>,
);
