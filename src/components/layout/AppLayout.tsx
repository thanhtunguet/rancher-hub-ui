import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Server, Globe, Layers, Container, Box, GitCompare, History,
  Users, Settings, ChevronLeft, ChevronRight, User, LogOut,
  Shield, Activity, Menu, Database, Lock
} from 'lucide-react';
import { getConfig } from '@/api/client';

const navItems = [
  { label: 'Dashboard', icon: Activity, path: '/' },
  { label: 'Rancher Sites', icon: Server, path: '/sites' },
  { label: 'Generic Clusters', icon: Database, path: '/clusters' },
  { label: 'Harbor Sites', icon: Container, path: '/harbor' },
  { label: 'Environments', icon: Globe, path: '/environments' },
  { label: 'App Instances', icon: Box, path: '/app-instances' },
  { label: 'Services', icon: Layers, path: '/services' },
  { label: 'Compare & Sync', icon: GitCompare, path: '/compare' },
  { label: 'ConfigMaps', icon: Settings, path: '/configmaps' },
  { label: 'Secrets', icon: Lock, path: '/secrets' },
  { label: 'Sync History', icon: History, path: '/sync-history' },
  { label: 'Monitoring', icon: Activity, path: '/monitoring' },
  { label: 'Users', icon: Users, path: '/users' },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const config = getConfig();

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen border-r border-border bg-sidebar flex flex-col z-30 transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-56'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 h-14 border-b border-border shrink-0">
          <Server className="h-5 w-5 text-primary shrink-0" />
          {!collapsed && <span className="font-bold text-sm text-gradient truncate">RancherHub</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              activeClassName="bg-sidebar-accent text-primary font-medium"
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-border p-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full justify-center text-muted-foreground"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className={`flex-1 flex flex-col transition-all duration-200 ${collapsed ? 'ml-16' : 'ml-56'}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-20 h-14 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-mono">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse-glow" />
              <span className="text-muted-foreground">{config.environment}</span>
            </div>
            <span className="text-border">|</span>
            <span className="text-xs font-mono text-muted-foreground truncate max-w-[200px]">{config.baseURL}</span>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 text-sm">
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="h-3 w-3 text-primary" />
                  </div>
                  <span className="hidden sm:inline text-foreground">{user?.username}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
