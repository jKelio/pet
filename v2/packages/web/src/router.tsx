import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from './shared/components/layout/AppShell.js';
import { LoginPage } from './features/auth/components/LoginPage.js';
import { VerifyPage } from './features/auth/components/VerifyPage.js';
import { TrackingPage } from './features/tracking/TrackingPage.js';
import { useAuthStore } from './features/auth/stores/auth.store.js';

const ResultsPage = lazy(() =>
  import('./features/results/ResultsPage.js').then((m) => ({ default: m.ResultsPage })),
);
const SessionHistoryPage = lazy(() =>
  import('./features/sessions/SessionHistoryPage.js').then((m) => ({
    default: m.SessionHistoryPage,
  })),
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;
  return <>{children}</>;
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="p-8 text-center text-muted-foreground">
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p>Wird in Phase 4 implementiert.</p>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/auth/login',
    element: <LoginPage />,
  },
  {
    path: '/auth/verify',
    element: <VerifyPage />,
  },
  {
    path: '/',
    element: (
      <AppShell>
        <ProtectedRoute>
          <TrackingPage />
        </ProtectedRoute>
      </AppShell>
    ),
  },
  {
    path: '/sessions',
    element: (
      <AppShell>
        <ProtectedRoute>
          <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Lädt…</div>}>
            <ResultsPage />
          </Suspense>
        </ProtectedRoute>
      </AppShell>
    ),
  },
  {
    path: '/sessions/history',
    element: (
      <AppShell>
        <ProtectedRoute>
          <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Lädt…</div>}>
            <SessionHistoryPage />
          </Suspense>
        </ProtectedRoute>
      </AppShell>
    ),
  },
  {
    path: '/glossary',
    element: (
      <AppShell>
        <PlaceholderPage title="Glossar" />
      </AppShell>
    ),
  },
  {
    path: '/admin',
    element: (
      <AppShell>
        <ProtectedRoute>
          <PlaceholderPage title="Team-Verwaltung" />
        </ProtectedRoute>
      </AppShell>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
