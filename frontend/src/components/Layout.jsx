import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  MoonStar,
  Search,
  ShieldCheck,
  SunMedium,
  Users,
  ClipboardList,
  Wallet,
  FileClock,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';

const navByRole = {
  Vendor: [
    { label: 'Dashboard', path: '/vendor-dashboard', icon: LayoutDashboard },
    { label: 'Profile', path: '/vendor-profile', icon: Users },
    { label: 'Documents', path: '/vendor-documents', icon: ClipboardList },
  ],
  'Compliance Officer': [
    { label: 'Dashboard', path: '/compliance-dashboard', icon: LayoutDashboard },
    { label: 'Vendor Reviews', path: '/vendor-reviews', icon: ShieldCheck },
  ],
  'Finance Team': [
    { label: 'Dashboard', path: '/finance-dashboard', icon: Wallet },
  ],
  'Super Admin': [
    { label: 'Dashboard', path: '/admin-dashboard', icon: LayoutDashboard },
    { label: 'Vendor Management', path: '/admin-vendors', icon: Users },
    { label: 'Audit Logs', path: '/admin-audit-logs', icon: FileClock },
  ],
};

const pageMap = {
  '/vendor-dashboard': ['Vendor', 'Dashboard'],
  '/vendor-profile': ['Vendor', 'Profile'],
  '/vendor-documents': ['Vendor', 'Documents'],
  '/documents': ['Vendor', 'Documents'],
  '/compliance-dashboard': ['Compliance', 'Dashboard'],
  '/vendor-reviews': ['Compliance', 'Vendor Reviews'],
  '/finance-dashboard': ['Finance', 'Dashboard'],
  '/admin-dashboard': ['Head Admin', 'Dashboard'],
  '/admin-vendors': ['Head Admin', 'Vendor Management'],
  '/admin-audit-logs': ['Head Admin', 'Audit Logs'],
};

function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem('role') || 'Vendor';
  const userName = localStorage.getItem('full_name') || 'User';
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('theme') || 'light';
    document.documentElement.dataset.theme = stored;
    return stored === 'dark';
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const toggleTheme = () => {
    const next = darkMode ? 'light' : 'dark';
    setDarkMode(!darkMode);
    localStorage.setItem('theme', next);
    document.documentElement.dataset.theme = next;
  };

  const navItems = navByRole[role] || [];
  const breadcrumb = pageMap[location.pathname] || ['Portal', 'Dashboard'];

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const roleTone = useMemo(() => {
    if (role === 'Super Admin') return 'finance';
    if (role === 'Finance Team') return 'warning';
    if (role === 'Compliance Officer') return 'review';
    return 'approved';
  }, [role]);

  return (
    <div className="app-shell min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 flex w-[284px] -translate-x-full flex-col border-r border-[var(--border)] bg-[var(--sidebar)] text-[var(--sidebar-text)] shadow-[var(--shadow-lg)] transition-transform duration-300 lg:translate-x-0',
            collapsed && 'lg:w-[84px]',
            mobileOpen && 'translate-x-0',
          )}
        >
          <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
            <Link to={navItems[0]?.path || '/login'} className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-white/10 text-white shadow-lg shadow-black/10">
                <ShieldCheck className="h-5 w-5" />
              </div>
              {!collapsed && (
                <div>
                  <div className="text-sm font-semibold tracking-tight text-white">Vendour</div>
                  <div className="text-xs text-[var(--sidebar-muted)]">Enterprise Onboarding</div>
                </div>
              )}
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="hidden h-9 w-9 rounded-[14px] border border-white/10 bg-white/5 text-white hover:bg-white/10 lg:inline-flex"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          <nav className="flex-1 space-y-2 p-4">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-sm font-medium transition-all duration-200',
                    active ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/10' : 'text-[var(--sidebar-text)] hover:bg-white/5 hover:text-white',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>

          <div className="border-t border-white/10 p-4">
            <div className={cn('rounded-[18px] bg-white/5 p-4', collapsed && 'p-3')}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-white/10 text-white">
                  {userName.slice(0, 1).toUpperCase()}
                </div>
                {!collapsed && (
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">{userName}</div>
                    <Badge variant={roleTone} className="mt-1 border-none bg-white/10 text-[11px] text-white">{role}</Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        <div className={cn('flex min-h-screen flex-1 flex-col transition-all duration-300 lg:pl-[284px]', collapsed && 'lg:pl-[84px]')}>
          <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--surface)_92%,transparent)]/95 backdrop-blur-xl">
            <div className="flex h-20 items-center justify-between gap-4 px-4 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-10 w-10 rounded-[14px] p-0 lg:hidden"
                  onClick={() => setMobileOpen((value) => !value)}
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-4 w-4" />
                </Button>
                <div className="hidden min-w-0 md:block">
                  <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <span>{breadcrumb[0]}</span>
                    <span>/</span>
                    <span className="font-medium text-[var(--text)]">{breadcrumb[1]}</span>
                  </div>
                  <div className="text-xs text-[var(--muted)]">{role} workspace</div>
                </div>
              </div>

              <div className="flex flex-1 items-center justify-end gap-3">
                <div className="relative hidden w-full max-w-xl lg:block">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                  <Input className="h-11 rounded-[14px] border-[var(--border)] bg-[var(--surface)] pl-11 shadow-none" placeholder="Search vendors, reviews, logs" readOnly />
                </div>
                <Button variant="secondary" size="sm" className="h-11 w-11 rounded-[14px] p-0" aria-label="Notifications">
                  <Bell className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="sm" className="h-11 w-11 rounded-[14px] p-0" onClick={toggleTheme} aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}>
                  {darkMode ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
                </Button>
                <div className="hidden items-center gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 shadow-[var(--shadow-sm)] lg:flex">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-[var(--primary-soft)] font-semibold text-[var(--primary)]">
                    {userName.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="leading-tight">
                    <div className="text-sm font-semibold text-[var(--text-strong)]">{userName}</div>
                    <div className="text-xs text-[var(--muted)]">{role}</div>
                  </div>
                </div>
                <Button variant="ghost" className="h-11 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-4 text-[var(--text)] hover:bg-[var(--surface-2)]" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                  <span className="hidden md:inline">Logout</span>
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
            <div className="page-content">{children}</div>
          </main>
        </div>
      </div>

      {mobileOpen && <button type="button" aria-label="Close navigation menu" className="fixed inset-0 z-30 bg-slate-950/45 lg:hidden" onClick={() => setMobileOpen(false)} />}
    </div>
  );
}

export default Layout;
