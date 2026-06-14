import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Microscope,
  CalendarDays,
  History,
  Package,
  Settings,
  Bell,
  User,
  Menu,
  X,
  Beaker,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/', label: '仪器列表', icon: Microscope },
  { path: '/calendar', label: '预约日历', icon: CalendarDays },
  { path: '/records', label: '使用记录', icon: History },
  { path: '/consumables', label: '耗材登记', icon: Package },
  { path: '/admin', label: '管理后台', icon: Settings },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { getCurrentUser } = useAppStore();
  const currentUser = getCurrentUser();

  return (
    <div className="min-h-screen bg-gradient-soft">
      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-neutral-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="h-16 flex items-center px-6 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                  <Beaker className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-neutral-800">实验室预约</h1>
                  <p className="text-xs text-neutral-400">Lab Reservation</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`sidebar-item ${
                      isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* User */}
            <div className="p-4 border-t border-neutral-100">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-800 truncate">
                    {currentUser?.name || '用户'}
                  </p>
                  <p className="text-xs text-neutral-500 truncate">
                    {currentUser?.role === 'admin' ? '管理员' : currentUser?.department}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Top bar */}
          <header className="h-16 bg-white/80 backdrop-blur-sm border-b border-neutral-200 sticky top-0 z-30">
            <div className="flex items-center justify-between h-full px-4 lg:px-8">
              <div className="flex items-center gap-4">
                <button
                  className="p-2 -ml-2 rounded-lg lg:hidden hover:bg-neutral-100 transition-colors"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="w-5 h-5 text-neutral-600" />
                </button>
                {sidebarOpen && (
                  <button
                    className="p-2 -ml-2 rounded-lg lg:hidden hover:bg-neutral-100 transition-colors"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <X className="w-5 h-5 text-neutral-600" />
                  </button>
                )}
                <h2 className="text-lg font-semibold text-neutral-800">
                  {navItems.find((item) => item.path === location.pathname)?.label || ''}
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <button className="relative p-2 rounded-lg hover:bg-neutral-100 transition-colors">
                  <Bell className="w-5 h-5 text-neutral-600" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full" />
                </button>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="p-4 lg:p-8 animate-fade-in">{children}</main>
        </div>
      </div>
    </div>
  );
}
