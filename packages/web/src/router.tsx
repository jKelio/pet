import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import type { Permission } from '@pet/shared';
import { AppShell } from './shared/components/layout/AppShell.js';
import { LoginPage } from './features/auth/components/LoginPage.js';
import { VerifyPage } from './features/auth/components/VerifyPage.js';
import { TrackingPage } from './features/tracking/TrackingPage.js';
import { useAuthStore } from './features/auth/stores/auth.store.js';
import { useAdminStore } from './features/admin/stores/admin.store.js';
import { useAuth } from './features/auth/hooks/useAuth.js';

const ResultsPage = lazy(() =>
  import('./features/results/ResultsPage.js').then((m) => ({ default: m.ResultsPage })),
);
const AdminPage = lazy(() =>
  import('./features/admin/AdminPage.js').then((m) => ({ default: m.AdminPage })),
);
const HistoryPage = lazy(() =>
  import('./features/sessions/HistoryPage.js').then((m) => ({ default: m.HistoryPage })),
);
const GlossaryPage = lazy(() =>
  import('./features/glossary/GlossaryPage.js').then((m) => ({ default: m.GlossaryPage })),
);
const AppFeedbackPage = lazy(() =>
  import('./features/app-feedback/AppFeedbackPage.js').then((m) => ({ default: m.AppFeedbackPage })),
);
const SuperAdminPage = lazy(() =>
  import('./features/superadmin/SuperAdminPage.js').then((m) => ({ default: m.SuperAdminPage })),
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;
  return <>{children}</>;
}

/**
 * Guards a route behind a role permission. Waits for the profile to load before
 * deciding, then redirects callers without the permission to the History view.
 */
function PermissionRoute({
  permission,
  children,
}: {
  permission: Permission;
  children: React.ReactNode;
}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loaded = useAdminStore((s) => s.loaded);
  const { can } = useAuth();
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;
  if (!loaded) {
    return <div className="p-8 text-center text-muted-foreground">Lädt…</div>;
  }
  if (!can(permission)) return <Navigate to="/history" replace />;
  return <>{children}</>;
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
        <PermissionRoute permission="sessions:track">
          <TrackingPage />
        </PermissionRoute>
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
    path: '/history',
    element: (
      <AppShell>
        <ProtectedRoute>
          <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Lädt…</div>}>
            <HistoryPage />
          </Suspense>
        </ProtectedRoute>
      </AppShell>
    ),
  },
  {
    // Backwards-compat redirect for the former route name
    path: '/sessions/cloud',
    element: <Navigate to="/history" replace />,
  },
  {
    path: '/glossary',
    element: (
      <AppShell>
        <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Lädt…</div>}>
          <GlossaryPage />
        </Suspense>
      </AppShell>
    ),
  },
  {
    path: '/app-feedback',
    element: (
      <AppShell>
        <ProtectedRoute>
          <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Lädt…</div>}>
            <AppFeedbackPage />
          </Suspense>
        </ProtectedRoute>
      </AppShell>
    ),
  },
  {
    path: '/admin',
    element: (
      <AppShell>
        <ProtectedRoute>
          <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Lädt…</div>}>
            <AdminPage />
          </Suspense>
        </ProtectedRoute>
      </AppShell>
    ),
  },
  {
    path: '/superadmin',
    element: (
      <AppShell>
        <ProtectedRoute>
          <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Lädt…</div>}>
            <SuperAdminPage />
          </Suspense>
        </ProtectedRoute>
      </AppShell>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
