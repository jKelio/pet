import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Timer,
  BarChart2,
  FolderOpen,
  Cloud,
  Users,
  BookOpen,
  LogOut,
  Menu,
  X,
  Shield,
} from 'lucide-react';
import { Button } from '../ui/button.js';
import { cn } from '../../lib/utils.js';
import { useAuth } from '../../../features/auth/hooks/useAuth.js';
import { useAdminStore } from '../../../features/admin/stores/admin.store.js';
import { TenantSwitcher } from './TenantSwitcher.js';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresAuth: boolean;
  requiresSuperAdmin?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Tracking', href: '/', icon: Timer, requiresAuth: true },
  { label: 'Ergebnisse', href: '/sessions', icon: BarChart2, requiresAuth: true },
  { label: 'Verlauf', href: '/sessions/history', icon: FolderOpen, requiresAuth: true },
  { label: 'Cloud', href: '/sessions/cloud', icon: Cloud, requiresAuth: true },
  { label: 'Glossar', href: '/glossary', icon: BookOpen, requiresAuth: false },
  { label: 'Team', href: '/admin', icon: Users, requiresAuth: true },
  { label: 'SuperAdmin', href: '/superadmin', icon: Shield, requiresAuth: true, requiresSuperAdmin: true },
];

interface SidebarNavProps {
  mobile?: boolean;
  isAuthenticated: boolean;
  user: { email: string } | null;
  visibleItems: NavItem[];
  currentPath: string;
  onLinkClick: () => void;
  onLogout: () => void;
}

function SidebarNav({
  mobile = false,
  isAuthenticated,
  user,
  visibleItems,
  currentPath,
  onLinkClick,
  onLogout,
}: SidebarNavProps) {
  return (
    <nav
      className={cn(
        'flex flex-col h-full bg-card border-r border-border',
        mobile ? 'w-72' : 'w-64 hidden lg:flex',
      )}
    >
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link to="/" className="flex items-center gap-2" onClick={onLinkClick}>
          <span className="text-xl font-bold text-primary">PET</span>
          <span className="text-xs text-muted-foreground">v2</span>
        </Link>
        {user && (
          <p className="text-xs text-muted-foreground mt-2 truncate">{user.email}</p>
        )}
        {isAuthenticated && <TenantSwitcher />}
      </div>

      {/* Nav Links */}
      <div className="flex-1 p-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onLinkClick}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Logout */}
      {isAuthenticated && (
        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4" />
            Abmelden
          </Button>
        </div>
      )}
    </nav>
  );
}

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { isAuthenticated, user, accessToken, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const loadProfile = useAdminStore((s) => s.loadProfile);
  const membership = useAdminStore((s) => s.membership);
  const isSuperAdmin = useAdminStore((s) => s.isSuperAdmin);

  // Load profile once on first authenticated render so teams/tenant are available app-wide
  useEffect(() => {
    if (isAuthenticated && accessToken && !membership) {
      loadProfile(accessToken);
    }
  }, [isAuthenticated, accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  const closeSidebar = () => setSidebarOpen(false);

  const visibleItems = NAV_ITEMS.filter(
    (item) =>
      (!item.requiresAuth || isAuthenticated) &&
      (!item.requiresSuperAdmin || isSuperAdmin),
  );

  const sidebarProps = {
    isAuthenticated,
    user,
    visibleItems,
    currentPath: location.pathname,
    onLinkClick: closeSidebar,
    onLogout: handleLogout,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <SidebarNav {...sidebarProps} />

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeSidebar}
          />
          <div className="absolute left-0 top-0 h-full z-50">
            <SidebarNav {...sidebarProps} mobile />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center gap-3 px-4 h-14 border-b border-border bg-card">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <span className="font-bold text-primary">PET</span>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
