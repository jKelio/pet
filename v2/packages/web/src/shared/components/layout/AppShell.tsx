import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Timer,
  BarChart2,
  FolderOpen,
  Users,
  BookOpen,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '../ui/button.js';
import { cn } from '../../lib/utils.js';
import { useAuth } from '../../../features/auth/hooks/useAuth.js';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresAuth: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Tracking', href: '/', icon: Timer, requiresAuth: true },
  { label: 'Ergebnisse', href: '/sessions', icon: BarChart2, requiresAuth: true },
  { label: 'Sessions', href: '/sessions/history', icon: FolderOpen, requiresAuth: true },
  { label: 'Glossar', href: '/glossary', icon: BookOpen, requiresAuth: false },
  { label: 'Team', href: '/admin', icon: Users, requiresAuth: true },
];

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.requiresAuth || isAuthenticated,
  );

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <nav
      className={cn(
        'flex flex-col h-full bg-card border-r border-border',
        mobile ? 'w-72' : 'w-64 hidden lg:flex',
      )}
    >
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link to="/" className="flex items-center gap-2" onClick={() => setSidebarOpen(false)}>
          <span className="text-xl font-bold text-primary">PET</span>
          <span className="text-xs text-muted-foreground">v2</span>
        </Link>
        {user && (
          <p className="text-sm text-muted-foreground mt-2 truncate">{user.email}</p>
        )}
      </div>

      {/* Nav Links */}
      <div className="flex-1 p-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
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
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Abmelden
          </Button>
        </div>
      )}
    </nav>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full z-50">
            <Sidebar mobile />
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
