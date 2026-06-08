import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { router } from './router.js';
import './lib/i18n.js';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
    <Toaster richColors position="top-right" />
  </React.StrictMode>,
);

// Wake up the backend (Render.com free tier spins down after inactivity)
fetch('/api/health').catch(() => {});

const splash = document.getElementById('splash');
if (splash) {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      splash.classList.add('fade');
      setTimeout(() => splash.remove(), 280);
    }),
  );
}
